#!/usr/bin/env bash
set -euo pipefail

commit=${1:?请提供要发布的 Git 提交 SHA}
[[ "$commit" =~ ^[a-f0-9]{40}$ ]]
base=/opt/gamebaby
release="$base/releases/$commit"
api_env="$base/api.env"
export PATH="$base/tools/node-v22.19.0-linux-x64/bin:$PATH"

install -d -m 0755 "$base/releases"
if [[ ! -s "$api_env" ]]; then
  printf '%s\n' '缺少应用服务器的 TiDB、Redis 和实名加密配置。' >&2
  exit 1
fi
previous=$(readlink "$base/current" || true)
if [[ -z "$previous" ]] && ss -ltnH | awk '{ print $4 }' | grep -E ':(81|82)$'; then
  printf '%s\n' '81 或 82 端口已经有服务，停止发布。' >&2
  exit 1
fi

if [[ ! -f "$release/dist/release.txt" ]]; then
  stage=$(mktemp -d "$base/.build-XXXXXX")
  chmod 0755 "$stage"
  git -c http.version=HTTP/1.1 clone --quiet --single-branch --branch main https://github.com/bbbb6655/gameBaby.git "$stage"
  git -C "$stage" checkout --quiet --detach "$commit"
  (
    cd "$stage"
    npm ci --no-audit --no-fund --registry=https://registry.npmjs.org
    npm run build
    printf '%s\n' "$commit" > dist/release.txt
  )
  mv -T "$stage" "$release"
fi

swap_current() {
  local target=$1
  local link="$base/.current-$$"
  ln -s "$target" "$link"
  mv -Tf "$link" "$base/current"
}

old_units=()
for unit in gamebaby-api.service gamebaby@81.service gamebaby@82.service; do
  if systemctl is-active --quiet "$unit"; then old_units+=("$unit"); fi
done
runtime_user=gamebaby-api-run
getent -s files passwd "$runtime_user" >/dev/null || useradd --system --user-group --no-create-home --shell /usr/sbin/nologin "$runtime_user"
install -d -m 0755 "$base/uploads"
install -d -m 0755 -o "$runtime_user" -g "$runtime_user" "$base/uploads/avatars" "$base/uploads/materials"
install -m 0644 "$release/deploy/gamebaby-api.service" /etc/systemd/system/gamebaby-api.service
systemctl daemon-reload
if ((${#old_units[@]})); then systemctl stop "${old_units[@]}"; fi
swap_current "$release"

healthy() {
  local port entry title code
  for port in 81 82; do
    if [[ "$port" == 81 ]]; then title='学生端'; else title='教学工作台'; fi
    entry=$(curl --noproxy '*' -fsS --max-time 3 "http://127.0.0.1:$port/") || return 1
    code=$(curl --noproxy '*' -fsS --max-time 3 "http://127.0.0.1:$port/release.txt") || return 1
    [[ "$entry" == *"$title"* && "$code" == "$commit" ]] || return 1
  done
  curl --noproxy '*' -fsS --max-time 4 'http://127.0.0.1:81/api/health' >/dev/null
}

if systemctl start gamebaby-api.service; then
  for attempt in {1..12}; do
    if healthy; then
      systemctl enable gamebaby-api.service
      for unit in "${old_units[@]}"; do
        if [[ "$unit" == gamebaby@*.service ]]; then systemctl disable "$unit"; fi
      done
      printf '已部署 %s，81 和 82 端口健康检查通过。\n' "$commit"
      exit 0
    fi
    sleep 1
  done
fi

systemctl stop gamebaby-api.service
if [[ -n "$previous" ]]; then
  swap_current "$previous"
  if ((${#old_units[@]})); then systemctl start "${old_units[@]}"; fi
else
  rm -f "$base/current"
fi
printf '%s\n' '原型健康检查失败，已恢复部署前状态。' >&2
exit 1
