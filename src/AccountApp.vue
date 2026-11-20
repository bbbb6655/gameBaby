<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import Icon from './Icon.vue'
import Mobile from './Mobile.vue'
import Desktop from './Desktop.vue'
import AdminPortal from './AdminPortal.vue'
import { api } from './api.js'

const props = defineProps({ mode: { type: String, required: true } })
const actor = ref(null)
const loading = ref(true)
const busy = ref(false)
const error = ref('')
const success = ref('')
const registration = ref(false)
const form = ref({ phone: '', realName: '', nickname: '', password: '' })
const schools = ref([])
const schoolId = ref('')
const classes = ref([])
const major = ref('')
const cohort = ref('')
const classId = ref('')
const study = ref(null)
const studyMode = ref(false)
const teachingDemo = ref(false)
const profile = ref(false)
const nickname = ref('')
const avatar = ref(null)
const password = ref({ currentPassword: '', newPassword: '' })
const profileResources = ref([])

const majors = computed(() => [...new Set(classes.value.map((item) => item.major))])
const cohorts = computed(() => [
  ...new Set(classes.value.filter((item) => item.major === major.value).map((item) => item.cohort)),
])
const classChoices = computed(() =>
  classes.value.filter((item) => item.major === major.value && item.cohort === cohort.value),
)
const waitingClass = computed(
  () => actor.value?.enrollments.filter((item) => item.status === 'pending') || [],
)
const blocked = computed(() => actor.value && !actor.value.canManage && !actor.value.canStudy)
function changeMajor() {
  cohort.value = ''
  classId.value = ''
}

const desktopHref = computed(() => {
  const url = new URL(location.port === '81' ? '/' : '/desktop.html', location.href)
  if (location.port === '81') url.port = '82'
  return url.href
})

function changeActor(next) {
  actor.value = next
  if (next) nickname.value = next.nickname
}

async function refresh() {
  changeActor(await api('/session'))
  if (!actor.value) return
  if (['none', 'rejected'].includes(actor.value.schoolStatus) && !actor.value.canManage)
    schools.value = await api('/schools')
  if (actor.value.schoolStatus === 'approved' && !actor.value.canStudy && !actor.value.canManage)
    classes.value = await api('/my/classes')
  if (actor.value.canStudy && !study.value) study.value = await api('/my/study-state')
}

async function request(work) {
  busy.value = true
  error.value = ''
  success.value = ''
  try {
    await work()
  } catch (err) {
    error.value = err.message
  } finally {
    busy.value = false
  }
}
const showStudyError = (event) => {
  error.value = event.detail
}
onMounted(async () => {
  window.addEventListener('gamebaby-study-error', showStudyError)
  await request(refresh)
  loading.value = false
})
onBeforeUnmount(() => window.removeEventListener('gamebaby-study-error', showStudyError))

async function authenticate() {
  await request(async () => {
    changeActor(
      await api(`/auth/${registration.value ? 'register' : 'login'}`, { method: 'POST', body: form.value }),
    )
    form.value.password = ''
    await refresh()
  })
}
async function signOut() {
  await request(async () => {
    await api('/auth/logout', { method: 'POST' })
    changeActor(null)
    study.value = null
    studyMode.value = false
    teachingDemo.value = false
    profile.value = false
  })
}
function applySchool() {
  return request(async () => {
    changeActor(await api('/my/school', { method: 'POST', body: { schoolId: schoolId.value } }))
    success.value = '入校申请已提交'
  })
}
function applyClass() {
  return request(async () => {
    changeActor(await api('/my/classes', { method: 'POST', body: { classId: classId.value } }))
    success.value = '入班申请已提交'
  })
}
function saveNickname() {
  return request(async () => {
    changeActor(await api('/my/profile', { method: 'PATCH', body: { nickname: nickname.value } }))
    if (actor.value.canStudy) study.value = await api('/my/study-state')
    success.value = '昵称已保存'
  })
}
function openProfile() {
  profile.value = true
  if (!blocked.value)
    request(async () => {
      profileResources.value = await api('/materials')
    })
}
function uploadAvatar() {
  return request(async () => {
    const body = new FormData()
    body.append('file', avatar.value)
    await api('/my/avatar', { method: 'POST', body })
    changeActor(await api('/session'))
    avatar.value = null
    success.value = '头像已更新'
  })
}
function changePassword() {
  return request(async () => {
    await api('/my/password', { method: 'PATCH', body: password.value })
    password.value = { currentPassword: '', newPassword: '' }
    success.value = '密码已修改'
  })
}
</script>

<template>
  <div v-if="loading" class="account-wait">正在连接养崽日记…</div>
  <div v-else-if="!actor" class="account-page">
    <main class="account-card paper">
      <div class="account-hero">
        <span class="brand-mark"><Icon name="Sprout" :size="24" /></span>
        <div>
          <h1>养崽日记</h1>
          <p>婴幼儿照护实训</p>
        </div>
        <img src="/baby/baby-08.png" alt="宝宝漫画" />
      </div>
      <form class="account-form stack" @submit.prevent="authenticate">
        <h2>{{ registration ? '注册账号' : '手机号登录' }}</h2>
        <label class="field"
          >手机号<input v-model="form.phone" type="tel" autocomplete="username" required
        /></label>
        <template v-if="registration">
          <label class="field"
            >实名<input v-model="form.realName" autocomplete="name" maxlength="80" required
          /></label>
          <p class="muted small">实名仅对所申请或已加入班级的班级管理员可见。</p>
          <label class="field"
            >昵称<input v-model="form.nickname" autocomplete="nickname" maxlength="80" required
          /></label>
        </template>
        <label class="field"
          >密码<input
            v-model="form.password"
            type="password"
            :autocomplete="registration ? 'new-password' : 'current-password'"
            required
        /></label>
        <div v-if="error" class="note warn" role="alert">{{ error }}</div>
        <button class="primary" :disabled="busy">{{ registration ? '注册' : '登录' }}</button>
        <button class="ghost" type="button" @click="registration = !registration">
          {{ registration ? '已有账号，去登录' : '没有账号，去注册' }}
        </button>
      </form>
    </main>
  </div>
  <template v-else>
    <div class="account-bar">
      <div class="row">
        <img v-if="actor.avatarId" :src="`/api/files/${actor.avatarId}`" alt="头像" /><strong>{{
          actor.nickname
        }}</strong
        ><span class="muted small">{{ actor.schoolName }}</span>
      </div>
      <div class="row wrap">
        <button
          v-if="actor.canStudy && actor.canManage && mode === 'desktop' && !teachingDemo"
          class="ghost"
          @click="studyMode = !studyMode"
        >
          {{ studyMode ? '教学管理' : '我的学习' }}
        </button>
        <button
          v-if="actor.canManage && mode === 'desktop' && !studyMode"
          class="ghost"
          @click="teachingDemo = !teachingDemo"
        >
          {{ teachingDemo ? '返回实际管理' : '教学演示' }}
        </button>
        <button class="ghost" @click="openProfile">账号</button
        ><button class="ghost" @click="signOut">退出</button>
      </div>
    </div>
    <p v-if="error && !profile && !blocked" class="note warn account-error" role="alert">{{ error }}</p>
    <div v-if="blocked" class="account-page account-pending">
      <main class="paper account-review stack">
        <div class="row">
          <span class="brand-mark"><Icon name="School" /></span>
          <div>
            <h1>加入学校与班级</h1>
            <p class="small muted">通过入校与入班审核后，即可开始学习。</p>
          </div>
        </div>
        <div class="account-steps">
          <span :class="{ done: actor.schoolStatus === 'approved' }"
            ><Icon name="School" :size="17" /> 入校审核</span
          >
          <span :class="{ done: actor.canStudy }"><Icon name="Users" :size="17" /> 入班审核</span>
        </div>
        <form
          v-if="['none', 'rejected'].includes(actor.schoolStatus)"
          class="stack"
          @submit.prevent="applySchool"
        >
          <p v-if="actor.schoolStatus === 'rejected'" class="note warn">
            入校申请未通过，可以重新选择学校提交。
          </p>
          <label class="field"
            >学校<select v-model="schoolId" required>
              <option value="">请选择学校</option>
              <option v-for="item in schools" :key="item.id" :value="item.id">{{ item.name }}</option>
            </select></label
          >
          <p v-if="!schools.length" class="muted small">暂无可申请的学校。</p>
          <button class="primary" :disabled="busy || !schoolId">提交入校申请</button>
        </form>
        <div v-else-if="actor.schoolStatus === 'pending'" class="note">
          <strong>{{ actor.schoolName }} · 待学校管理员审核</strong>
          <p>审核后可以申请专业、届别和班级。</p>
        </div>
        <template v-else>
          <div
            v-for="item in actor.enrollments"
            :key="item.id"
            class="note"
            :class="{ warn: item.status === 'rejected' }"
          >
            {{ item.major }} · {{ item.cohort }} · {{ item.name }}　{{
              item.status === 'pending' ? '待入班审核' : '申请未通过'
            }}
          </div>
          <form class="stack" @submit.prevent="applyClass">
            <label class="field"
              >专业<select v-model="major" required @change="changeMajor">
                <option value="">请选择专业</option>
                <option v-for="name in majors" :key="name">{{ name }}</option>
              </select></label
            >
            <label class="field"
              >届别<select v-model="cohort" required @change="classId = ''" :disabled="!major">
                <option value="">请选择届别</option>
                <option v-for="name in cohorts" :key="name">{{ name }}</option>
              </select></label
            >
            <label class="field"
              >班级<select v-model="classId" required :disabled="!cohort">
                <option value="">请选择班级</option>
                <option
                  v-for="item in classChoices"
                  :key="item.id"
                  :value="item.id"
                  :disabled="waitingClass.some((active) => active.id === item.id)"
                >
                  {{ item.name }}
                </option>
              </select></label
            >
            <button class="primary" :disabled="busy || !classId">提交入班申请</button>
          </form>
        </template>
        <p v-if="error" class="note warn" role="alert">{{ error }}</p>
        <p v-if="success" class="note" role="status">{{ success }}</p>
        <button class="secondary" :disabled="busy" @click="request(refresh)">刷新审核状态</button>
      </main>
    </div>
    <Desktop
      v-else-if="teachingDemo && actor.canManage && mode === 'desktop'"
      :demo-role="
        actor.role === 'system_admin' ? 'platform' : actor.role === 'school_admin' ? 'school' : 'teacher'
      "
      :demo-account="actor.id"
    />
    <AdminPortal v-else-if="actor.canManage && mode === 'desktop' && !studyMode" :actor="actor" />
    <template v-else-if="actor.canStudy && study">
      <Mobile v-if="mode === 'mobile'" :key="actor.id + ':' + actor.nickname" :account-state="study" />
      <Desktop v-else :key="actor.id + ':' + actor.nickname" :account-state="study" />
    </template>
    <div v-else-if="actor.canManage" class="account-page account-pending">
      <main class="paper account-review stack">
        <h1>教学管理</h1>
        <p class="muted">请打开 PC 工作台管理学校、班级、申请和资源。</p>
        <a class="primary" :href="desktopHref">打开 PC 工作台</a>
      </main>
    </div>
    <div v-else class="account-wait">
      <p v-if="error" role="alert">{{ error }}</p>
      <button class="secondary" @click="request(refresh)">重新加载学习档案</button>
    </div>
  </template>

  <Teleport to="body">
    <div v-if="profile && actor" class="scrim" @click.self="profile = false" @keydown.esc="profile = false">
      <section class="modal stack" role="dialog" aria-modal="true" aria-label="我的账号">
        <div class="row between">
          <h2>我的账号</h2>
          <button class="icon-button" aria-label="关闭" @click="profile = false"><Icon name="X" /></button>
        </div>
        <p class="muted">手机号 {{ actor.phone }}</p>
        <form class="stack" @submit.prevent="saveNickname">
          <label class="field">昵称<input v-model="nickname" maxlength="80" required /></label
          ><button class="secondary" :disabled="busy">保存昵称</button>
        </form>
        <form v-if="!blocked" class="stack" @submit.prevent="uploadAvatar">
          <label class="field"
            >更换头像<input
              type="file"
              accept="image/png,image/jpeg,image/gif,image/webp"
              @change="avatar = $event.target.files[0]" /></label
          ><button class="secondary" :disabled="busy || !avatar">上传头像</button>
        </form>
        <details>
          <summary>修改密码</summary>
          <form class="stack" @submit.prevent="changePassword">
            <label class="field"
              >当前密码<input v-model="password.currentPassword" type="password" required /></label
            ><label class="field"
              >新密码<input v-model="password.newPassword" type="password" required /></label
            ><button class="secondary" :disabled="busy">保存密码</button>
          </form>
        </details>
        <template v-if="!blocked"
          ><h3>教材和资源</h3>
          <a v-for="file in profileResources" :key="file.id" class="choice" :href="`/api/files/${file.id}`"
            ><Icon name="Download" :size="16" /> {{ file.name }}</a
          >
          <p v-if="!profileResources.length" class="muted small">暂无可下载的资源。</p></template
        >
        <p v-if="error" class="note warn" role="alert">{{ error }}</p>
        <p v-if="success" class="note" role="status">{{ success }}</p>
      </section>
    </div>
  </Teleport>
</template>
