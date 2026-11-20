<script setup>
import { computed, ref, watch } from 'vue'
import Icon from './Icon.vue'
import StateCards from './StateCards.vue'
import Timeline from './Timeline.vue'
import Trend from './Trend.vue'
import {
  ageLabel,
  bands,
  bandFor,
  care,
  cases,
  domains,
  events,
  freshBaby,
  knowledge,
  policyFor,
  portrait,
} from './model.js'
import { createStore } from './store.js'

const props = defineProps({ accountState: Object })
const { data, dispatch } = createStore(props.accountState)
const requested = new URLSearchParams(location.search).get('school')
const schoolId = ref(data.value.schools[requested] ? requested : 'a')
const school = computed(() => data.value.schools[schoolId.value])
const baby = computed(() => school.value.baby)
const classPolicy = computed(() => policyFor(school.value))
const band = computed(() => bandFor(baby.value?.age ?? 8))
const currentEvent = computed(() => events[baby.value?.event])
const statusText = computed(() =>
  baby.value?.event === 'cry' ? '正在哭闹' : baby.value?.event === 'sleepy' ? '有点犯困' : '状态舒适',
)
const act = (type, fields = {}) => dispatch({ type, school: schoolId.value, ...fields })

const tabs = [
  ['home', '养崽', 'House'],
  ['circles', '月龄圈', 'Users'],
  ['learn', '知识学习', 'BookOpen'],
  ['test', '案例测评', 'ClipboardList'],
  ['me', '我的', 'User'],
]
const page = ref('home')
const circleBand = ref(band.value)
const circleSection = ref('全部')
const libraryBand = ref(-1)
const libraryDomain = ref('全部')
const myTab = ref('照护记录')
const growthMetric = ref('身高')
const modal = ref('')
const selected = ref(null)
const option = ref(null)
const result = ref(null)
const toast = ref('')
let toastTimer
function notify(message) {
  toast.value = message
  clearTimeout(toastTimer)
  toastTimer = setTimeout(() => {
    toast.value = ''
  }, 2400)
}
function show(name, item = null) {
  selected.value = item
  option.value = null
  result.value = null
  modal.value = name
}
function close() {
  modal.value = ''
}
function go(id) {
  page.value = id
  if (id === 'circles') circleBand.value = band.value
  if (id === 'learn') {
    libraryBand.value = -1
    libraryDomain.value = '全部'
  }
  window.scrollTo({ top: 0 })
}
function openProfile(tab) {
  myTab.value = tab
  go('me')
}
function accelerate() {
  act('age-up')
  close()
  notify('成长进度已更新')
}
function resetDemo() {
  act('adopt-reset')
  close()
  go('home')
}
function saveNote() {
  act('note', { id: selected.value.id, note: notes.value })
  notify('笔记已保存')
}
const desktopUrl = computed(() => {
  const url = new URL(location.port === '81' ? '/' : '/desktop.html', location.href)
  if (location.port === '81') url.port = '82'
  url.searchParams.set('school', schoolId.value)
  url.hash = 'student'
  return url.href
})

const adoptionMode = ref('start')
const startAge = ref(2)
const nickname = ref('小橙子')
const ageModes = [
  { id: 'start', name: '从头开始', hint: '0–3 月龄' },
  { id: 'skip', name: '分段快进', hint: '任一月龄阶段' },
  { id: 'custom', name: '自定义月龄', hint: '按课程进度选择' },
]
const allowed = computed(() => {
  const policy = classPolicy.value
  const min = policy.mode === 'locked' ? policy.locked : policy.mode === 'range' ? policy.min : 0
  const max = policy.mode === 'locked' ? policy.locked : policy.mode === 'range' ? policy.max : 36
  return Array.from({ length: max - min + 1 }, (_, i) => i + min)
})
const monthOptions = computed(() => {
  if (classPolicy.value.mode === 'locked') return allowed.value
  if (adoptionMode.value === 'start') return allowed.value.filter((month) => month <= 3)
  if (adoptionMode.value === 'skip')
    return bands.flatMap((b) => {
      const month = allowed.value.find((value) => value >= b.from && value <= b.to)
      return month === undefined ? [] : [month]
    })
  return allowed.value
})
watch(
  monthOptions,
  (list) => {
    if (!list.length) adoptionMode.value = 'custom'
    else if (!list.includes(startAge.value)) startAge.value = list[0]
  },
  { immediate: true },
)
function adopt() {
  if (!monthOptions.value.includes(startAge.value) || !nickname.value.trim()) return
  act('adopt', { age: startAge.value, nickname: nickname.value.trim() })
  close()
  go('home')
  notify('领养成功，开始照护吧')
}
function scenario(age, event) {
  act('scenario', { age, event })
  go('home')
  close()
}
function perform(item) {
  act('care', { id: item.id })
  close()
  notify('照护完成 · 已记录')
}
function answerEvent() {
  result.value = { correct: option.value === selected.value.correct, reason: selected.value.reason }
  act('event-answer', { answer: option.value })
}
function startScenario(key) {
  if (!baby.value) return
  act('scenario', { event: key })
  show('event', events[key])
}

const posts = computed(() => {
  const posts = school.value.posts.filter(
    (item) =>
      item.band === circleBand.value &&
      (item.status === 'published' || (item.status === 'pending' && item.author === school.value.student)),
  )
  if (circleSection.value === '本周热帖')
    return posts.filter((item) => item.status === 'published').sort((a, b) => b.likes - a.likes)
  return posts
    .filter((item) => circleSection.value === '全部' || item.section === circleSection.value)
    .sort((a, b) => Number(Boolean(b.pinned)) - Number(Boolean(a.pinned)))
})
const activePost = computed(() => school.value.posts.find((item) => item.id === selected.value?.id))
const postTitle = ref(''),
  postBody = ref(''),
  postTag = ref('照护求助'),
  shareLog = ref(''),
  comment = ref('')
function createPost() {
  const share = school.value.logs.find((item) => item.id === shareLog.value)
  act('post', {
    band: circleBand.value,
    title: postTitle.value.trim(),
    body: postBody.value.trim(),
    tag: postTag.value,
    section: '同学互助',
    author: school.value.student,
    share: share && { title: share.title, image: portrait(baby.value) },
  })
  postTitle.value = ''
  postBody.value = ''
  shareLog.value = ''
  circleSection.value = '全部'
  close()
  notify(school.value.settings.moderation ? '已提交，等待教师审核' : '帖子已发布')
}
function addComment() {
  if (!comment.value.trim()) return
  act('comment', { id: activePost.value.id, text: comment.value.trim() })
  comment.value = ''
}

const notes = ref('')
const library = computed(() =>
  [...knowledge, ...school.value.resources.filter((item) => item.status === 'published')].filter(
    (item) =>
      (libraryBand.value === -1 || item.band === libraryBand.value) &&
      (libraryDomain.value === '全部' || item.domain === libraryDomain.value),
  ),
)
function viewKnowledge(item) {
  act('read', { id: item.id })
  notes.value = school.value.notes[item.id] || ''
  show('knowledge', item)
}
function linkedCare() {
  const item = care.find((item) => item.id === selected.value.action)
  if (baby.value && item) {
    go('home')
    show('care', item)
  }
}

const exam = ref(null)
const examAnswers = ref({})
const examIndex = ref(0)
const examQuestion = computed(() => exam.value?.questions[examIndex.value])
const publishedExams = computed(() =>
  school.value.exams.filter(
    (item) => item.status === 'published' && (!item.startsAt || new Date(item.startsAt) <= new Date()),
  ),
)
const questionBank = computed(() => [...cases, ...(school.value.questions || [])])
function startExam(item) {
  const questions = item.ids.map((id) => questionBank.value.find((q) => q.id === id)).filter(Boolean)
  if (!questions.length) return
  exam.value = { ...item, questions }
  examAnswers.value = {}
  examIndex.value = 0
  show('exam')
}
function submitExam() {
  const answers = exam.value.questions.map((q) => ({
    id: q.id,
    title: q.title,
    domain: q.domain,
    correct: examAnswers.value[q.id] === q.correct,
    reason: q.reason,
  }))
  const correct = answers.filter((answer) => answer.correct).length
  result.value = { correct, total: answers.length }
  act('submit', { ...result.value, answers, title: exam.value.title })
}
const wrong = computed(() =>
  school.value.attempts.flatMap((item) => item.answers.filter((answer) => !answer.correct)),
)
const growthData = computed(() =>
  growthMetric.value === '身高'
    ? [
        { name: '宝宝模拟', values: [60, 64, 67, 70, 72], color: '#43785a' },
        { name: '参考示意', values: [61, 65, 68, 71, 73], color: '#be9a50' },
      ]
    : [
        { name: '宝宝模拟', values: [5.7, 6.4, 7.2, 7.8, 8.5], color: '#43785a' },
        { name: '参考示意', values: [5.9, 6.8, 7.4, 8.1, 8.7], color: '#be9a50' },
      ],
)
watch(schoolId, () => {
  circleSection.value = '全部'
  close()
  go('home')
})
</script>

<template>
  <div class="mobile-shell">
    <header class="m-header">
      <div class="m-header-inner">
        <button class="brand brand-button" @click="go('home')">
          <span class="brand-mark"><Icon name="Sprout" :size="22" /></span
          ><span
            ><strong>养崽日记</strong><small>{{ school.name }}</small></span
          >
        </button>
        <nav class="desktop-tabs" aria-label="学生导航">
          <button
            v-for="[id, label, icon] in tabs"
            :key="id"
            :class="{ active: page === id }"
            @click="go(id)"
          >
            <Icon :name="icon" :size="17" />{{ label }}
          </button>
        </nav>
        <button class="icon-button profile-button" aria-label="我的和演示设置" @click="go('me')">
          <Icon name="User" :size="18" />
        </button>
      </div>
    </header>

    <main class="m-main">
      <template v-if="page === 'home' && baby">
        <div class="m-heading">
          <div>
            <p class="m-overline">{{ school.classes[0] || school.name }} · 养崽实训</p>
            <h1>我的宝宝</h1>
          </div>
          <button class="secondary demo-button" @click="show('scenarios')">
            <Icon name="Settings2" :size="16" /> 演示场景
          </button>
        </div>
        <div class="home-top">
          <section
            class="m-hero"
            :class="{ 'needs-care': baby.event === 'cry' || baby.event === 'sleepy' }"
          >
            <div class="hero-ring ring-one"></div>
            <div class="hero-ring ring-two"></div>
            <div class="hero-cross">✦</div>
            <div class="hero-dot"></div>
            <div class="hero-copy">
              <span class="hero-age"
                ><Icon name="Sprout" :size="15" /> {{ baby.age }} 月龄 · {{ bands[band].name }}</span
              >
              <h2>{{ baby.nickname }}</h2>
              <p>{{ baby.age >= 12 ? ageLabel(baby.age) : '宝宝状态' }} · {{ statusText }}</p>
            </div>
            <img
              :key="portrait(baby)"
              class="hero-baby"
              :src="portrait(baby)"
              :alt="`${baby.nickname}，${ageLabel(baby.age)}，${statusText}`"
              fetchpriority="high"
            />
            <button class="hero-link" @click="openProfile('成长档案')">
              <Icon name="BookOpen" :size="15" /> 成长档案 <Icon name="ChevronRight" :size="13" />
            </button>
          </section>
          <section class="paper status-panel">
            <div class="section-title">
              <h2>宝宝状态</h2>
              <span class="tag"><Icon name="Activity" :size="12" /> 模拟</span>
            </div>
            <StateCards :baby="baby" />
            <div class="row between m-growth">
              <span><Icon name="Zap" :size="15" /> {{ baby.cards }} 张成长加速卡</span
              ><button class="ghost" :disabled="!baby.cards || baby.age >= 36" @click="show('accelerate')">
                使用
              </button>
            </div>
          </section>
        </div>
        <section class="paper panel m-care">
          <div class="section-title">
            <h2>日常照护</h2>
            <span class="muted small">{{ bands[band].label }}适龄操作</span>
          </div>
          <div class="care-grid">
            <button v-for="item in care" :key="item.id" @click="show('care', item)">
              <span :class="item.tone"><Icon :name="item.icon" :size="22" /></span><b>{{ item.name }}</b>
            </button>
          </div>
        </section>
        <div class="home-bottom">
          <section class="paper panel event-card">
            <span class="event-icon"><Icon name="Sparkles" :size="22" /></span>
            <div class="grow">
              <span class="tag amber">{{ currentEvent?.type || '情景练习' }}</span>
              <h2>{{ currentEvent?.title || '午睡醒来突然哭闹' }}</h2>
              <p>
                {{ currentEvent ? '查看场景线索并选择处理方式。' : '练习根据宝宝的动作和表情做出判断。' }}
              </p>
            </div>
            <button
              class="primary"
              @click="currentEvent ? show('event', currentEvent) : startScenario('cry')"
            >
              {{ currentEvent ? '去处理' : '开始练习' }}
            </button>
          </section>
          <section class="paper panel recent">
            <div class="section-title">
              <h2>最近照护</h2>
              <button class="ghost" @click="openProfile('照护记录')">全部</button>
            </div>
            <Timeline :items="school.logs.slice(0, 2)" />
          </section>
        </div>
      </template>

      <template v-else-if="page === 'home'">
        <div class="m-heading">
          <div>
            <p class="m-overline">{{ school.name }} · {{ school.classes[0] || '养崽实训' }}</p>
            <h1>领养宝宝</h1>
          </div>
        </div>
        <section class="paper panel adoption">
          <div class="adopt-art">
            <img :src="portrait(freshBaby(startAge))" alt="起始月龄预览" /><strong>{{
              ageLabel(startAge)
            }}</strong>
          </div>
          <div class="stack">
            <h2>选择起始月龄</h2>
            <div v-if="classPolicy.mode === 'locked'" class="note">
              教师已为全班指定 {{ classPolicy.locked }} 月龄。
            </div>
            <div v-else class="adopt-options">
              <button
                v-for="mode in ageModes"
                :key="mode.id"
                class="choice"
                :class="{ active: adoptionMode === mode.id }"
                :disabled="mode.id === 'start' && !allowed.some((age) => age <= 3)"
                @click="adoptionMode = mode.id"
              >
                <Icon :name="adoptionMode === mode.id ? 'Check' : 'Baby'" :size="17" /><span
                  ><b>{{ mode.name }}</b
                  ><small>{{ mode.hint }}</small></span
                >
              </button>
            </div>
            <label class="field"
              >起始月龄<select v-model.number="startAge">
                <option v-for="month in monthOptions" :key="month" :value="month">{{ month }} 月龄</option>
              </select></label
            ><label class="field">宝宝昵称<input v-model="nickname" maxlength="12" /></label>
            <p class="muted small">确认后起始月龄不可修改，此前阶段的知识可在知识库回看。</p>
            <button
              class="primary"
              :disabled="!nickname.trim() || !monthOptions.includes(startAge)"
              @click="show('adopt')"
            >
              确认领养
            </button>
          </div>
        </section>
      </template>

      <template v-else-if="page === 'circles'">
        <div class="m-heading">
          <div>
            <p class="m-overline">{{ school.name }}</p>
            <h1>月龄圈</h1>
          </div>
          <button class="primary" @click="show('compose')"><Icon name="Plus" :size="16" /> 发帖</button>
        </div>
        <div class="paper panel stack">
          <div class="tabs">
            <button
              v-for="(item, index) in bands"
              :key="item.label"
              class="pill"
              :class="{ active: circleBand === index }"
              @click="circleBand = index"
            >
              {{ item.label }}
            </button>
          </div>
          <div class="tabs">
            <button
              v-for="section in ['全部', '老师指导', '同学互助', '本周热帖']"
              :key="section"
              class="pill"
              :class="{ active: circleSection === section }"
              @click="circleSection = section"
            >
              {{ section }}
            </button>
          </div>
          <article v-for="item in posts" :key="item.id" class="m-post" @click="show('post', item)">
            <div class="row wrap">
              <span class="tag" v-if="item.pinned"><Icon name="Pin" :size="12" /> 置顶</span
              ><span class="tag blue">{{ item.tag }}</span
              ><span v-if="item.status === 'pending'" class="tag amber">待审核</span>
            </div>
            <button class="text-title" @click.stop="show('post', item)">{{ item.title }}</button>
            <p>{{ item.body }}</p>
            <div v-if="item.share" class="care-share">
              <img :src="item.share.image" alt="照护漫画" loading="lazy" />{{ item.share.title }}
            </div>
            <div class="row small muted">
              <span>{{ item.author }}</span
              ><button
                class="ghost"
                :aria-pressed="Boolean(item.liked)"
                @click.stop="act('like', { id: item.id })"
              >
                <Icon name="Heart" :size="15" />{{ item.likes }}</button
              ><span class="row"><Icon name="MessageCircle" :size="15" />{{ item.comments.length }}</span>
            </div>
          </article>
          <div v-if="!posts.length" class="empty">
            <Icon name="MessageCircle" :size="24" />这个分区还没有帖子
          </div>
        </div>
      </template>

      <template v-else-if="page === 'learn'">
        <div class="m-heading">
          <div>
            <p class="m-overline">0–36 月龄</p>
            <h1>知识学习</h1>
          </div>
        </div>
        <div class="paper panel stack">
          <div class="tabs">
            <button class="pill" :class="{ active: libraryBand === -1 }" @click="libraryBand = -1">
              全部月龄</button
            ><button
              v-for="(item, index) in bands"
              :key="item.label"
              class="pill"
              :class="{ active: libraryBand === index }"
              @click="libraryBand = index"
            >
              {{ item.label }}
            </button>
          </div>
          <div class="tabs">
            <button
              v-for="domain in ['全部', ...domains]"
              :key="domain"
              class="pill"
              :class="{ active: libraryDomain === domain }"
              @click="libraryDomain = domain"
            >
              {{ domain }}
            </button>
          </div>
          <div class="m-list-grid">
            <button v-for="item in library" :key="item.id" class="m-list-card" @click="viewKnowledge(item)">
              <span class="list-icon"><Icon name="BookOpen" :size="20" /></span
              ><span class="grow"
                ><span class="small muted">{{ bands[item.band].label }} · {{ item.domain }}</span
                ><strong>{{ item.title }}</strong
                ><small>{{ item.summary }}</small></span
              ><Icon name="ChevronRight" :size="16" />
            </button>
          </div>
          <div v-if="!library.length" class="empty">暂无符合条件的知识点</div>
        </div>
      </template>

      <template v-else-if="page === 'test'">
        <div class="m-heading">
          <div>
            <p class="m-overline">{{ school.classes[0] || school.name }}</p>
            <h1>案例测评</h1>
          </div>
          <button class="secondary" @click="show('wrong')">
            错题本 <span class="tag">{{ wrong.length }}</span>
          </button>
        </div>
        <section class="paper panel stack">
          <h2>教师发布的测评</h2>
          <button
            v-for="item in publishedExams"
            :key="item.id"
            class="m-list-card"
            @click="startExam(item)"
          >
            <span class="list-icon"><Icon name="ClipboardList" :size="20" /></span
            ><span class="grow"
              ><strong>{{ item.title }}</strong
              ><small>{{ item.ids.length }} 题 · 可作答</small></span
            ><span class="tag">开始测评</span>
          </button>
          <p v-if="!publishedExams.length" class="muted small">暂无可作答的测评。</p>
          <hr class="divider" />
          <h2>情景案例练习</h2>
          <div class="m-list-grid">
            <button
              v-for="item in questionBank"
              :key="item.id"
              class="m-list-card"
              @click="show('practice', item)"
            >
              <span class="list-icon"><Icon name="Sparkles" :size="18" /></span
              ><span class="grow"
                ><strong>{{ item.title }}</strong
                ><small>{{ item.domain }} · {{ bands[item.band].label }}</small></span
              ><Icon name="ChevronRight" :size="16" />
            </button>
          </div>
        </section>
        <section v-if="school.attempts.length" class="paper panel stack">
          <h2>历次成绩</h2>
          <div v-for="item in school.attempts" :key="item.id" class="row between">
            <span
              >{{ item.title }} <small class="muted">{{ item.date }}</small></span
            ><span class="tag">{{ item.correct }} / {{ item.total }} 题</span>
          </div>
        </section>
      </template>

      <template v-else>
        <div class="m-heading">
          <div>
            <p class="m-overline">我的学习与成长</p>
            <h1>{{ school.student }}</h1>
          </div>
          <a class="secondary" :href="desktopUrl">电脑端 <Icon name="ArrowUpRight" :size="15" /></a>
        </div>
        <div class="profile-grid">
          <section class="paper panel stack">
            <h2>我的班级</h2>
            <label v-if="!accountState" class="field"
              >学校<select v-model="schoolId">
                <option v-for="(item, id) in data.schools" :key="id" :value="id" :disabled="!item.enabled">
                  {{ item.name }}
                </option>
              </select></label
            >
            <p class="muted small">{{ school.classes[0] || '暂无班级' }} · {{ school.term }}</p>
            <button class="secondary" @click="show('scenarios')">
              <Icon name="Settings2" :size="16" /> 演示场景</button
            ><button class="ghost" @click="show('reset')">演示首次领养</button>
          </section>
          <section class="paper panel stack">
            <div class="tabs">
              <button
                v-for="label in ['照护记录', '成长档案', '我的收藏', '成就徽章']"
                :key="label"
                class="pill"
                :class="{ active: myTab === label }"
                @click="myTab = label"
              >
                {{ label }}
              </button>
            </div>
            <Timeline v-if="myTab === '照护记录'" :items="school.logs" /><template
              v-else-if="myTab === '成长档案'"
              ><div class="row between">
                <h2>成长曲线</h2>
                <div class="row">
                  <button
                    v-for="name in ['身高', '体重']"
                    :key="name"
                    class="pill"
                    :class="{ active: growthMetric === name }"
                    @click="growthMetric = name"
                  >
                    {{ name }}
                  </button>
                </div>
              </div>
              <Trend
                :labels="['4 月', '5 月', '6 月', '7 月', '8 月']"
                :lines="growthData"
                :min="growthMetric === '身高' ? 56 : 4"
                :max="growthMetric === '身高' ? 76 : 10"
              />
              <p class="muted small">曲线为原型示意数据。</p>
              <div class="row wrap">
                <span
                  v-for="milestone in ['身体发育', '大动作', '精细动作', '语言', '认知社交']"
                  :key="milestone"
                  class="tag"
                  >{{ milestone }}</span
                >
              </div></template
            ><template v-else-if="myTab === '我的收藏'"
              ><button
                v-for="item in library.filter((item) => school.favorites.includes(item.id))"
                :key="item.id"
                class="choice"
                @click="viewKnowledge(item)"
              >
                {{ item.title }}
              </button>
              <div v-if="!school.favorites.length" class="empty">还没有收藏的知识点</div></template
            >
            <div v-else class="row wrap">
              <span class="achievement"><Icon name="Trophy" /> 初次照护</span
              ><span class="achievement"><Icon name="Sprout" /> 成长见证</span
              ><span v-if="school.attempts.length" class="achievement"
                ><Icon name="GraduationCap" /> 实训新星</span
              >
            </div>
          </section>
        </div>
      </template>
    </main>

    <nav class="mobile-tabs" aria-label="学生导航">
      <button v-for="[id, label, icon] in tabs" :key="id" :class="{ active: page === id }" @click="go(id)">
        <Icon :name="icon" :size="21" /><span>{{ label }}</span>
      </button>
    </nav>

    <Teleport to="body"
      ><div v-if="modal" class="scrim mobile-scrim" @click.self="close" @keydown.esc="close">
        <section class="modal stack" role="dialog" aria-modal="true" aria-label="学生操作">
          <div class="row between">
            <h2>
              {{
                {
                  care: selected?.name,
                  event: selected?.title,
                  scenarios: '演示场景',
                  accelerate: '使用成长加速卡',
                  adopt: '确认起始月龄',
                  reset: '演示首次领养',
                  compose: '发布帖子',
                  post: activePost?.title,
                  knowledge: selected?.title,
                  practice: selected?.title,
                  exam: exam?.title,
                  wrong: '错题本',
                }[modal]
              }}
            </h2>
            <button class="icon-button" aria-label="关闭" @click="close">
              <Icon name="X" :size="17" />
            </button>
          </div>
          <template v-if="modal === 'care'"
            ><div class="note">{{ bands[band].label }} · {{ selected.steps[band] }}</div>
            <p class="muted">完成后更新宝宝状态，并写入照护记录。</p>
            <button class="primary" @click="perform(selected)">完成照护</button></template
          >
          <template v-else-if="modal === 'event' || modal === 'practice'"
            ><div v-if="modal === 'event' && baby" class="event-art">
              <img
                :src="
                  portrait({
                    ...baby,
                    event:
                      selected.title === events.cry.title
                        ? 'cry'
                        : selected.title === events.sleepy.title
                          ? 'sleepy'
                          : null,
                  })
                "
                alt="宝宝事件漫画"
              />
            </div>
            <p>{{ selected.body }}</p>
            <button
              v-for="(item, index) in selected.options"
              :key="item"
              class="choice"
              :class="{ active: option === index }"
              :disabled="result !== null"
              @click="option = index"
            >
              <span class="key">{{ 'ABC'[index] }}</span
              >{{ item }}
            </button>
            <div v-if="result" class="note" :class="{ warn: !result.correct }">
              <strong>{{ result.correct ? '判断正确' : '再想一想' }}</strong>
              <p>{{ result.reason }}</p>
            </div>
            <button v-if="result" class="primary" @click="close">完成</button
            ><button
              v-else
              class="primary"
              :disabled="option === null"
              @click="
                modal === 'event'
                  ? answerEvent()
                  : (result = { correct: option === selected.correct, reason: selected.reason })
              "
            >
              提交判断
            </button></template
          >
          <template v-else-if="modal === 'scenarios'"
            ><div class="scenario-grid">
              <button
                v-for="item in [
                  [2, '初生'],
                  [8, '探索'],
                  [24, '两岁'],
                ]"
                :key="item[0]"
                class="scenario"
                @click="scenario(item[0], null)"
              >
                <img :src="portrait(freshBaby(item[0]))" alt="" /><b>{{ item[0] }} 月龄</b
                ><small>{{ item[1] }}</small></button
              ><button
                v-for="[key, label] in [
                  ['cry', '宝宝哭闹'],
                  ['sleepy', '宝宝犯困'],
                ]"
                :key="key"
                class="scenario"
                @click="scenario(8, key)"
              >
                <img :src="portrait({ age: 8, event: key })" alt="" /><b>{{ label }}</b
                ><small>8 月龄情景</small>
              </button>
            </div></template
          >
          <template v-else-if="modal === 'accelerate'"
            ><p>{{ baby.age }} 月龄 → {{ baby.age + 1 }} 月龄</p>
            <p class="muted">消耗 1 张成长加速卡，当前剩余 {{ baby.cards }} 张。</p>
            <button class="primary" @click="accelerate">使用加速卡</button></template
          >
          <template v-else-if="modal === 'adopt'"
            ><p>
              为 {{ nickname }} 选择 <b>{{ startAge }} 月龄</b>作为起点。确认后起始月龄不可修改。
            </p>
            <button class="primary" @click="adopt">领养宝宝</button></template
          >
          <template v-else-if="modal === 'reset'"
            ><p>清空当前演示宝宝和照护日志，重新体验领养。</p>
            <button class="primary" @click="resetDemo">进入领养演示</button></template
          >
          <form v-else-if="modal === 'compose'" class="stack" @submit.prevent="createPost">
            <label class="field">标题<input v-model="postTitle" required maxlength="42" /></label
            ><label class="field"
              >内容<textarea v-model="postBody" required maxlength="400"></textarea></label
            ><label class="field"
              >标签<select v-model="postTag">
                <option>照护求助</option>
                <option>成长分享</option>
                <option>学习交流</option>
              </select></label
            ><label class="field"
              >关联照护记录<select v-model="shareLog">
                <option value="">不关联</option>
                <option v-for="item in school.logs" :key="item.id" :value="item.id">
                  {{ item.title }}
                </option>
              </select></label
            ><button class="primary" :disabled="!postTitle.trim() || !postBody.trim()">提交帖子</button>
          </form>
          <template v-else-if="modal === 'post' && activePost"
            ><p class="muted small">{{ activePost.author }} · {{ activePost.tag }}</p>
            <p>{{ activePost.body }}</p>
            <div v-if="activePost.share" class="care-share">
              <img :src="activePost.share.image" alt="照护漫画" />{{ activePost.share.title }}
            </div>
            <div v-for="item in activePost.comments" :key="item.id" class="note">
              <div class="row between">
                <strong>{{ item.author }}</strong
                ><span v-if="activePost.best === item.id" class="tag">最佳回答</span>
              </div>
              <p>{{ item.text }}</p>
              <button
                v-if="activePost.author === school.student && activePost.best !== item.id"
                class="ghost"
                @click="act('best', { id: activePost.id, comment: item.id })"
              >
                设为最佳
              </button>
            </div>
            <form v-if="activePost.status === 'published'" class="row" @submit.prevent="addComment">
              <label class="field grow inline-input"
                ><input
                  v-model="comment"
                  maxlength="150"
                  aria-label="评论"
                  placeholder="说说你的理解" /></label
              ><button class="primary" :disabled="!comment.trim()">评论</button>
            </form></template
          >
          <template v-else-if="modal === 'knowledge'"
            ><p class="muted">{{ selected.summary }}</p>
            <div v-if="selected.marker" class="note stack">
              <p><strong>发育指标</strong>　{{ selected.marker }}</p>
              <p><strong>观察与预警</strong>　{{ selected.caution }}</p>
              <p><strong>促进方案</strong>　{{ selected.plan }}</p>
            </div>
            <label class="field"
              >我的笔记<textarea v-model="notes" maxlength="300" placeholder="记下观察和想法"></textarea>
            </label>
            <div class="row wrap">
              <button class="secondary" @click="act('favorite', { id: selected.id })">
                <Icon name="Bookmark" :size="16" />{{
                  school.favorites.includes(selected.id) ? '已收藏' : '收藏'
                }}</button
              ><button class="secondary" @click="saveNote">保存笔记</button
              ><button v-if="selected.action && baby" class="primary" @click="linkedCare">
                去照护练习
              </button>
            </div></template
          >
          <template v-else-if="modal === 'exam' && examQuestion"
            ><div v-if="result" class="note">
              <strong>答对 {{ result.correct }} / {{ result.total }} 题</strong>
              <p>成绩已同步到学习档案，答错题目已记入错题本。</p>
            </div>
            <template v-else
              ><p class="small muted">
                第 {{ examIndex + 1 }} / {{ exam.questions.length }} 题 · {{ examQuestion.domain }}
              </p>
              <p>{{ examQuestion.body }}</p>
              <button
                v-for="(item, index) in examQuestion.options"
                :key="item"
                class="choice"
                :class="{ active: examAnswers[examQuestion.id] === index }"
                @click="examAnswers[examQuestion.id] = index"
              >
                <span class="key">{{ 'ABC'[index] }}</span
                >{{ item }}
              </button></template
            ><button v-if="result" class="primary" @click="close">查看成绩</button
            ><button
              v-else
              class="primary"
              :disabled="examAnswers[examQuestion.id] === undefined"
              @click="examIndex === exam.questions.length - 1 ? submitExam() : examIndex++"
            >
              {{ examIndex === exam.questions.length - 1 ? '确认交卷' : '下一题' }}
            </button></template
          >
          <template v-else-if="modal === 'wrong'"
            ><div v-for="(item, index) in wrong" :key="`${item.id}-${index}`" class="note">
              <strong>{{ item.title }}</strong>
              <p>{{ item.reason }}</p>
            </div>
            <div v-if="!wrong.length" class="empty">暂无错题</div></template
          >
        </section>
      </div>
      <div v-if="toast" class="toast" role="status">{{ toast }}</div></Teleport
    >
  </div>
</template>
