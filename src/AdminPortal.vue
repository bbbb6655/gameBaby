<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import Icon from './Icon.vue'
import AdminSearch from './AdminSearch.vue'
import { api } from './api.js'

const { actor } = defineProps({ actor: { type: Object, required: true } })
const emit = defineEmits(['account-switched'])
const system = computed(() => actor.role === 'system_admin')
const schoolAdmin = computed(() => actor.role === 'school_admin')
const managesSchool = computed(() => system.value || schoolAdmin.value)
const roleTitle = computed(() => (system.value ? '系统管理员' : schoolAdmin.value ? '学校管理员' : '教师'))
const allTabs = [
  ['setup', '学校与班级', 'School'],
  ['school', '入校审核', 'ShieldCheck'],
  ['class', '入班审核', 'ClipboardList'],
  ['roster', '学生名册', 'Users'],
  ['accounts', '账号管理', 'Settings2'],
  ['admins', '管理员设置', 'User'],
  ['files', '教材与资源', 'BookOpen'],
]
const tabs = computed(() =>
  allTabs
    .filter(([id]) =>
      id === 'school' ? schoolAdmin.value : ['setup', 'admins'].includes(id) ? managesSchool.value : true,
    )
    .map(([id, name, icon]) => [id, id === 'admins' && schoolAdmin.value ? '教师设置' : name, icon]),
)
const page = ref(managesSchool.value ? 'setup' : 'class')
const structure = ref({ schools: [], majors: [], classes: [] })
const schoolId = ref(actor.schoolId || '')
const classId = ref('')
const majors = computed(() => structure.value.majors.filter((item) => item.schoolId === schoolId.value))
const classes = computed(() => structure.value.classes.filter((item) => item.schoolId === schoolId.value))
const currentSchool = computed(() => structure.value.schools.find((item) => item.id === schoolId.value))
const applicants = ref([])
const roster = ref({ users: [], canSeeRealName: false })
const accounts = ref([])
const searchText = ref('')
const searchQuery = ref('')
const searchPlaceholders = {
  setup: '学校、专业、届别或班级',
  school: '手机号或昵称',
  class: '手机号或昵称',
  roster: '手机号或昵称',
  accounts: '手机号或昵称',
  files: '资源名称',
}
const nextAccount = ref(null)
const accountRoles = {
  system_admin: '系统管理员',
  school_admin: '学校管理员',
  class_admin: '教师',
  student: '学生',
}
const assignableRoles = computed(() =>
  system.value ? Object.keys(accountRoles) : ['class_admin', 'student'],
)
const newOnly = ref(false)
const files = ref([])
const upload = ref(null)
const busy = ref(false)
const error = ref('')
const message = ref('')
const modal = ref('')
const form = ref({})
const batchText = ref('')
const provisioned = ref([])
const title = computed(() => tabs.value.find(([id]) => id === page.value)?.[1])
const classLabel = (item) => `${item.major} · ${item.cohort} · ${item.name}`
const matchesSearch = (value) => value.toLocaleLowerCase().includes(searchQuery.value.toLocaleLowerCase())
const visibleSchools = computed(() => structure.value.schools.filter((item) => matchesSearch(item.name)))
const visibleMajors = computed(() => majors.value.filter((item) => matchesSearch(item.name)))
const visibleClasses = computed(() => classes.value.filter((item) => matchesSearch(classLabel(item))))
const visibleFiles = computed(() => files.value.filter((item) => matchesSearch(item.name)))
const roleClasses = computed(() =>
  structure.value.classes.filter((item) => item.schoolId === form.value.schoolId),
)

async function refreshStructure() {
  structure.value = await api('/admin/structure')
  if (!structure.value.schools.some((item) => item.id === schoolId.value))
    schoolId.value = structure.value.schools[0]?.id || ''
  if (!classes.value.some((item) => item.id === classId.value)) classId.value = classes.value[0]?.id || ''
}
async function refreshPage() {
  const keyword = searchQuery.value
  if (page.value === 'school') {
    const result = await api(`/admin/school-applications?${new URLSearchParams({ q: keyword })}`)
    if (page.value === 'school' && keyword === searchQuery.value) applicants.value = result
  } else if (page.value === 'roster' || page.value === 'class') {
    const selected = { page: page.value, id: classId.value, newOnly: newOnly.value }
    if (roster.value.classInfo?.id !== selected.id) roster.value = { users: [], canSeeRealName: false }
    if (!selected.id) return
    const params = new URLSearchParams({
      q: keyword,
      status: selected.page === 'class' ? 'pending' : 'approved',
    })
    if (selected.newOnly && selected.page === 'roster') params.set('newOnly', '1')
    const result = await api(`/admin/classes/${selected.id}/roster?${params}`)
    if (
      page.value === selected.page &&
      classId.value === selected.id &&
      newOnly.value === selected.newOnly &&
      keyword === searchQuery.value
    )
      roster.value = result
  } else if (page.value === 'accounts') await loadAccounts()
  else if (page.value === 'files') files.value = await api('/materials')
}
async function run(work) {
  busy.value = true
  error.value = ''
  message.value = ''
  try {
    await work()
  } catch (err) {
    error.value = err.message
  } finally {
    busy.value = false
  }
}
onMounted(() =>
  run(async () => {
    await refreshStructure()
    await refreshPage()
  }),
)
watch(schoolId, () => {
  classId.value = classes.value[0]?.id || ''
})
watch(page, () => {
  searchText.value = ''
  searchQuery.value = ''
})
watch([page, classId, newOnly], () => {
  roster.value = { users: [], canSeeRealName: false }
  run(refreshPage)
})

function show(kind) {
  error.value = ''
  message.value = ''
  provisioned.value = []
  modal.value = kind
  form.value = {
    role: system.value ? 'school_admin' : 'class_admin',
    schoolId: schoolId.value,
    classId: classId.value,
    majorId: '',
    name: '',
    cohort: '',
  }
}
function review(user, decision) {
  return run(async () => {
    const uri =
      page.value === 'school'
        ? `/admin/school-applications/${user.id}/review`
        : `/admin/classes/${classId.value}/applications/${user.id}/review`
    await api(uri, { method: 'POST', body: { decision } })
    await refreshPage()
    message.value = decision === 'approved' ? '审核通过' : '已驳回申请'
  })
}
function saveStructure() {
  return run(async () => {
    const uri = { school: 'schools', major: 'majors', class: 'classes' }[modal.value]
    await api(`/admin/${uri}`, { method: 'POST', body: form.value })
    modal.value = ''
    await refreshStructure()
    message.value = '已创建'
  })
}
function saveAdmin() {
  return run(async () => {
    const item = await api('/admin/administrators', { method: 'POST', body: form.value })
    provisioned.value = [item]
    modal.value = 'result'
    message.value = system.value ? '管理员已设置' : '教师已设置'
  })
}
async function loadAccounts(after = null) {
  const keyword = searchQuery.value
  const params = new URLSearchParams({ q: keyword })
  if (after) params.set('after', after)
  const result = await api(`/admin/accounts?${params}`)
  if (page.value !== 'accounts' || keyword !== searchQuery.value) return
  accounts.value = after ? [...accounts.value, ...result.accounts] : result.accounts
  nextAccount.value = result.next
}
function searchPage() {
  searchQuery.value = searchText.value.trim()
  return run(refreshPage)
}
function openAccount(kind, account) {
  show(kind)
  form.value = {
    id: account.id,
    nickname: account.nickname,
    phone: account.phone,
    role: account.role,
    schoolId: account.schoolId || (system.value ? '' : actor.schoolId),
    classIds: [...(account.classIds || [])],
  }
}
function saveAccountRole() {
  return run(async () => {
    const { id, role, schoolId, classIds } = form.value
    await api(`/admin/accounts/${id}/role`, { method: 'PATCH', body: { role, schoolId, classIds } })
    modal.value = ''
    await loadAccounts()
    message.value = '账号权限已修改'
  })
}
function signInAs(account) {
  return run(async () => {
    const target = await api(`/admin/accounts/${account.id}/impersonate`, { method: 'POST' })
    emit('account-switched', target)
  })
}
function saveAccountPhone() {
  return run(async () => {
    const { id, phone } = form.value
    const item = await api(`/admin/accounts/${id}/phone`, { method: 'PATCH', body: { phone } })
    accounts.value = accounts.value.map((account) =>
      account.id === id ? { ...account, phone: item.phone } : account,
    )
    modal.value = ''
    message.value = '手机号已修改'
  })
}
function resetAccountPassword() {
  return run(async () => {
    const account = { ...form.value }
    const result = await api(`/admin/accounts/${account.id}/reset-password`, { method: 'POST' })
    provisioned.value = [{ ...account, ...result, passwordLabel: '临时密码' }]
    modal.value = 'result'
  })
}
function parseStudents(value) {
  return value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .flatMap((line, index) => {
      const [phone, realName, nickname, ...extra] = line.split(/[,，\t]/).map((part) => part.trim())
      if (index === 0 && phone === '手机号') return []
      if (!phone || !realName || !nickname || extra.length)
        throw new Error(`第 ${index + 1} 行应包含手机号、实名和昵称`)
      return [{ phone, realName, nickname }]
    })
}
function addStudents() {
  return run(async () => {
    provisioned.value = await api(`/admin/classes/${classId.value}/students`, {
      method: 'POST',
      body: { students: parseStudents(batchText.value) },
    })
    batchText.value = ''
    modal.value = 'result'
    await refreshPage()
    message.value = '录入结果已生成'
  })
}
const csvValue = (value) => {
  const text = String(value ?? '')
  return `"${(/^[=+\-@\t\r\n]/.test(text) ? "'" + text : text).replaceAll('"', '""')}"`
}
function exportRoster() {
  const items = [
    [
      '手机号',
      '昵称',
      ...(roster.value.canSeeRealName ? ['实名'] : []),
      '学校',
      '专业',
      '届别',
      '班级',
      '来源',
    ],
  ]
  const info = roster.value.classInfo
  for (const item of roster.value.users)
    items.push([
      item.phone,
      item.nickname,
      ...(roster.value.canSeeRealName ? [item.realName] : []),
      info.school,
      info.major,
      info.cohort,
      info.name,
      item.origin === 'precreated' ? '后台录入' : '用户申请',
    ])
  const blob = new Blob(['\ufeff', items.map((line) => line.map(csvValue).join(',')).join('\r\n')], {
    type: 'text/csv;charset=utf-8',
  })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `${info.name}-${newOnly.value ? '新录入学生' : '学生名册'}.csv`
  link.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
function uploadMaterial() {
  return run(async () => {
    const body = new FormData()
    body.append('file', upload.value)
    if (form.value.classId) body.append('classId', form.value.classId)
    await api('/materials', { method: 'POST', body })
    upload.value = null
    modal.value = ''
    await refreshPage()
    message.value = '资源已上传'
  })
}
</script>

<template>
  <div class="admin-portal">
    <aside class="admin-side">
      <div class="brand">
        <span class="brand-mark"><Icon name="Sprout" :size="22" /></span
        ><span
          ><strong>养崽日记</strong><small>{{ roleTitle }}</small></span
        >
      </div>
      <nav aria-label="教学管理">
        <button
          v-for="[id, name, icon] in tabs"
          :key="id"
          :class="{ active: id === page }"
          @click="page = id"
        >
          <Icon :name="icon" :size="19" /> {{ name }}
        </button>
      </nav>
    </aside>
    <main class="admin-main stack">
      <header class="admin-heading">
        <div>
          <p class="small muted">{{ currentSchool?.name || '站点管理' }}</p>
          <h1>{{ title }}</h1>
        </div>
        <label v-if="system && page !== 'accounts'" class="field"
          >学校<select v-model="schoolId" aria-label="查看学校">
            <option v-for="item in structure.schools" :key="item.id" :value="item.id">
              {{ item.name }}
            </option>
          </select></label
        >
      </header>
      <p v-if="error && !modal" class="note warn" role="alert">{{ error }}</p>
      <p v-if="message && !modal" class="note" role="status">{{ message }}</p>
      <AdminSearch
        v-if="searchPlaceholders[page]"
        v-model="searchText"
        :placeholder="searchPlaceholders[page]"
        :disabled="busy"
        @search="searchPage"
      />

      <template v-if="page === 'setup'">
        <section class="paper panel stack">
          <div class="section-title">
            <h2>学校</h2>
            <button v-if="system" class="primary" @click="show('school')">
              <Icon name="Plus" :size="16" /> 新建学校
            </button>
          </div>
          <div class="row wrap">
            <span v-for="item in visibleSchools" :key="item.id" class="tag">{{ item.name }}</span>
            <p v-if="!visibleSchools.length" class="empty">
              {{ searchQuery ? '暂无符合条件的学校。' : '请先创建学校。' }}
            </p>
          </div>
        </section>
        <section v-if="currentSchool" class="paper panel stack">
          <div class="section-title">
            <h2>专业与班级</h2>
            <div class="row wrap">
              <button class="secondary" @click="show('major')">新增专业</button
              ><button class="primary" :disabled="!majors.length" @click="show('class')">新建班级</button>
            </div>
          </div>
          <div class="row wrap">
            <span v-for="item in visibleMajors" :key="item.id" class="tag">{{ item.name }}</span>
            <p v-if="!majors.length" class="muted">尚未设置专业。</p>
          </div>
          <div v-for="item in visibleClasses" :key="item.id" class="manageable">
            <span>{{ classLabel(item) }}</span
            ><span class="tag">{{ currentSchool.name }}</span>
          </div>
        </section>
      </template>

      <section v-else-if="page === 'school'" class="paper panel stack">
        <div class="section-title">
          <h2>待入校申请</h2>
          <button class="secondary" @click="run(refreshPage)">刷新</button>
        </div>
        <div class="table-scroll">
          <table>
            <thead>
              <tr>
                <th>手机号</th>
                <th>昵称</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="user in applicants" :key="user.id">
                <td>{{ user.phone }}</td>
                <td>{{ user.nickname }}</td>
                <td>
                  <div class="row">
                    <button class="primary" :disabled="busy" @click="review(user, 'approved')">通过</button
                    ><button class="ghost danger" :disabled="busy" @click="review(user, 'rejected')">
                      驳回
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <div v-if="!applicants.length" class="empty">暂无待审核申请。</div>
      </section>

      <section v-else-if="page === 'class' || page === 'roster'" class="paper panel stack">
        <div class="section-title">
          <h2>{{ page === 'class' ? '待入班申请' : '班级学生' }}</h2>
          <button class="secondary" @click="run(refreshPage)">刷新</button>
        </div>
        <label class="field"
          >班级<select v-model="classId" aria-label="管理班级">
            <option v-for="item in classes" :key="item.id" :value="item.id">{{ classLabel(item) }}</option>
          </select></label
        >
        <div v-if="page === 'roster' && classId" class="row wrap">
          <button class="primary" @click="show('students')">
            <Icon name="Plus" :size="16" /> 批量录入学生</button
          ><button class="secondary" :disabled="!roster.users.length" @click="exportRoster">
            <Icon name="Download" :size="16" /> 导出名单</button
          ><label class="row small"><input v-model="newOnly" type="checkbox" /> 仅新录入学生</label>
        </div>
        <div class="table-scroll">
          <table>
            <thead>
              <tr>
                <th>手机号</th>
                <th>昵称</th>
                <th v-if="roster.canSeeRealName">实名</th>
                <th>{{ page === 'class' ? '操作' : '来源' }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="user in roster.users" :key="user.id">
                <td>{{ user.phone }}</td>
                <td>{{ user.nickname }}</td>
                <td v-if="roster.canSeeRealName">{{ user.realName }}</td>
                <td v-if="page === 'class'">
                  <div class="row">
                    <button class="primary" :disabled="busy" @click="review(user, 'approved')">通过</button
                    ><button class="ghost danger" :disabled="busy" @click="review(user, 'rejected')">
                      驳回
                    </button>
                  </div>
                </td>
                <td v-else>{{ user.origin === 'precreated' ? '后台录入' : '审核加入' }}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div v-if="!roster.users.length" class="empty">
          {{ page === 'class' ? '暂无待审核的入班申请。' : '暂无学生。' }}
        </div>
      </section>

      <section v-else-if="page === 'accounts'" class="paper panel stack">
        <div class="table-scroll">
          <table>
            <thead>
              <tr>
                <th>昵称</th>
                <th>手机号</th>
                <th>角色</th>
                <th>学校</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="account in accounts" :key="account.id">
                <td>{{ account.nickname }}</td>
                <td>{{ account.phone }}</td>
                <td>{{ accountRoles[account.role] }}</td>
                <td>{{ account.schoolName || '待选择' }}</td>
                <td>
                  <div class="row">
                    <button
                      class="secondary"
                      :disabled="busy"
                      @click="openAccount('account-phone', account)"
                    >
                      修改手机号
                    </button>
                    <button
                      class="ghost"
                      :disabled="busy"
                      @click="openAccount('account-password', account)"
                    >
                      重置密码
                    </button>
                    <button
                      v-if="managesSchool"
                      class="ghost"
                      :disabled="busy"
                      @click="openAccount('account-role', account)"
                    >
                      修改权限
                    </button>
                    <button
                      v-if="!actor.impersonating"
                      class="secondary"
                      :disabled="busy"
                      @click="signInAs(account)"
                    >
                      登录此账户
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <p v-if="!busy && !accounts.length" class="empty">暂无符合条件的账号。</p>
        <button
          v-if="nextAccount"
          class="secondary"
          :disabled="busy"
          @click="run(() => loadAccounts(nextAccount))"
        >
          加载更多
        </button>
      </section>

      <section v-else-if="page === 'admins'" class="paper panel stack">
        <div class="section-title">
          <h2>{{ system ? '系统与学校管理员' : '教师' }}</h2>
          <button class="primary" @click="show('admin')">
            <Icon name="Plus" :size="16" /> {{ system ? '设置管理员' : '设置教师' }}
          </button>
        </div>
        <p class="muted">
          {{
            system ? '按手机号设置已有账号的角色，也可预录新账号。' : '按手机号设置教师，并分配负责的班级。'
          }}
        </p>
      </section>

      <section v-else class="paper panel stack">
        <div class="section-title">
          <h2>已发布资源</h2>
          <button class="primary" @click="show('file')"><Icon name="Plus" :size="16" /> 上传文件</button>
        </div>
        <div v-for="item in visibleFiles" :key="item.id" class="manageable">
          <span>{{ item.name }}</span
          ><a class="secondary" :href="`/api/files/${item.id}`"><Icon name="Download" :size="16" /> 下载</a>
        </div>
        <p v-if="!visibleFiles.length" class="empty">
          {{ searchQuery ? '暂无符合条件的资源。' : '暂无教材或资源。' }}
        </p>
      </section>
    </main>
  </div>

  <Teleport to="body"
    ><div v-if="modal" class="scrim" @click.self="modal = ''" @keydown.esc="modal = ''">
      <section class="modal stack" role="dialog" aria-modal="true" aria-label="后台操作">
        <div class="row between">
          <h2>
            {{
              {
                school: '新建学校',
                major: '新增专业',
                class: '新建班级',
                admin: system ? '设置管理员' : '设置教师',
                'account-phone': '修改手机号',
                'account-password': '重置密码',
                'account-role': '修改权限',
                students: '批量录入学生',
                result: '录入结果',
                file: '上传教材或资源',
              }[modal]
            }}
          </h2>
          <button class="icon-button" aria-label="关闭" @click="modal = ''">
            <Icon name="X" :size="18" />
          </button>
        </div>
        <form
          v-if="['school', 'major', 'class'].includes(modal)"
          class="stack"
          @submit.prevent="saveStructure"
        >
          <label class="field"
            >{{ { school: '学校名称', major: '专业名称', class: '班级名称' }[modal]
            }}<input v-model="form.name" required
          /></label>
          <label v-if="modal === 'school'" class="field"
            >学校编号<input v-model="form.code" required
          /></label>
          <template v-if="modal === 'class'"
            ><label class="field"
              >专业<select v-model="form.majorId" required>
                <option value="">请选择专业</option>
                <option v-for="item in majors" :key="item.id" :value="item.id">{{ item.name }}</option>
              </select></label
            ><label class="field"
              >届别<input v-model="form.cohort" placeholder="例如 2026 届" required /></label
          ></template>
          <button class="primary" :disabled="busy">创建</button>
        </form>
        <form v-else-if="modal === 'admin'" class="stack" @submit.prevent="saveAdmin">
          <label v-if="system" class="field"
            >管理员类型<select v-model="form.role">
              <option value="school_admin">学校管理员</option>
              <option value="system_admin">系统管理员</option>
            </select></label
          >
          <label v-if="form.role === 'school_admin'" class="field"
            >所属学校<select v-model="form.schoolId" required>
              <option v-for="item in structure.schools" :key="item.id" :value="item.id">
                {{ item.name }}
              </option>
            </select></label
          >
          <label v-if="form.role === 'class_admin'" class="field"
            >负责班级<select v-model="form.classId" required>
              <option v-for="item in classes" :key="item.id" :value="item.id">
                {{ classLabel(item) }}
              </option>
            </select></label
          >
          <label class="field">手机号<input v-model="form.phone" type="tel" required /></label
          ><label class="field">实名（新账号）<input v-model="form.realName" /></label
          ><label class="field">昵称（新账号）<input v-model="form.nickname" /></label>
          <p class="muted small">已有账号保留原实名、昵称和密码。新账号会生成初始密码。</p>
          <button class="primary" :disabled="busy">{{ system ? '设置管理员' : '设置教师' }}</button>
        </form>
        <form v-else-if="modal === 'account-phone'" class="stack" @submit.prevent="saveAccountPhone">
          <p>{{ form.nickname }}</p>
          <label class="field">新手机号<input v-model="form.phone" type="tel" required /></label>
          <button class="primary" :disabled="busy">保存手机号</button>
        </form>
        <div v-else-if="modal === 'account-password'" class="stack">
          <p>{{ form.nickname }} · {{ form.phone }}</p>
          <p class="muted small">重置后，该账号需用新生成的临时密码重新登录。</p>
          <button class="primary" :disabled="busy" @click="resetAccountPassword">生成临时密码</button>
        </div>
        <form v-else-if="modal === 'account-role'" class="stack" @submit.prevent="saveAccountRole">
          <p>{{ form.nickname }} · {{ form.phone }}</p>
          <label class="field"
            >角色<select v-model="form.role" aria-label="角色" required>
              <option v-for="role in assignableRoles" :key="role" :value="role">
                {{ accountRoles[role] }}
              </option>
            </select></label
          >
          <label v-if="system && ['school_admin', 'class_admin'].includes(form.role)" class="field"
            >所属学校
            <select v-model="form.schoolId" aria-label="所属学校" required @change="form.classIds = []">
              <option value="">请选择学校</option>
              <option v-for="school in structure.schools" :key="school.id" :value="school.id">
                {{ school.name }}
              </option>
            </select>
          </label>
          <div v-if="form.role === 'class_admin'" class="stack">
            <strong>负责班级</strong>
            <label v-for="item in roleClasses" :key="item.id" class="row"
              ><input v-model="form.classIds" type="checkbox" :value="item.id" />{{
                classLabel(item)
              }}</label
            >
            <p v-if="!roleClasses.length" class="muted small">暂无可分配的班级。</p>
          </div>
          <button
            class="primary"
            :disabled="busy || (form.role === 'class_admin' && !form.classIds.length)"
          >
            保存权限
          </button>
        </form>
        <form v-else-if="modal === 'students'" class="stack" @submit.prevent="addStudents">
          <label class="field"
            >每行一位学生，可粘贴表格三列<textarea
              v-model="batchText"
              placeholder="手机号,实名,昵称"
              required
            ></textarea></label
          ><button class="primary" :disabled="busy">录入到班级</button>
        </form>
        <template v-else-if="modal === 'result'"
          ><div
            v-for="(item, index) in provisioned"
            :key="index"
            class="note"
            :class="{ warn: item.ok === false }"
          >
            <strong>{{ item.phone }} {{ item.nickname }}</strong>
            <p v-if="item.temporaryPassword">
              {{ item.passwordLabel || '初始密码' }} <code>{{ item.temporaryPassword }}</code>
            </p>
            <p v-else>{{ item.message || '已设置，使用原密码登录。' }}</p>
          </div></template
        >
        <form v-else-if="modal === 'file'" class="stack" @submit.prevent="uploadMaterial">
          <label class="field"
            >发布范围<select v-model="form.classId">
              <option v-if="managesSchool" value="">{{ system ? '平台公共资源' : '全校' }}</option>
              <option v-for="item in classes" :key="item.id" :value="item.id">
                {{ classLabel(item) }}
              </option>
            </select></label
          ><label class="field"
            >教材或资源<input type="file" required @change="upload = $event.target.files[0]" /></label
          ><button class="primary" :disabled="busy || !upload">上传</button>
        </form>
        <p v-if="error" class="note warn" role="alert">{{ error }}</p>
      </section>
    </div></Teleport
  >
</template>
