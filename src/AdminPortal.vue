<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import Icon from './Icon.vue'
import { api } from './api.js'

const { actor } = defineProps({ actor: { type: Object, required: true } })
const system = computed(() => actor.role === 'system_admin')
const schoolAdmin = computed(() => actor.role === 'school_admin')
const managesSchool = computed(() => system.value || schoolAdmin.value)
const roleTitle = computed(() =>
  system.value ? '系统管理员' : schoolAdmin.value ? '学校管理员' : '班级管理员',
)
const allTabs = [
  ['setup', '学校与班级', 'School'],
  ['school', '入校审核', 'ShieldCheck'],
  ['class', '入班审核', 'ClipboardList'],
  ['roster', '学生名册', 'Users'],
  ['admins', '管理员设置', 'User'],
  ['files', '教材与资源', 'BookOpen'],
]
const tabs = computed(() =>
  allTabs.filter(([id]) =>
    id === 'school' ? schoolAdmin.value : ['setup', 'admins'].includes(id) ? managesSchool.value : true,
  ),
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

async function refreshStructure() {
  structure.value = await api('/admin/structure')
  if (!structure.value.schools.some((item) => item.id === schoolId.value))
    schoolId.value = structure.value.schools[0]?.id || ''
  if (!classes.value.some((item) => item.id === classId.value)) classId.value = classes.value[0]?.id || ''
}
async function refreshPage() {
  if (page.value === 'school') applicants.value = await api('/admin/school-applications')
  else if (page.value === 'roster' || page.value === 'class') {
    const selected = { page: page.value, id: classId.value, newOnly: newOnly.value }
    if (roster.value.classInfo?.id !== selected.id) roster.value = { users: [], canSeeRealName: false }
    if (!selected.id) return
    const result = await api(
      `/admin/classes/${selected.id}/roster?status=${selected.page === 'class' ? 'pending' : 'approved'}${selected.newOnly && selected.page === 'roster' ? '&newOnly=1' : ''}`,
    )
    if (page.value === selected.page && classId.value === selected.id && newOnly.value === selected.newOnly)
      roster.value = result
  } else if (page.value === 'files') files.value = await api('/materials')
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
    message.value = '管理员已设置'
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
        <label v-if="system" class="field"
          >学校<select v-model="schoolId" aria-label="查看学校">
            <option v-for="item in structure.schools" :key="item.id" :value="item.id">
              {{ item.name }}
            </option>
          </select></label
        >
      </header>
      <p v-if="error && !modal" class="note warn" role="alert">{{ error }}</p>
      <p v-if="message && !modal" class="note" role="status">{{ message }}</p>

      <template v-if="page === 'setup'">
        <section class="paper panel stack">
          <div class="section-title">
            <h2>学校</h2>
            <button v-if="system" class="primary" @click="show('school')">
              <Icon name="Plus" :size="16" /> 新建学校
            </button>
          </div>
          <div class="row wrap">
            <span v-for="item in structure.schools" :key="item.id" class="tag">{{ item.name }}</span>
            <p v-if="!structure.schools.length" class="empty">请先创建学校。</p>
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
            <span v-for="item in majors" :key="item.id" class="tag">{{ item.name }}</span>
            <p v-if="!majors.length" class="muted">尚未设置专业。</p>
          </div>
          <div v-for="item in classes" :key="item.id" class="manageable">
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

      <section v-else-if="page === 'admins'" class="paper panel stack">
        <div class="section-title">
          <h2>{{ system ? '系统与学校管理员' : '班级管理员' }}</h2>
          <button class="primary" @click="show('admin')"><Icon name="Plus" :size="16" /> 设置管理员</button>
        </div>
        <p class="muted">按手机号查找已有账号并设置角色，也可预录新的管理员账号。</p>
      </section>

      <section v-else class="paper panel stack">
        <div class="section-title">
          <h2>已发布资源</h2>
          <button class="primary" @click="show('file')"><Icon name="Plus" :size="16" /> 上传文件</button>
        </div>
        <div v-for="item in files" :key="item.id" class="manageable">
          <span>{{ item.name }}</span
          ><a class="secondary" :href="`/api/files/${item.id}`"><Icon name="Download" :size="16" /> 下载</a>
        </div>
        <p v-if="!files.length" class="empty">暂无教材或资源。</p>
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
                admin: '设置管理员',
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
            >管理班级<select v-model="form.classId" required>
              <option v-for="item in classes" :key="item.id" :value="item.id">
                {{ classLabel(item) }}
              </option>
            </select></label
          >
          <label class="field">手机号<input v-model="form.phone" type="tel" required /></label
          ><label class="field">实名（新账号）<input v-model="form.realName" /></label
          ><label class="field">昵称（新账号）<input v-model="form.nickname" /></label>
          <p class="muted small">已有账号保留原实名、昵称和密码。新账号会生成初始密码。</p>
          <button class="primary" :disabled="busy">设置管理员</button>
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
              初始密码 <code>{{ item.temporaryPassword }}</code>
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
