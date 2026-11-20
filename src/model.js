export const bands = [
  { from: 0, to: 3, label: '0–3 月', name: '初生期' },
  { from: 4, to: 6, label: '4–6 月', name: '翻身期' },
  { from: 7, to: 9, label: '7–9 月', name: '探索期' },
  { from: 10, to: 12, label: '10–12 月', name: '扶站期' },
  { from: 13, to: 18, label: '13–18 月', name: '学步期' },
  { from: 19, to: 24, label: '19–24 月', name: '表达期' },
  { from: 25, to: 36, label: '25–36 月', name: '自主期' },
]
export const bandFor = (month) => bands.findIndex((band) => month >= band.from && month <= band.to)
export const ageLabel = (month) =>
  month < 12 ? `${month} 月龄` : `${Math.floor(month / 12)} 岁${month % 12 ? ` ${month % 12} 个月` : ''}`
export const policyFor = (school, className = school.classes[0]) =>
  school.policies?.[`class:${className}`] || school.policy

export const metrics = [
  ['hunger', '饥饿度', 'Milk', 'peach'],
  ['diaper', '尿布', 'Droplet', 'sky'],
  ['energy', '精力', 'Zap', 'gold'],
  ['mood', '情绪', 'Smile', 'lavender'],
  ['health', '健康', 'HeartPulse', 'mint'],
  ['growth', '成长值', 'Sprout', 'leaf'],
]

export const care = [
  {
    id: 'feed',
    name: '喂养',
    icon: 'Milk',
    tone: 'peach',
    steps: [
      '按需奶喂',
      '观察饥饿信号并喂养',
      '练习适龄辅食',
      '练习自主进食',
      '用杯饮水与进餐',
      '练习用勺进餐',
      '安排规律的家庭餐',
    ],
    changes: { hunger: -30, diaper: -8, mood: 8 },
  },
  {
    id: 'diaper',
    name: '换尿布',
    icon: 'Droplet',
    tone: 'sky',
    steps: [
      '检查尿布并更换',
      '更换干爽尿布',
      '更换尿布与简单清洁',
      '检查皮肤并换尿布',
      '换尿布，说出照护步骤',
      '换尿布并观察如厕信号',
      '协助如厕与清洁',
    ],
    changes: { diaper: 48, mood: 10 },
  },
  {
    id: 'sleep',
    name: '哄睡',
    icon: 'Moon',
    tone: 'lavender',
    steps: [
      '观察困倦信号',
      '安静入睡练习',
      '建立午睡前的安抚流程',
      '保持安静的睡前流程',
      '陪读简短睡前故事',
      '维持稳定午睡习惯',
      '引导自主进入睡前流程',
    ],
    changes: { energy: 44, mood: 12 },
  },
  {
    id: 'play',
    name: '陪玩',
    icon: 'ToyBrick',
    tone: 'gold',
    steps: [
      '面对面回应',
      '追视和抓握游戏',
      '玩藏玩具游戏',
      '练习把积木放进盒子',
      '玩堆积木游戏',
      '用积木做颜色配对',
      '和宝宝玩角色扮演',
    ],
    changes: { energy: -9, mood: 24 },
  },
  {
    id: 'bath',
    name: '洗澡',
    icon: 'Bath',
    tone: 'sky',
    steps: [
      '准备沐浴用品',
      '练习洗澡前准备',
      '安抚宝宝并完成清洁',
      '练习用语言提示步骤',
      '陪伴体验安全玩水',
      '鼓励参与身体清洁',
      '一起准备毛巾和换洗衣物',
    ],
    changes: { mood: 14, health: 2 },
  },
  {
    id: 'out',
    name: '户外',
    icon: 'Trees',
    tone: 'mint',
    steps: [
      '模拟短时户外体验',
      '带宝宝观察树影',
      '推车散步并描述周围事物',
      '在安全场地探索',
      '练习扶走与户外观察',
      '陪着宝宝散步',
      '在户外做找颜色游戏',
    ],
    changes: { mood: 15, energy: -7 },
  },
  {
    id: 'check',
    name: '体检疫苗',
    icon: 'Stethoscope',
    tone: 'leaf',
    steps: [
      '熟悉健康档案',
      '记录基础身长体重',
      '查看阶段体检记录',
      '整理测量与接种记录',
      '模拟体检沟通过程',
      '回顾阶段性保健安排',
      '查看健康档案时间线',
    ],
    changes: { health: 8 },
  },
]

export const events = {
  cry: {
    type: '随机事件',
    title: '午睡醒来突然哭闹',
    body: '小橙子刚睡醒，眼里有泪，尿布指示也发生了变化。你准备先做什么？',
    options: ['检查尿布和其他不适信号', '立刻开始陪玩', '继续原来的活动，稍后观察'],
    correct: 0,
    reason: '先观察、逐项排查。把哭声、身体动作与尿布、困倦等线索放在一起判断。',
    changes: { diaper: 30, mood: 25 },
  },
  sleepy: {
    type: '随机事件',
    title: '玩到一半开始犯困',
    body: '小橙子打了几个哈欠，揉着眼睛，对玩具也失去了兴趣。你准备怎么做？',
    options: ['换一个声音更响的玩具', '减少刺激，进入安静的睡前流程', '把游戏继续做完'],
    correct: 1,
    reason: '揉眼、打哈欠和注意力下降是这个情景里的困倦线索。可以减少环境刺激，及时回应。',
    changes: { energy: 40, mood: 14 },
  },
  milestone: {
    type: '固定发育事件',
    title: '新的成长阶段到了',
    body: '小橙子进入新的月龄段。你会怎么记录这次成长？',
    options: ['记录真实观察，并选择一项适龄互动', '把同阶段的能力一次全部勾为达成', '只记录所在班级'],
    correct: 0,
    reason: '发育里程碑适合用来观察和记录，每个宝宝的发展有自己的节奏。',
    changes: { mood: 12 },
  },
}

export const domains = ['大动作', '精细动作', '语言', '认知', '社会性']
export const knowledge = [
  {
    id: 'k1',
    band: 2,
    domain: '大动作',
    title: '从坐稳到探索',
    summary: '观察宝宝什么时候愿意伸手拿玩具。',
    marker: '坐位下尝试伸手够取物体。',
    caution: '课堂练习中记录动作稳定度和左右手表现。',
    plan: '坐在孩子身边，把玩具放在伸手可及的位置。',
    action: 'play',
  },
  {
    id: 'k2',
    band: 2,
    domain: '认知',
    title: '玩具去哪儿了？',
    summary: '用藏玩具游戏练习观察与寻找。',
    marker: '持续关注被部分遮住的玩具。',
    caution: '记录宝宝是否能把注意力转向活动。',
    plan: '用薄布遮住玩具的一部分，留时间让宝宝自己找。',
    action: 'play',
  },
  {
    id: 'k3',
    band: 0,
    domain: '社会性',
    title: '回应初生宝宝',
    summary: '把眼神、声音和表情变成一次交流。',
    marker: '短时间关注熟悉的人脸。',
    caution: '结合情景记录回应的持续时间。',
    plan: '面对宝宝，轻声说话，等对方回应。',
    action: 'play',
  },
  {
    id: 'k4',
    band: 1,
    domain: '精细动作',
    title: '从看见到伸手',
    summary: '记录宝宝看、伸手和抓取的过程。',
    marker: '主动伸手接触合适大小的玩具。',
    caution: '区分偶然碰到和主动抓取。',
    plan: '把轻软玩具放在视线可及处。',
    action: 'play',
  },
  {
    id: 'k5',
    band: 3,
    domain: '大动作',
    title: '给扶站留一点空间',
    summary: '观察主动扶站时的动作。',
    marker: '尝试借助稳定物体改变姿势。',
    caution: '记录孩子自己发起的动作。',
    plan: '准备稳固的支持物，让宝宝按自己的节奏探索。',
    action: 'out',
  },
  {
    id: 'k6',
    band: 4,
    domain: '语言',
    title: '把动作说出来',
    summary: '在换尿布等照护中用简短的句子。',
    marker: '对熟悉的活动名称做出回应。',
    caution: '记录词语与动作是否有联系。',
    plan: '说出正在做的动作，留一些停顿。',
    action: 'diaper',
  },
  {
    id: 'k7',
    band: 5,
    domain: '语言',
    title: '两岁宝宝的表达',
    summary: '从一个词扩展到短句，留出回应时间。',
    marker: '尝试把熟悉的词语组合起来。',
    caution: '用真实日常场景记录语言例子。',
    plan: '接住孩子的词语，再自然延伸一两个词。',
    action: 'play',
  },
  {
    id: 'k8',
    band: 6,
    domain: '社会性',
    title: '一起玩角色扮演',
    summary: '感受轮流和模仿带来的互动。',
    marker: '模仿熟悉的生活动作。',
    caution: '观察孩子是在模仿还是自己发起游戏。',
    plan: '用熟悉的物品和孩子一起演一段生活场景。',
    action: 'play',
  },
]

export const cases = [
  { id: 'q1', title: '午睡后的哭声', domain: '认知', band: 2, ...events.cry },
  { id: 'q2', title: '识别困倦信号', domain: '社会性', band: 2, ...events.sleepy },
  { id: 'q3', title: '记录发育观察', domain: '大动作', band: 3, ...events.milestone },
]

export const freshBaby = (age = 8, nickname = '小橙子') => ({
  age,
  startAge: age,
  nickname,
  event: null,
  cards: 2,
  state: { hunger: 42, diaper: 76, energy: 64, mood: 86, health: 96, growth: 68 },
})
export function portrait(baby) {
  if (baby?.age <= 3) return '/baby/baby-02.png'
  if (baby?.age >= 19) return '/baby/baby-24.png'
  if (baby?.event === 'cry') return '/baby/baby-cry.png'
  if (baby?.event === 'sleepy') return '/baby/baby-sleepy.png'
  return '/baby/baby-08.png'
}

const seedSchool = (name, code, teacher, student, baby, other = false) => ({
  name,
  code,
  teacher,
  admin: other ? '陈嘉宁' : '苏予安',
  student,
  baby,
  term: '2026 年秋季学期',
  classes: other
    ? ['早教实训 1 班', '婴幼儿观察 2 班']
    : ['托育实训 1 班', '托育实训 2 班', '早教实践 1 班'],
  teachers: [teacher, other ? '宋老师' : '顾老师'],
  policy: { mode: other ? 'locked' : 'free', min: 0, max: 36, locked: other ? 24 : 8 },
  settings: { speed: 1, decay: 1, moderation: true, sensitive: true, reward: '完成 3 次照护' },
  logs: [
    { id: 'initial', title: '适龄陪玩', detail: '完成一次阶段互动练习', date: '今天 09:21', kind: 'care' },
    { id: 'initial2', title: '检查并更换尿布', detail: '尿布清洁度提升', date: '今天 08:46', kind: 'care' },
  ],
  posts: [
    {
      id: 'p1',
      band: other ? 5 : 2,
      section: '老师指导',
      author: teacher,
      title: other ? '观察两岁宝宝的词语组合' : '本周指导 · 观察宝宝的困倦信号',
      body: '试着把观察到的表情和动作分开记录，再讨论你的照护选择。',
      tag: '阶段指导',
      likes: 18,
      comments: [{ id: 'c1', author: student, text: '我会先观察，再记录当时的情景。' }],
      status: 'published',
      pinned: true,
    },
    {
      id: 'p2',
      band: other ? 5 : 2,
      section: '同学互助',
      author: student,
      title: other ? '宝宝说两个词时，怎么接话？' : '该怎么判断宝宝是困了，还是想继续玩？',
      body: '宝宝玩着玩着开始揉眼睛。我把观察记录下来，想听听大家的处理方法。',
      tag: '照护求助',
      likes: 12,
      comments: [],
      status: 'published',
    },
    {
      id: 'p3',
      band: other ? 5 : 2,
      section: '同学互助',
      author: '周同学',
      title: '如何写一条完整的照护记录？',
      body: '我记录了操作和状态变化，想了解还需补充哪些信息。',
      tag: '学习交流',
      likes: 4,
      comments: [],
      status: 'pending',
    },
  ],
  faqs: ['怎么查看之前月龄的知识？', '怎么关联一条照护记录？'],
  resources: [],
  exams: [
    {
      id: 'exam1',
      title: other ? '幼儿表达与互动练习' : '7–9 月龄照护练习',
      ids: ['q1', 'q2', 'q3'],
      status: 'published',
      startsAt: '',
    },
  ],
  attempts: [],
  read: [],
  favorites: [],
  notes: {},
  questions: [],
  enabled: true,
  peers: other ? ['许子晴', '徐向宁', '陆依凡'] : ['周雨宁', '沈可昕', '陈光禾'],
})

export function initialData() {
  return {
    schools: {
      a: seedSchool('春禾职院', 'CHUNHE', '林老师', '许知夏', freshBaby()),
      b: seedSchool('青芽学院', 'QINGYA', '陈老师', '李沐青', freshBaby(24, '小芽'), true),
    },
  }
}

export const STORAGE = 'gamebaby-prototype-v1'
export function readData() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE))
    if (saved?.schools?.a && saved.schools.b) return saved
  } catch {
    /* 浏览器禁用存储时仍可演示 */
  }
  return initialData()
}

const stamp = () =>
  new Date().toLocaleString('zh-CN', {
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
const id = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
const clamp = (value) => Math.min(100, Math.max(0, value))
const log = (school, title, detail, kind = 'care') =>
  school.logs.unshift({ id: id(), title, detail, kind, date: stamp() })
const boost = (baby, changes, growth) => {
  for (const [key, value] of Object.entries(changes)) baby.state[key] = clamp(baby.state[key] + value)
  baby.state.growth = clamp(baby.state.growth + growth)
}

export function reduce(data, action) {
  const school = data.schools[action.school]
  const baby = school?.baby
  switch (action.type) {
    case 'site-create': {
      const code = action.code.trim().toUpperCase()
      if (Object.values(data.schools).some((item) => item.code === code)) break
      const site = seedSchool(action.name, code, '待分配', '演示学生', null)
      Object.assign(site, {
        admin: action.admin,
        classes: [],
        teachers: [],
        logs: [],
        posts: [],
        peers: [],
        exams: [],
      })
      data.schools[id()] = site
      break
    }
    case 'site-edit':
      Object.assign(school, action.values)
      break
    case 'adopt':
      if (!baby) {
        school.baby = freshBaby(action.age, action.nickname)
        log(school, '确认领养', `${action.age} 月龄开始成长`, 'milestone')
      }
      break
    case 'adopt-reset':
      school.baby = null
      school.logs = []
      break
    case 'scenario': {
      if (!baby) school.baby = freshBaby(action.age ?? 8)
      const current = school.baby
      if (action.age !== undefined) {
        current.age = action.age
        current.state = freshBaby(action.age).state
      }
      current.event = action.event || null
      if (action.event === 'cry') boost(current, { diaper: -45, mood: -34 }, 0)
      if (action.event === 'sleepy') current.state.energy = 26
      break
    }
    case 'care': {
      const operation = care.find((item) => item.id === action.id)
      if (!baby || !operation) break
      boost(baby, operation.changes, 5)
      if (
        (operation.id === 'sleep' && baby.event === 'sleepy') ||
        (operation.id === 'diaper' && baby.event === 'cry')
      )
        baby.event = null
      log(school, operation.steps[bandFor(baby.age)], '已更新宝宝状态')
      break
    }
    case 'age-up': {
      if (!baby?.cards || baby.age >= 36) break
      const before = baby.age
      baby.age += 1
      baby.cards -= 1
      baby.state.growth = 16
      if (bandFor(before) !== bandFor(baby.age)) baby.event = 'milestone'
      log(school, `成长到 ${baby.age} 月龄`, '使用了 1 张成长加速卡', 'milestone')
      break
    }
    case 'event-answer': {
      const event = events[baby?.event]
      if (!event) break
      const correct = action.answer === event.correct
      boost(baby, correct ? event.changes : { mood: -5 }, correct ? 10 : 2)
      log(school, event.title, correct ? '判断正确 · 已查看解析' : '已作答 · 待复习', 'event')
      baby.event = null
      break
    }
    case 'post':
      school.posts.unshift({
        id: id(),
        band: action.band,
        section: action.section,
        author: action.author,
        title: action.title,
        body: action.body,
        tag: action.tag,
        share: action.share,
        likes: 0,
        comments: [],
        status: action.teacher || !school.settings.moderation ? 'published' : 'pending',
        pinned: Boolean(action.pinned),
      })
      break
    case 'like': {
      const post = school.posts.find((item) => item.id === action.id)
      post.liked = !post.liked
      post.likes += post.liked ? 1 : -1
      break
    }
    case 'comment':
      school.posts
        .find((item) => item.id === action.id)
        .comments.push({ id: id(), author: school.student, text: action.text })
      break
    case 'best':
      school.posts.find((item) => item.id === action.id).best = action.comment
      break
    case 'moderate':
      Object.assign(
        school.posts.find((item) => item.id === action.id),
        action.values,
      )
      break
    case 'collect': {
      const post = school.posts.find((item) => item.id === action.id)
      if (!post.collected) {
        school.resources.unshift({
          id: id(),
          title: post.title,
          summary: post.body,
          domain: '社会性',
          band: post.band,
          status: 'draft',
        })
        post.collected = true
      }
      break
    }
    case 'faq':
      school.faqs = action.items
      break
    case 'resource':
      school.resources.unshift({ id: id(), ...action.resource })
      break
    case 'resource-publish':
      school.resources.find((item) => item.id === action.id).status = 'published'
      break
    case 'question':
      ;(school.questions ||= []).push({ id: id(), ...action.question })
      break
    case 'exam':
      school.exams.unshift({ id: id(), ...action.exam })
      break
    case 'submit':
      school.attempts.unshift({
        id: id(),
        title: action.title,
        answers: action.answers,
        correct: action.correct,
        total: action.total,
        date: stamp(),
      })
      break
    case 'read':
      if (!school.read.includes(action.id)) school.read.push(action.id)
      break
    case 'favorite':
      school.favorites = school.favorites.includes(action.id)
        ? school.favorites.filter((item) => item !== action.id)
        : [...school.favorites, action.id]
      break
    case 'note':
      school.notes[action.id] = action.note
      break
    case 'class':
      if (!school.classes.includes(action.name)) school.classes.push(action.name)
      break
    case 'teacher':
      if (!school.teachers.includes(action.name)) school.teachers.push(action.name)
      break
    case 'term':
      school.term = action.value
      break
    case 'policy':
      ;(school.policies ||= {})[`class:${action.className}`] = action.value
      break
    case 'settings':
      school.settings = action.value
      break
  }
  return data
}
