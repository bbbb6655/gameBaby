<script setup>
import { computed, ref, watch } from 'vue'
import Icon from './Icon.vue'
import StateCards from './StateCards.vue'
import Timeline from './Timeline.vue'
import Trend from './Trend.vue'
import { ageLabel, bands, cases, domains, events, knowledge, policyFor, portrait } from './model.js'
import { createStore } from './store.js'

const props = defineProps({ accountState: Object, demoRole: String, demoAccount: String })
const { data, dispatch } = createStore(props.accountState, props.demoAccount)
const roles = { teacher: '教师', school: '学校管理员', platform: '平台管理员', student: '学生' }
const menu = {
  teacher: [
    ['overview', '教学概览', 'LayoutGrid'],
    ['students', '学生档案', 'Users'],
    ['classes', '班级与领养', 'School'],
    ['community', '社区管理', 'MessageCircle'],
    ['resources', '教学资源', 'BookOpen'],
    ['exams', '测评管理', 'ClipboardList'],
  ],
  school: [
    ['overview', '学校概览', 'LayoutGrid'],
    ['classes', '师生与班级', 'School'],
    ['students', '学生档案', 'Users'],
    ['community', '社区管理', 'MessageCircle'],
    ['resources', '教学资源', 'BookOpen'],
    ['exams', '测评管理', 'ClipboardList'],
    ['settings', '教学设置', 'Settings2'],
  ],
  platform: [
    ['sites', '站点管理', 'Building2'],
    ['resources', '公共教学资源', 'BookOpen'],
  ],
  student: [
    ['learning', '我的学习', 'BookOpenCheck'],
    ['baby', '我的宝宝', 'Baby'],
  ],
}
const initialRole = location.hash.slice(1)
const role = ref(
  props.accountState
    ? 'student'
    : props.demoRole || (Object.hasOwn(roles, initialRole) ? initialRole : 'teacher'),
)
const requestedSchool = new URLSearchParams(location.search).get('school')
const schoolId = ref(Object.hasOwn(data.value.schools, requestedSchool) ? requestedSchool : 'a')
const school = computed(() => data.value.schools[schoolId.value] || data.value.schools.a)
const classPolicy = computed(() => policyFor(school.value))
const siteEntries = computed(() => Object.entries(data.value.schools))
const accountName = computed(
  () =>
    ({
      teacher: school.value.teacher,
      school: school.value.admin,
      platform: '平台运营',
      student: school.value.student,
    })[role.value],
)
const classFilter = ref('全部班级')
const page = ref(menu[role.value][0][0])
const sidebar = ref(false)
const pageTitle = computed(
  () => menu[role.value].find((item) => item[0] === page.value)?.[1] || '教学工作台',
)
function route(id) {
  page.value = id
  sidebar.value = false
  window.scrollTo({ top: 0 })
}
watch(role, (value) => {
  location.hash = value
  classFilter.value = '全部班级'
  route(menu[value][0][0])
})
watch(schoolId, () => {
  classFilter.value = '全部班级'
  search.value = ''
  detail.value = null
})
watch(page, () => {
  search.value = ''
  detail.value = null
})
const act = (type, fields = {}, tenant = schoolId.value) => dispatch({ type, school: tenant, ...fields })
const mobileUrl = computed(() => {
  const url = new URL('/', location.href)
  if (location.port === '82') url.port = '81'
  url.searchParams.set('school', schoolId.value)
  return url.href
})

const toast = ref('')
let timer
function notify(text) {
  toast.value = text
  clearTimeout(timer)
  timer = setTimeout(() => {
    toast.value = ''
  }, 2400)
}
function save(type, fields, text = '已保存') {
  act(type, fields)
  modal.value = ''
  notify(text)
}
function enterSchool(id) {
  schoolId.value = id
  role.value = 'school'
}
const search = ref('')
const detail = ref(null)
const rows = computed(() => {
  const current = school.value
  if (!current.classes.length) return []
  const entries = [
    {
      id: 'self',
      name: current.student,
      numbered: '20260101',
      class: current.classes[0],
      age: current.baby?.age,
      health: current.baby?.state.health,
      alert: '正常',
      last: '今天',
      logs: current.logs.length,
    },
    ...current.peers.map((name, i) => ({
      id: `peer-${i}`,
      name,
      numbered: `2026010${i + 2}`,
      class: current.classes[i === 0 ? 0 : i % current.classes.length],
      age: (schoolId.value === 'b' ? 23 : 7) + i * 2,
      health: [55, 82, 92][i],
      alert: ['健康值偏低', '3 天未登录', '社区零互动'][i],
      last: ['昨天', '3 天前', '今天'][i],
      logs: [3, 1, 6][i],
    })),
  ]
  return entries.filter(
    (item) =>
      (classFilter.value === '全部班级' || item.class === classFilter.value) &&
      (!search.value || `${item.name}${item.numbered}${item.alert}`.includes(search.value.trim())),
  )
})
const alerts = computed(() => rows.value.filter((item) => item.alert !== '正常'))
const bandBars = computed(() =>
  schoolId.value === 'a'
    ? [12, 18, 36, 27, 16, 10, 8]
    : schoolId.value === 'b'
      ? [7, 13, 15, 12, 20, 32, 18]
      : [0, 0, 0, 0, 0, 0, 0],
)
const trendLines = computed(() => {
  const series =
    schoolId.value === 'a'
      ? [46, 62, 55, 77, 69, 88, 86]
      : schoolId.value === 'b'
        ? [27, 53, 39, 63, 52, 72, 67]
        : [0, 0, 0, 0, 0, 0, 0]
  const filtered = classFilter.value !== '全部班级'
  return [
    {
      name: '学生活跃',
      color: '#33815c',
      values: series.map((n) => (filtered ? Math.round(n * 0.42) : n)),
    },
    {
      name: '社区互动',
      color: '#cf9b4e',
      values: series.map((n, i) => Math.round(n * (filtered ? 0.21 : 0.5) + (n ? i : 0))),
    },
  ]
})
const cards = computed(() => {
  const demo =
    schoolId.value === 'a' ? [128, 86, 214, 37] : schoolId.value === 'b' ? [96, 67, 159, 23] : [0, 0, 0, 0]
  const base = classFilter.value === '全部班级' ? demo : demo.map((n) => Math.round(n * 0.38))
  return [
    ['学生人数', base[0], 'Users', 'mint'],
    ['今日活跃', base[1], 'Activity', 'sky'],
    ['本周照护', base[2] + Math.max(0, school.value.logs.length - 2), 'HeartPulse', 'peach'],
    [
      '本周发帖',
      base[3] + Math.max(0, school.value.posts.filter((p) => p.status === 'published').length - 2),
      'MessageCircle',
      'gold',
    ],
  ]
})
const communityBars = computed(() =>
  school.value.classes
    .map((name, index) => ({ name, count: (schoolId.value === 'b' ? 17 : 22) - index * 4 }))
    .slice(0, 5),
)
const schoolExams = computed(() => school.value.exams)
const questions = computed(() => [...cases, ...(school.value.questions || [])])
const libraryTab = ref('知识点')
const resourceKinds = ['知识点', '固定事件', '随机事件', '里程碑', '徽章', '案例题库']
const resources = computed(() => {
  if (libraryTab.value === '固定事件') return [events.milestone]
  if (libraryTab.value === '随机事件') return [events.cry, events.sleepy]
  if (libraryTab.value === '案例题库') return role.value === 'platform' ? cases : questions.value
  if (libraryTab.value === '里程碑')
    return ['身体发育', '大动作', '精细动作', '语言', '认知社交'].map((title) => ({
      title,
      summary: '按阶段记录宝宝的新能力',
    }))
  if (libraryTab.value === '徽章')
    return ['初次照护', '成长见证', '实训新星'].map((title) => ({
      title,
      summary: '完成相应实训活动后获得',
    }))
  return role.value === 'platform' ? knowledge : [...school.value.resources, ...knowledge]
})
const communityTab = ref('待审核'),
  communityBand = ref(-1)
const reviewPosts = computed(() =>
  school.value.posts.filter(
    (item) =>
      (communityBand.value === -1 || item.band === communityBand.value) &&
      (communityTab.value === '待审核' ? item.status === 'pending' : item.status === 'published'),
  ),
)
const keywords = computed(() => {
  const candidates = ['照护', '记录', '宝宝', '困倦', '揉眼睛', '用词', '玩具', '互动']
  const text = school.value.posts
    .filter((item) => item.status === 'published')
    .map((item) => `${item.title} ${item.body}`)
    .join(' ')
  return candidates
    .map((word) => [word, text.split(word).length - 1])
    .filter(([, count]) => count)
    .sort((a, b) => b[1] - a[1])
})
const growthMetric = ref('身高')
const growthSeries = computed(() => {
  const isHeight = growthMetric.value === '身高'
  const end =
    school.value.baby?.age >= 19
      ? isHeight
        ? 87
        : 12
      : school.value.baby?.age <= 3
        ? isHeight
          ? 56
          : 5.5
        : isHeight
          ? 72
          : 8.5
  const step = isHeight ? 2 : 0.4
  return {
    labels: ['记录 1', '记录 2', '记录 3', '记录 4', '当前'],
    min: Math.floor(end - step * 5),
    max: Math.ceil(end + step * 2),
    lines: [
      {
        name: '宝宝模拟',
        color: '#34825a',
        values: Array.from({ length: 5 }, (_, i) => end - (4 - i) * step),
      },
      {
        name: '参考示意',
        color: '#c79b57',
        values: Array.from({ length: 5 }, (_, i) => end - (3.6 - i) * step),
      },
    ],
  }
})
const wrong = computed(() =>
  school.value.attempts.flatMap((item) => item.answers.filter((answer) => !answer.correct)),
)
const domainStats = computed(() =>
  domains.map((name) => {
    const answers = school.value.attempts
      .flatMap((item) => item.answers)
      .filter((answer) => answer.domain === name)
    return {
      name,
      total: answers.length,
      rate: answers.length
        ? Math.round((answers.filter((item) => item.correct).length * 100) / answers.length)
        : 0,
    }
  }),
)
const modal = ref(''),
  form = ref({})
function open(kind, values) {
  form.value = values || {}
  modal.value = kind
}
function close() {
  modal.value = ''
}
function submitSite() {
  const { id, name, code, admin, enabled } = form.value
  if (siteEntries.value.some(([key, item]) => key !== id && item.code === code.trim().toUpperCase())) {
    notify('站点编号已存在')
    return
  }
  if (id) {
    act(
      'site-edit',
      { values: { name: name.trim(), code: code.trim().toUpperCase(), admin: admin.trim(), enabled } },
      id,
    )
    close()
    notify('站点已更新')
  } else save('site-create', { name: name.trim(), code, admin: admin.trim() }, '站点已开通')
}
function submitPolicy() {
  const { mode, min, max, locked, className } = form.value
  if (min > max) {
    notify('起始范围的最小值不能高于最大值')
    return
  }
  save('policy', { className, value: { mode, min, max, locked } }, '领养规则已更新')
}
function submitGuidance() {
  const { band, title, body, pinned } = form.value
  save(
    'post',
    {
      band,
      title: title.trim(),
      body: body.trim(),
      tag: '阶段指导',
      section: '老师指导',
      author: accountName.value,
      pinned,
      teacher: true,
    },
    '指导帖已发布',
  )
  communityTab.value = '已发布'
  communityBand.value = band
}
function submitQuestion() {
  const { title, body, reason, band, domain, optionA, optionB, optionC, correct } = form.value
  if (![title, body, reason, optionA, optionB, optionC].every((value) => value.trim())) return
  save(
    'question',
    { question: { title, body, reason, band, domain, options: [optionA, optionB, optionC], correct } },
    '案例已添加',
  )
}
function exportCsv() {
  const csv = [
    ['学生', '学号', '班级', '宝宝月龄', '健康值', '照护记录', '预警'],
    ...rows.value.map((item) => [
      item.name,
      item.numbered,
      item.class,
      item.age ?? '',
      item.health ?? '',
      item.logs,
      item.alert,
    ]),
  ]
    .map((row) => row.map((value) => `"${String(value).replaceAll('"', '""')}"`).join(','))
    .join('\r\n')
  const url = URL.createObjectURL(new Blob(['\ufeff', csv], { type: 'text/csv;charset=utf-8' }))
  const link = document.createElement('a')
  link.href = url
  link.download = `${school.value.code}-学情.csv`
  link.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
  notify('已导出 Excel 可打开的 CSV')
}
</script>

<template>
  <div class="desk-shell" :class="{ 'sidebar-open': sidebar }">
    <aside class="desk-side">
      <button class="brand side-brand" @click="route(menu[role][0][0])">
        <span class="brand-mark"><Icon name="Sprout" :size="23" /></span
        ><span><strong>养崽日记</strong><small>婴幼儿照护实训</small></span>
      </button>
      <div class="side-tenant">
        <Icon :name="role === 'platform' ? 'Globe2' : 'School'" :size="19" />
        <div>
          <b>{{ role === 'platform' ? '平台管理' : school.name }}</b
          ><small>{{ role === 'platform' ? '学校站点与公共资源' : school.term }}</small>
        </div>
      </div>
      <nav class="side-nav" aria-label="工作台">
        <button
          v-for="[id, name, icon] in menu[role]"
          :key="id"
          :class="{ active: page === id }"
          @click="route(id)"
        >
          <Icon :name="icon" :size="19" /> {{ name }}
        </button>
      </nav>
      <div class="side-footer">
        <span class="side-avatar">{{ accountName.slice(0, 1) }}</span>
        <div>
          <strong>{{ accountName }}</strong
          ><small>{{ roles[role] }}</small>
        </div>
      </div>
    </aside>
    <div class="desk-content">
      <header class="desk-header">
        <div class="row">
          <button class="icon-button side-toggle" aria-label="显示工作台导航" @click="sidebar = !sidebar">
            <Icon name="PanelLeft" :size="18" /></button
          ><span class="top-location"
            >{{ role === 'student' ? '学生空间' : '教学工作台' }} <Icon name="ChevronRight" :size="14" />
            <b>{{ pageTitle }}</b></span
          >
        </div>
        <div class="top-controls">
          <span class="tag preview-label">{{ accountState ? '学生空间' : '教学演示' }}</span
          ><select
            v-if="!accountState && role !== 'platform'"
            v-model="schoolId"
            class="select"
            aria-label="切换演示学校"
          >
            <option v-for="[id, item] in siteEntries" :key="id" :value="id" :disabled="!item.enabled">
              {{ item.name }}
            </option></select
          ><select
            v-if="!accountState && !demoRole"
            v-model="role"
            class="select"
            aria-label="切换演示角色"
          >
            <option v-for="(label, key) in roles" :key="key" :value="key">{{ label }}</option>
          </select>
        </div>
      </header>
      <main class="desk-main">
        <div class="desk-heading">
          <div>
            <p class="desk-overline">
              {{ role === 'platform' ? '平台管理' : school.name + ' / ' + school.term }}
            </p>
            <h1>{{ pageTitle }}</h1>
          </div>
          <div class="row wrap">
            <select
              v-if="['overview', 'students'].includes(page)"
              v-model="classFilter"
              class="select"
              aria-label="筛选班级"
            >
              <option>全部班级</option>
              <option v-for="name in school.classes" :key="name">{{ name }}</option></select
            ><button v-if="['overview', 'students'].includes(page)" class="secondary" @click="exportCsv">
              <Icon name="Download" :size="16" /> 导出数据</button
            ><a v-if="role === 'student'" class="secondary" :href="mobileUrl"
              >打开手机端 <Icon name="ArrowUpRight" :size="16" /></a
            ><button
              v-if="page === 'sites'"
              class="primary"
              @click="open('site', { name: '', code: '', admin: '', enabled: true })"
            >
              <Icon name="Plus" :size="17" /> 开通学校
            </button>
          </div>
        </div>

        <template v-if="page === 'overview'">
          <div class="stats-grid">
            <article v-for="[name, value, icon, tone] in cards" :key="name" class="paper stat">
              <span :class="['stat-icon', tone]"><Icon :name="icon" :size="21" /></span>
              <div>
                <p>{{ name }}</p>
                <strong>{{ value }}</strong>
              </div>
            </article>
          </div>
          <div class="desk-split">
            <section class="paper panel">
              <div class="section-title">
                <h2>学习活跃趋势</h2>
                <span class="tag">近 7 天</span>
              </div>
              <Trend
                :labels="['周一', '周二', '周三', '周四', '周五', '周六', '周日']"
                :lines="trendLines"
              />
            </section>
            <section class="paper panel">
              <div class="section-title">
                <h2>月龄分布</h2>
                <span class="muted small">学生人数</span>
              </div>
              <div class="vertical-bars">
                <div v-for="(band, index) in bands" :key="band.label" class="vertical-bar">
                  <b>{{ bandBars[index] }}</b
                  ><i :style="{ height: `${bandBars[index] * 2.8 + 2}px` }"></i
                  ><small>{{ band.label }}</small>
                </div>
              </div>
            </section>
          </div>
          <div class="desk-split">
            <section class="paper panel">
              <div class="section-title">
                <h2>
                  学生预警 <span class="tag amber">{{ alerts.length }}</span>
                </h2>
                <button class="ghost" @click="route('students')">打开学生档案</button>
              </div>
              <div class="table-scroll">
                <table>
                  <thead>
                    <tr>
                      <th>学生</th>
                      <th>班级</th>
                      <th>预警</th>
                      <th>操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="item in alerts" :key="item.id">
                      <td>{{ item.name }}</td>
                      <td>{{ item.class }}</td>
                      <td>
                        <span class="tag amber">{{ item.alert }}</span>
                      </td>
                      <td><button class="table-link" @click="open('peer', item)">详情</button></td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <p v-if="!alerts.length" class="empty">当前范围没有预警</p>
            </section>
            <section class="paper panel">
              <div class="section-title">
                <h2>班级社区热度</h2>
                <span class="muted small">互动量</span>
              </div>
              <div class="horizontal-bars">
                <div v-for="item in communityBars" :key="item.name">
                  <span>{{ item.name }}</span
                  ><i><b :style="{ width: `${item.count * 4}%` }"></b></i><strong>{{ item.count }}</strong>
                </div>
              </div>
            </section>
          </div>
        </template>

        <template v-else-if="page === 'students'">
          <section class="paper panel">
            <div class="section-title">
              <h2>学生清单</h2>
              <label class="search"
                ><Icon name="Search" :size="17" /><input
                  v-model="search"
                  placeholder="姓名、学号或预警"
                  aria-label="搜索学生"
              /></label>
            </div>
            <div class="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>学生</th>
                    <th>班级</th>
                    <th>宝宝月龄</th>
                    <th>健康</th>
                    <th>最近活跃</th>
                    <th>状态</th>
                    <th>档案</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="item in rows" :key="item.id">
                    <td>
                      <b>{{ item.name }}</b
                      ><small>{{ item.numbered }}</small>
                    </td>
                    <td>{{ item.class }}</td>
                    <td>{{ item.age ?? '待领养' }}</td>
                    <td>{{ item.health ?? '—' }}</td>
                    <td>{{ item.last }}</td>
                    <td>
                      <span class="tag" :class="{ amber: item.alert !== '正常' }">{{ item.alert }}</span>
                    </td>
                    <td>
                      <button
                        class="table-link"
                        @click="item.id === 'self' ? (detail = item) : open('peer', item)"
                      >
                        查看
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p v-if="!rows.length" class="empty">暂无匹配的学生</p>
          </section>
          <template v-if="detail"
            ><div class="desk-split equal">
              <section class="paper panel">
                <div class="section-title">
                  <h2>{{ detail.name }} · 照护日志</h2>
                  <button class="ghost" @click="detail = null">收起</button>
                </div>
                <Timeline :items="school.logs" />
              </section>
              <section class="paper panel stack">
                <h2>个人表现</h2>
                <div class="row wrap">
                  <span class="tag">照护 {{ school.logs.filter((x) => x.kind === 'care').length }} 次</span
                  ><span class="tag"
                    >随机事件
                    {{ school.logs.filter((x) => x.kind === 'event' && x.detail.includes('正确')).length }}
                    / {{ school.logs.filter((x) => x.kind === 'event').length }}</span
                  ><span class="tag"
                    >社区发帖 {{ school.posts.filter((x) => x.author === school.student).length }} 条</span
                  ><span class="tag"
                    >已得赞
                    {{
                      school.posts
                        .filter((x) => x.author === school.student)
                        .reduce((n, x) => n + x.likes, 0)
                    }}</span
                  >
                </div>
                <div class="domain-grid">
                  <div v-for="item in domainStats" :key="item.name" :class="{ known: item.total }">
                    <small>{{ item.name }}</small
                    ><b>{{ item.total ? item.rate + '%' : '—' }}</b>
                  </div>
                </div>
                <strong>历次测评</strong>
                <div v-for="attempt in school.attempts" :key="attempt.id" class="row between">
                  <span>{{ attempt.title }}</span
                  ><span class="tag">{{ attempt.correct }}/{{ attempt.total }}</span>
                </div>
                <span v-if="!school.attempts.length" class="muted small">暂无成绩</span>
                <div class="row wrap">
                  <span class="tag amber"><Icon name="Trophy" :size="14" /> 初次照护</span
                  ><span class="tag amber">成长见证</span>
                </div>
              </section>
            </div>
            <section v-if="school.baby" class="paper panel">
              <div class="section-title">
                <h2>宝宝成长曲线</h2>
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
              <Trend v-bind="growthSeries" /></section
          ></template>
        </template>

        <template v-else-if="page === 'classes'"
          ><div class="desk-split equal">
            <section class="paper panel stack">
              <div class="section-title">
                <h2>学期与班级</h2>
                <button
                  v-if="role === 'school'"
                  class="secondary"
                  @click="open('term', { name: school.term })"
                >
                  <Icon name="CalendarDays" :size="16" /> 编辑学期
                </button>
              </div>
              <p class="muted">{{ school.term }}</p>
              <div v-for="name in school.classes" :key="name" class="manageable">
                <div class="row">
                  <span class="list-icon"><Icon name="School" :size="17" /></span><b>{{ name }}</b>
                </div>
                <button
                  class="table-link"
                  @click="open('policy', { ...policyFor(school, name), className: name })"
                >
                  领养规则
                </button>
              </div>
              <button v-if="role === 'school'" class="primary" @click="open('class', { name: '' })">
                <Icon name="Plus" :size="16" /> 新建班级
              </button>
            </section>
            <section v-if="role === 'school'" class="paper panel stack">
              <div class="section-title">
                <h2>教师</h2>
                <button class="secondary" @click="open('teacher', { name: '' })">
                  <Icon name="Plus" :size="16" /> 添加教师
                </button>
              </div>
              <div v-for="name in school.teachers" :key="name" class="manageable">
                <span class="row"
                  ><span class="list-icon"><Icon name="GraduationCap" :size="18" /></span
                  ><b>{{ name }}</b></span
                ><span class="tag">教师</span>
              </div>
            </section>
            <section v-else class="paper panel stack">
              <h2>当前领养规则</h2>
              <span class="tag">{{
                { free: '自由选择', range: '限定区间', locked: '全班锁定' }[classPolicy.mode]
              }}</span>
              <p class="muted">
                {{
                  classPolicy.mode === 'locked'
                    ? `${classPolicy.locked} 月龄`
                    : `${classPolicy.min}–${classPolicy.max} 月龄`
                }}
              </p>
              <p class="muted small">学生端会根据本校演示班的规则显示可选月龄。</p>
            </section>
          </div></template
        >

        <template v-else-if="page === 'community'"
          ><div class="desk-split">
            <section class="paper panel stack">
              <div class="section-title">
                <h2>圈子内容</h2>
                <button class="primary" @click="open('guidance', { band: 2, pinned: true })">
                  <Icon name="Plus" :size="16" /> 指导帖
                </button>
              </div>
              <div class="tabs">
                <button
                  v-for="name in ['待审核', '已发布']"
                  :key="name"
                  class="pill"
                  :class="{ active: communityTab === name }"
                  @click="communityTab = name"
                >
                  {{ name }}
                </button>
              </div>
              <select v-model.number="communityBand" class="select" aria-label="帖子月龄">
                <option :value="-1">全部月龄</option>
                <option v-for="(band, index) in bands" :key="band.label" :value="index">
                  {{ band.label }}
                </option>
              </select>
              <article v-for="post in reviewPosts" :key="post.id" class="review-post">
                <div class="row wrap">
                  <span class="tag blue">{{ bands[post.band].label }}</span
                  ><span v-if="post.pinned" class="tag">置顶</span
                  ><span v-if="post.featured" class="tag amber">精华</span
                  ><span class="muted small">{{ post.author }}</span>
                </div>
                <h3>{{ post.title }}</h3>
                <p class="muted small">{{ post.body }}</p>
                <div class="row wrap">
                  <button
                    v-if="post.status === 'pending'"
                    class="secondary"
                    @click="save('moderate', { id: post.id, values: { status: 'published' } }, '审核通过')"
                  >
                    通过审核</button
                  ><button
                    v-if="post.status === 'published'"
                    class="ghost"
                    @click="act('moderate', { id: post.id, values: { featured: !post.featured } })"
                  >
                    {{ post.featured ? '取消加精' : '加精' }}</button
                  ><button
                    v-if="post.status === 'published'"
                    class="ghost"
                    :disabled="post.collected"
                    @click="save('collect', { id: post.id }, '已收录为知识草稿')"
                  >
                    {{ post.collected ? '已收录' : '收录知识库' }}</button
                  ><button class="ghost danger" @click="open('remove', post)">删除</button>
                </div>
              </article>
              <p v-if="!reviewPosts.length" class="empty">该分区暂无帖子</p>
            </section>
            <div class="stack">
              <section class="paper panel stack">
                <h2>高频提问</h2>
                <div class="keywords">
                  <span
                    v-for="[word, count] in keywords"
                    :key="word"
                    :style="{ fontSize: `${Math.min(24, 12 + count * 2)}px` }"
                    >{{ word }}</span
                  >
                </div>
                <p v-if="!keywords.length" class="muted small">暂无公开话题。</p>
              </section>
              <section class="paper panel stack">
                <div class="section-title">
                  <h2>阶段 FAQ</h2>
                  <button class="ghost" @click="open('faq', { text: school.faqs.join('\n') })">
                    批量编辑
                  </button>
                </div>
                <p v-for="name in school.faqs" :key="name" class="note">{{ name }}</p>
              </section>
            </div>
          </div></template
        >

        <template v-else-if="page === 'resources'"
          ><section class="paper panel stack">
            <div class="section-title">
              <h2>{{ role === 'platform' ? '平台预装资源' : '学校与公共资源' }}</h2>
              <button
                v-if="role !== 'platform' && libraryTab === '知识点'"
                class="primary"
                @click="open('resource', { band: 2, domain: '认知' })"
              >
                <Icon name="Plus" :size="16" /> 新增知识素材
              </button>
            </div>
            <div class="tabs">
              <button
                v-for="name in resourceKinds"
                :key="name"
                class="pill"
                :class="{ active: libraryTab === name }"
                @click="libraryTab = name"
              >
                {{ name }}
              </button>
            </div>
            <div class="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>名称</th>
                    <th>说明</th>
                    <th>范围</th>
                    <th>状态</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="item in resources" :key="item.id || item.title">
                    <td>
                      <b>{{ item.title }}</b>
                    </td>
                    <td>{{ item.summary || item.body }}</td>
                    <td>
                      {{ item.band === undefined ? '阶段适用' : bands[item.band].label }}
                      <small>{{ item.domain }}</small>
                    </td>
                    <td>
                      <button
                        v-if="item.status === 'draft'"
                        class="table-link"
                        @click="save('resource-publish', { id: item.id }, '已发布到学生知识库')"
                      >
                        发布草稿</button
                      ><span v-else class="tag">已发布</span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section></template
        >

        <template v-else-if="page === 'exams'"
          ><div class="desk-split equal">
            <section class="paper panel stack">
              <div class="section-title">
                <h2>班级测评</h2>
                <button class="primary" @click="open('exam', { ids: [], startsAt: '', title: '' })">
                  <Icon name="Plus" :size="16" /> 新建组卷
                </button>
              </div>
              <div v-for="item in schoolExams" :key="item.id" class="manageable">
                <div>
                  <b>{{ item.title }}</b
                  ><small
                    >{{ item.ids.length }} 题{{
                      item.startsAt ? ' · ' + item.startsAt.replace('T', ' ') : ''
                    }}</small
                  >
                </div>
                <span
                  class="tag"
                  :class="{ amber: item.startsAt && new Date(item.startsAt) > new Date() }"
                  >{{ item.startsAt && new Date(item.startsAt) > new Date() ? '待发布' : '已发布' }}</span
                >
              </div>
              <p v-if="!schoolExams.length" class="empty">暂无测评</p>
            </section>
            <section class="paper panel stack">
              <div class="section-title">
                <h2>情景案例</h2>
                <button
                  class="secondary"
                  @click="
                    open('question', {
                      band: 2,
                      domain: '认知',
                      correct: 0,
                      title: '',
                      body: '',
                      reason: '',
                      optionA: '',
                      optionB: '',
                      optionC: '',
                    })
                  "
                >
                  <Icon name="Plus" :size="16" /> 新增案例
                </button>
              </div>
              <div v-for="item in questions" :key="item.id" class="manageable">
                <b>{{ item.title }}</b
                ><span class="tag blue">{{ item.domain }}</span>
              </div>
            </section>
          </div>
          <section class="paper panel stack">
            <h2>答题统计 · 按知识领域</h2>
            <div class="domain-grid">
              <div v-for="item in domainStats" :key="item.name" :class="{ known: item.total }">
                <small>{{ item.name }}</small
                ><b>{{ item.total ? item.rate + '%' : '—' }}</b
                ><small>{{ item.total }} 次作答</small>
              </div>
            </div>
          </section></template
        >

        <template v-else-if="page === 'settings'"
          ><section class="paper panel stack settings-panel">
            <div class="section-title">
              <h2>学校教学参数</h2>
              <button class="primary" @click="open('settings', { ...school.settings })">编辑设置</button>
            </div>
            <div class="manageable">
              <b>状态衰减倍率</b><span>{{ school.settings.decay }}×</span>
            </div>
            <div class="manageable">
              <b>时间加速倍率</b><span>{{ school.settings.speed }}×</span>
            </div>
            <div class="manageable">
              <b>加速卡获取</b><span>{{ school.settings.reward }}</span>
            </div>
            <div class="manageable">
              <b>敏感词过滤</b><span class="tag">{{ school.settings.sensitive ? '开启' : '关闭' }}</span>
            </div>
            <div class="manageable">
              <b>人工先审后发</b><span class="tag">{{ school.settings.moderation ? '开启' : '关闭' }}</span>
            </div>
          </section></template
        >

        <template v-else-if="page === 'sites'"
          ><div class="site-grid">
            <article v-for="[id, item] in siteEntries" :key="id" class="paper panel stack site-card">
              <div class="row between">
                <span class="site-icon"><Icon name="Building2" :size="24" /></span
                ><span class="tag" :class="{ amber: !item.enabled }">{{
                  item.enabled ? '已开通' : '已停用'
                }}</span>
              </div>
              <div>
                <h2>{{ item.name }}</h2>
                <p class="muted small">{{ item.code }} · {{ item.term }}</p>
              </div>
              <div class="row between">
                <span class="muted">学校管理员</span><strong>{{ item.admin }}</strong>
              </div>
              <div class="row between">
                <span class="muted">当前班级</span><strong>{{ item.classes.length }} 个</strong>
              </div>
              <div class="row wrap">
                <button
                  class="secondary"
                  @click="
                    open('site', {
                      id,
                      name: item.name,
                      code: item.code,
                      admin: item.admin,
                      enabled: item.enabled,
                    })
                  "
                >
                  <Icon name="Pencil" :size="15" /> 编辑站点</button
                ><button class="ghost" @click="enterSchool(id)">进入学校</button>
              </div>
            </article>
          </div></template
        >

        <template v-else-if="page === 'learning'"
          ><div class="stats-grid">
            <article
              v-for="[label, value, icon, tone] in [
                ['已读知识点', school.read.length, 'BookOpen', 'mint'],
                ['完成测评', school.attempts.length, 'ClipboardList', 'sky'],
                ['错题', wrong.length, 'CircleAlert', 'peach'],
                [
                  '成就徽章',
                  school.baby ? 2 + Number(Boolean(school.attempts.length)) : 0,
                  'Trophy',
                  'gold',
                ],
              ]"
              :key="label"
              class="paper stat"
            >
              <span :class="['stat-icon', tone]"><Icon :name="icon" /></span>
              <div>
                <p>{{ label }}</p>
                <strong>{{ value }}</strong>
              </div>
            </article>
          </div>
          <div class="desk-split equal">
            <section class="paper panel stack">
              <h2>五大领域掌握情况</h2>
              <div class="domain-grid">
                <div v-for="item in domainStats" :key="item.name" :class="{ known: item.total }">
                  <small>{{ item.name }}</small
                  ><b>{{ item.total ? item.rate + '%' : '—' }}</b>
                </div>
              </div>
              <h3>错题本</h3>
              <div v-for="(item, index) in wrong" :key="index" class="note">
                <b>{{ item.title }}</b>
                <p>{{ item.reason }}</p>
              </div>
              <p v-if="!wrong.length" class="muted small">暂无错题。</p>
            </section>
            <section class="paper panel stack">
              <h2>历次测评成绩</h2>
              <div v-for="item in school.attempts" :key="item.id" class="manageable">
                <div>
                  <b>{{ item.title }}</b
                  ><small>{{ item.date }}</small>
                </div>
                <span class="tag">{{ item.correct }} / {{ item.total }} 题</span>
              </div>
              <p v-if="!school.attempts.length" class="empty">暂无成绩。在手机端交卷后可在这里查看。</p>
              <hr class="divider" />
              <h3>我的徽章</h3>
              <div v-if="school.baby" class="row wrap">
                <span class="tag amber"><Icon name="Trophy" :size="14" /> 初次照护</span
                ><span class="tag amber">成长见证</span
                ><span v-if="school.attempts.length" class="tag amber">实训新星</span>
              </div>
            </section>
          </div></template
        >

        <template v-else-if="page === 'baby'"
          ><template v-if="school.baby"
            ><div class="desk-split equal">
              <section class="paper student-baby">
                <div>
                  <span class="tag">{{ school.baby.age }} 月龄</span>
                  <h2>{{ school.baby.nickname }}</h2>
                  <p>{{ ageLabel(school.baby.age) }} · 起始 {{ school.baby.startAge }} 月龄</p>
                </div>
                <img :src="portrait(school.baby)" alt="宝宝漫画" />
              </section>
              <section class="paper panel stack">
                <h2>宝宝状态</h2>
                <StateCards :baby="school.baby" />
              </section>
            </div>
            <div class="desk-split equal">
              <section class="paper panel">
                <div class="section-title">
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
                <Trend v-bind="growthSeries" />
                <div class="row wrap">
                  <span
                    v-for="item in ['身体发育', '大动作', '精细动作', '语言', '认知社交']"
                    :key="item"
                    class="tag"
                    >{{ item }}</span
                  >
                </div>
              </section>
              <section class="paper panel">
                <div class="section-title">
                  <h2>照护记录</h2>
                  <span class="tag">{{ school.logs.length }} 条</span>
                </div>
                <Timeline :items="school.logs" />
              </section></div
          ></template>
          <section v-else class="paper empty"><Icon name="Baby" /> 等待手机端领养宝宝</section></template
        >
      </main>
    </div>

    <Teleport to="body"
      ><div v-if="modal" class="scrim" @click.self="close" @keydown.esc="close">
        <section class="modal stack" role="dialog" aria-modal="true" aria-label="工作台操作">
          <div class="row between">
            <h2>
              {{
                {
                  site: form.id ? '编辑学校' : '开通学校',
                  class: '新建班级',
                  teacher: '添加教师',
                  term: '编辑学期',
                  policy: '班级领养规则',
                  peer: '学生预警详情',
                  settings: '编辑学校设置',
                  guidance: '发布指导帖',
                  faq: '批量编辑 FAQ',
                  resource: '新增知识素材',
                  question: '新增案例题',
                  exam: '新建测评',
                  remove: '删除帖子',
                }[modal]
              }}
            </h2>
            <button class="icon-button" aria-label="关闭" @click="close">
              <Icon name="X" :size="17" />
            </button>
          </div>
          <form v-if="modal === 'site'" class="stack" @submit.prevent="submitSite">
            <label class="field">学校名称<input v-model="form.name" required maxlength="30" /></label
            ><label class="field">站点编号<input v-model="form.code" required maxlength="16" /></label
            ><label class="field">学校管理员<input v-model="form.admin" required maxlength="20" /></label
            ><label v-if="form.id" class="row"
              ><input v-model="form.enabled" type="checkbox" /> 启用站点</label
            ><button
              class="primary"
              :disabled="!form.name.trim() || !form.code.trim() || !form.admin.trim()"
            >
              保存
            </button>
          </form>
          <form
            v-else-if="['class', 'teacher', 'term'].includes(modal)"
            class="stack"
            @submit.prevent="
              save(modal, modal === 'term' ? { value: form.name.trim() } : { name: form.name.trim() })
            "
          >
            <label class="field"
              >{{ { class: '班级名称', teacher: '教师姓名', term: '学期名称' }[modal]
              }}<input v-model="form.name" required maxlength="30" /></label
            ><button class="primary" :disabled="!form.name.trim()">保存</button>
          </form>
          <form v-else-if="modal === 'policy'" class="stack" @submit.prevent="submitPolicy">
            <p class="muted small">{{ form.className }}</p>
            <label class="field"
              >模式<select v-model="form.mode" aria-label="领养模式">
                <option value="free">自由选择</option>
                <option value="range">限定月龄区间</option>
                <option value="locked">全班锁定</option>
              </select></label
            >
            <div v-if="form.mode === 'range'" class="row">
              <label class="field grow"
                >最小月龄<input v-model.number="form.min" type="number" min="0" max="36" required /></label
              ><label class="field grow"
                >最大月龄<input v-model.number="form.max" type="number" min="0" max="36" required
              /></label>
            </div>
            <label v-if="form.mode === 'locked'" class="field"
              >锁定月龄<input v-model.number="form.locked" type="number" min="0" max="36" required /></label
            ><button class="primary">保存领养规则</button>
          </form>
          <template v-else-if="modal === 'peer'"
            ><div class="note warn">
              <strong>{{ form.name }} · {{ form.alert }}</strong>
              <p>{{ form.class }} · 最近活跃 {{ form.last }}</p>
            </div>
            <div class="row wrap">
              <span class="tag">宝宝 {{ form.age }} 月龄</span
              ><span class="tag">健康值 {{ form.health }}</span
              ><span class="tag">照护 {{ form.logs }} 次</span>
            </div></template
          >
          <form
            v-else-if="modal === 'settings'"
            class="stack"
            @submit.prevent="save('settings', { value: { ...form } })"
          >
            <label class="field"
              >状态衰减倍率<input
                v-model.number="form.decay"
                type="number"
                min="0.1"
                max="10"
                step="0.1"
                required /></label
            ><label class="field"
              >时间加速倍率<input
                v-model.number="form.speed"
                type="number"
                min="0.1"
                max="10"
                step="0.1"
                required /></label
            ><label class="field">加速卡获取<input v-model="form.reward" required /></label
            ><label class="row"><input v-model="form.sensitive" type="checkbox" /> 自动过滤敏感词</label
            ><label class="row"><input v-model="form.moderation" type="checkbox" /> 人工先审后发</label
            ><button class="primary">保存设置</button>
          </form>
          <form v-else-if="modal === 'guidance'" class="stack" @submit.prevent="submitGuidance">
            <label class="field"
              >月龄圈<select v-model.number="form.band">
                <option v-for="(band, index) in bands" :key="band.label" :value="index">
                  {{ band.label }}
                </option>
              </select></label
            ><label class="field">标题<input v-model.trim="form.title" required /></label
            ><label class="field">指导内容<textarea v-model.trim="form.body" required></textarea></label
            ><label class="row"><input v-model="form.pinned" type="checkbox" /> 置顶指导帖</label
            ><button class="primary" :disabled="!form.title || !form.body">发布</button>
          </form>
          <form
            v-else-if="modal === 'faq'"
            class="stack"
            @submit.prevent="
              save('faq', {
                items: form.text
                  .split('\n')
                  .map((s) => s.trim())
                  .filter(Boolean),
              })
            "
          >
            <label class="field">每行一条常见问题<textarea v-model="form.text"></textarea></label
            ><button class="primary">保存 FAQ</button>
          </form>
          <form
            v-else-if="modal === 'resource'"
            class="stack"
            @submit.prevent="save('resource', { resource: { ...form, status: 'draft' } }, '知识草稿已保存')"
          >
            <label class="field">名称<input v-model.trim="form.title" required /></label
            ><label class="field">内容<textarea v-model.trim="form.summary" required></textarea></label>
            <div class="row">
              <label class="field grow"
                >月龄<select v-model.number="form.band">
                  <option v-for="(band, index) in bands" :key="band.label" :value="index">
                    {{ band.label }}
                  </option>
                </select></label
              ><label class="field grow"
                >领域<select v-model="form.domain">
                  <option v-for="domain in domains" :key="domain">{{ domain }}</option>
                </select></label
              >
            </div>
            <button class="primary">保存草稿</button>
          </form>
          <form v-else-if="modal === 'question'" class="stack" @submit.prevent="submitQuestion">
            <label class="field">标题<input v-model.trim="form.title" required /></label
            ><label class="field">场景描述<textarea v-model.trim="form.body" required></textarea></label>
            <div class="row">
              <label class="field grow"
                >月龄<select v-model.number="form.band">
                  <option v-for="(band, index) in bands" :key="band.label" :value="index">
                    {{ band.label }}
                  </option>
                </select></label
              ><label class="field grow"
                >领域<select v-model="form.domain">
                  <option v-for="domain in domains" :key="domain">{{ domain }}</option>
                </select></label
              >
            </div>
            <label
              v-for="[key, label] in [
                ['optionA', 'A'],
                ['optionB', 'B'],
                ['optionC', 'C'],
              ]"
              :key="key"
              class="field"
              >选项 {{ label }}<input v-model.trim="form[key]" required /></label
            ><label class="field"
              >正确答案<select v-model.number="form.correct">
                <option :value="0">A</option>
                <option :value="1">B</option>
                <option :value="2">C</option>
              </select></label
            ><label class="field">解析<textarea v-model.trim="form.reason" required></textarea></label
            ><button class="primary">保存案例</button>
          </form>
          <form
            v-else-if="modal === 'exam'"
            class="stack"
            @submit.prevent="
              save(
                'exam',
                { exam: { ...form, status: 'published' } },
                form.startsAt ? '已安排定时发布' : '测评已发布',
              )
            "
          >
            <label class="field">测评名称<input v-model.trim="form.title" required /></label
            ><label class="field">发布时间<input v-model="form.startsAt" type="datetime-local" /></label>
            <div class="stack">
              <label v-for="item in questions" :key="item.id" class="choice"
                ><input v-model="form.ids" type="checkbox" :value="item.id" /> {{ item.title }}</label
              >
            </div>
            <button class="primary" :disabled="!form.title || !form.ids.length">发布测评</button>
          </form>
          <template v-else-if="modal === 'remove'"
            ><p>{{ form.title }}</p>
            <button
              class="primary"
              @click="save('moderate', { id: form.id, values: { status: 'deleted' } }, '帖子已删除')"
            >
              确认删除
            </button></template
          >
        </section>
      </div>
      <div v-if="toast" class="toast" role="status">{{ toast }}</div></Teleport
    >
  </div>
</template>
