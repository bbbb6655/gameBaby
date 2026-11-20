<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import Icon from './Icon.vue'
import Mobile from './Mobile.vue'
import Desktop from './Desktop.vue'
import AdminPortal from './AdminPortal.vue'
import EnrollmentFields from './EnrollmentFields.vue'
import { api } from './api.js'

const props = defineProps({ mode: { type: String, required: true } })
const actor = ref(null)
const loading = ref(true)
const busy = ref(false)
const error = ref('')
const success = ref('')
const registration = ref(false)
const form = ref({ phone: '', realName: '', nickname: '', password: '' })
const smsCode = ref('')
const demoSmsCode = ref('')
const enrollmentOptions = ref(null)
const emptyPlacement = () => ({ schoolId: '', majorId: '', cohort: '', classId: '' })
const placement = ref(emptyPlacement())
const study = ref(null)
const studyMode = ref(false)
const teachingDemo = ref(false)
const profile = ref(false)
const nickname = ref('')
const accountPhone = ref('')
const avatar = ref(null)
const password = ref({ currentPassword: '', newPassword: '' })
const profileResources = ref([])

const blocked = computed(() => actor.value && !actor.value.canManage && !actor.value.canStudy)
const needsPlacement = computed(
  () =>
    blocked.value &&
    (['none', 'rejected'].includes(actor.value.schoolStatus) ||
      !actor.value.enrollments.some((item) => item.status === 'pending')),
)
const fixedSchoolId = computed(() =>
  ['pending', 'approved'].includes(actor.value?.schoolStatus) ? actor.value.schoolId : '',
)
const hasPlacementOptions = computed(() =>
  enrollmentOptions.value?.some((item) => !fixedSchoolId.value || item.schoolId === fixedSchoolId.value),
)

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
  if (needsPlacement.value) await loadEnrollmentOptions()
  if (actor.value.canStudy && !study.value) study.value = await api('/my/study-state')
}

async function loadEnrollmentOptions() {
  enrollmentOptions.value = await api('/enrollment-options')
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

function clearSmsCode() {
  smsCode.value = ''
  demoSmsCode.value = ''
}
watch(() => form.value.phone, clearSmsCode)

function getSmsCode() {
  return request(async () => {
    const phone = form.value.phone
    const { code } = await api('/auth/sms-code', { method: 'POST', body: { phone } })
    if (phone === form.value.phone) demoSmsCode.value = code
  })
}

async function authenticate() {
  await request(async () => {
    const body = registration.value
      ? { ...form.value, ...placement.value, smsCode: smsCode.value }
      : form.value
    changeActor(await api(`/auth/${registration.value ? 'register' : 'login'}`, { method: 'POST', body }))
    form.value.password = ''
    clearSmsCode()
    placement.value = emptyPlacement()
    await refresh()
  })
}
function toggleRegistration() {
  registration.value = !registration.value
  clearSmsCode()
  error.value = ''
  if (registration.value) return request(loadEnrollmentOptions)
}
async function signOut() {
  await request(async () => {
    await api('/auth/logout', { method: 'POST' })
    changeActor(null)
    study.value = null
    studyMode.value = false
    teachingDemo.value = false
    profile.value = false
    registration.value = false
    placement.value = emptyPlacement()
  })
}
function applyClass() {
  return request(async () => {
    const body = { ...placement.value, schoolId: fixedSchoolId.value || placement.value.schoolId }
    changeActor(await api('/my/classes', { method: 'POST', body }))
    placement.value = emptyPlacement()
    success.value = '申请已提交'
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
  accountPhone.value = actor.value.phone
  profile.value = true
  if (!blocked.value)
    request(async () => {
      profileResources.value = await api('/materials')
    })
}
function savePhone() {
  return request(async () => {
    changeActor(await api('/my/phone', { method: 'PATCH', body: { phone: accountPhone.value } }))
    accountPhone.value = actor.value.phone
    form.value.phone = actor.value.phone
    success.value = '手机号已修改，下次请用新手机号登录'
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
        <h2>{{ registration ? '注册账号' : '账号登录' }}</h2>
        <label class="field">
          {{ registration ? '手机号' : '手机号或账号' }}
          <input
            v-model="form.phone"
            :type="registration ? 'tel' : 'text'"
            autocomplete="username"
            required
          />
        </label>
        <template v-if="registration">
          <div class="field">
            <span class="row between">
              <label for="sms-code">短信验证码</label>
              <span v-if="demoSmsCode" id="demo-sms-code" class="tag" role="status"
                >演示码 {{ demoSmsCode }}</span
              >
            </span>
            <div class="row">
              <input
                id="sms-code"
                v-model.trim="smsCode"
                class="grow inline-input"
                :aria-describedby="demoSmsCode ? 'demo-sms-code' : undefined"
                type="text"
                inputmode="numeric"
                autocomplete="one-time-code"
                pattern="[0-9]{4}"
                maxlength="4"
                required
              />
              <button
                class="secondary sms-button"
                type="button"
                :disabled="busy || !form.phone.trim()"
                @click="getSmsCode"
              >
                获取验证码
              </button>
            </div>
          </div>
          <label class="field"
            >实名<input v-model="form.realName" autocomplete="name" maxlength="80" required
          /></label>
          <p class="muted small">实名仅对所申请或已加入班级的教师可见。</p>
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
        <template v-if="registration">
          <EnrollmentFields v-model="placement" :options="enrollmentOptions || []" />
          <p v-if="enrollmentOptions && !hasPlacementOptions" class="muted small">暂无可选班级。</p>
        </template>
        <div v-if="error" class="note warn" role="alert">{{ error }}</div>
        <button class="primary" :disabled="busy || (registration && !placement.classId)">
          {{ registration ? '注册' : '登录' }}
        </button>
        <button class="ghost" type="button" :disabled="busy" @click="toggleRegistration">
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
        <div v-if="actor.schoolStatus === 'pending'" class="note">
          <strong>{{ actor.schoolName }} · 待入校审核</strong>
        </div>
        <p v-else-if="actor.schoolStatus === 'rejected'" class="note warn">
          入校申请未通过，可以重新选择学校和班级提交。
        </p>
        <template v-if="['pending', 'approved'].includes(actor.schoolStatus)">
          <div
            v-for="item in actor.enrollments"
            :key="item.id"
            class="note"
            :class="{ warn: item.status === 'rejected' }"
          >
            {{ item.major }} · {{ item.cohort }} · {{ item.name }}　{{
              item.status === 'pending'
                ? actor.schoolStatus === 'pending'
                  ? '已提交入班申请'
                  : '待入班审核'
                : '入班申请未通过'
            }}
          </div>
        </template>
        <form v-if="needsPlacement" class="stack" @submit.prevent="applyClass">
          <EnrollmentFields
            v-model="placement"
            :fixed-school-id="fixedSchoolId"
            :options="enrollmentOptions || []"
          />
          <p v-if="enrollmentOptions && !hasPlacementOptions" class="muted small">暂无可选班级。</p>
          <button class="primary" :disabled="busy || !placement.classId">提交申请</button>
        </form>
        <p v-if="error && !profile" class="note warn" role="alert">{{ error }}</p>
        <p v-if="success && !profile" class="note" role="status">{{ success }}</p>
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
        <form class="stack" @submit.prevent="savePhone">
          <label class="field">
            {{ actor.phone === 'admin' ? '登录账号或手机号' : '手机号' }}
            <input v-model="accountPhone" type="tel" autocomplete="tel" required />
          </label>
          <button class="secondary" :disabled="busy || accountPhone === actor.phone">保存手机号</button>
        </form>
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
        <form class="stack" @submit.prevent="changePassword">
          <h3>修改密码</h3>
          <label class="field"
            >当前密码<input
              v-model="password.currentPassword"
              type="password"
              autocomplete="current-password"
              required
          /></label>
          <label class="field"
            >新密码<input
              v-model="password.newPassword"
              type="password"
              autocomplete="new-password"
              required
          /></label>
          <button class="secondary" :disabled="busy">保存密码</button>
        </form>
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
