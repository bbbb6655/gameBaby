# 游戏化养崽 SaaS 整体设计

面向高校托育、早期教育等专业，学生通过模拟照护学习 0–36 月龄婴幼儿发育知识，教师通过双端同步的记录开展教学和考核。系统规划为 **学生移动 H5 和 PC Web 两端**。移动 H5 预留微信原生小程序接入，PC Web 提供学生空间、学校教学后台和平台站点管理。学校是 SaaS 的数据隔离单位。

## 1 产品入口与角色

| 入口 | 角色 | 页面和职责 |
| --- | --- | --- |
| 移动 H5 | 学生 | 领养宝宝、日常照护、事件判断、成长档案、月龄圈、知识学习、案例测评 |
| PC Web 学生空间 | 学生 | 查看自己的学习进度、成绩、错题和宝宝状态、成长、照护记录 |
| PC Web 教学后台 | 教师 | 管理所带班级的领养规则、学情、考核、班级指导与社区内容 |
| PC Web 教学后台 | 学校管理员 | 管理本校师生、教师分班、学期、班级、教学参数和社区审核 |
| PC Web 平台后台 | 平台管理员 | 开通和管理学校站点、分配学校管理员、维护公共教学资源和平台默认参数 |

平台侧菜单名称为「站点管理」，学校侧角色名称为「学校管理员」。建议一个学校对应一个站点。不同学校可以使用同一小程序和 Web 地址，通过学校入口或班级邀请识别归属。账号与学校成员关系分开存储。同一学生在手机和 PC 使用同一身份，读取同一个学校里的宝宝和学习记录。有多个学校身份时，登录后选择当前学校。

学校创建班级邀请后，学生用本人账号加入班级。微信入口通过登录并绑定已有账号，将微信身份关联到同一用户。PC 学生空间使用同一平台账号登录，学生的学校和班级由成员记录确定。

## 2 原型页面

### 学生移动 H5

底部导航为 **养崽｜月龄圈｜知识学习｜案例测评｜我的**。视觉采用温暖浅色背景、带年龄特征的宝宝形象和卡片式信息布局。领养页用三张方式卡，养崽主页把宝宝、状态提示和操作入口放在首屏。

| 页面 | 主要内容和交互 |
| --- | --- |
| 登录与入班 | 从站点或班级邀请进入，显示学校和班级，登录后进入领养或养崽主页 |
| 首次领养 | 从头开始 0–3 月、分段快进、自定义月龄。预览具体月龄、宝宝形象、开放的历史回看内容。覆盖自由选择、限定区间、全班锁定三种界面状态 |
| 养崽主页 | 昵称、当前月龄、六项状态、宝宝形象、待处理事件、七类照护操作和加速卡入口。状态卡同时显示文字提示和数值，便于判断下一步 |
| 照护与事件 | 照护以底部面板展示当前阶段可用操作。事件页展示固定或随机场景、2–4 个选项、处理结果和专业依据，并可跳转关联知识点 |
| 成长档案 | 按时间看照护日志、事件、里程碑、徽章和身高体重曲线。将模拟数据与 WHO 参考曲线分别标注 |
| 月龄圈 | 默认定位宝宝当前阶段，切换七个圈子。每圈包括老师指导、同学互助、本周热帖，支持图文、标签、评论、点赞、最佳回答和关联照护日志配图 |
| 知识学习 | 按月龄和大动作、精细动作、语言、认知、社会性筛选。详情展示发育指标、预警征象和早教方案，支持收藏、手写笔记及跳转对应照护操作 |
| 案例测评 | 案例练习、待参加测评、答题、成绩与错题。场景、选项、解析关联原有知识领域和月龄标签 |
| 我的 | 学校与班级、学习进度、收藏与笔记、社区互动、加速卡和获得的徽章 |

### PC Web 学生空间

| 页面 | 内容 |
| --- | --- |
| 我的学习 | 学习进度、五大领域掌握热力图、历次测评成绩、错题、成就徽章 |
| 我的宝宝 | 宝宝当前月龄、六项状态、成长曲线、五类里程碑、照护时间线与事件记录 |

两页按查看场景设计。学生只能查看本人数据。手机端提交照护或交卷后，PC 页面刷新即可读取同一条记录。

### PC Web 教学后台

| 页面 | 教师和学校管理员的主要任务 |
| --- | --- |
| 教学看板 | 看学生活跃、照护、发帖、七段月龄分布及班级社区热度柱状图。按未登录、健康值低、社区零互动筛选预警，按当前数据范围导出 Excel |
| 学生档案 | 从预警或花名册进入。回放照护日志，查看随机事件判断正确率、成长曲线、五大领域热力图、历次成绩、发帖、获赞、互助积分和徽章 |
| 学期与班级 | 学校管理员管理本校教师、学生、学期、班级和教师分配。教师在所带班级设置自由选择、限定区间或锁定起始月龄 |
| 社区管理 | 按七圈子发布和置顶指导帖、批量配置 FAQ，审核、加精、删除，查看高频提问关键词云和原帖，审核通过后收录到知识库 |
| 教学资源 | 查阅公共内容，维护学校知识点、案例、照护事件与里程碑配置，核对资源来源、版本和适用月龄 |
| 测评管理 | 新增案例、自定义组卷、定时发布、查看成绩明细及按月龄和知识领域统计正确率 |
| 教学设置 | 调整学校状态衰减参数、加速倍率、加速卡获取规则，配置自动敏感词过滤与人工先审后发开关 |

平台后台的「站点管理」显示学校名称、编号、管理员、开通状态和师生数量，支持新增、查看和编辑。平台的「公共资源」维护交付预装内容与默认教学参数。学校参数有自定义值时使用学校值，班级领养规则由教师在本班配置。

教师的学生档案、班级报表和测评范围按教学班授权。教师可在本校任意月龄圈发布指导帖，并在本校授予的社区管理权限内审核内容。学校管理员可管理本站全部班级，学生只查看自己的个人档案和本校公开的社区内容。

## 3 核心业务规则

### 月龄 领养与照护

- 全系统统一使用七段 **0–3、4–6、7–9、10–12、13–18、19–24、25–36 月龄**。社区、知识库、事件、照护规则和报表共用这套分段。
- 每名学生在同一学校有一只虚拟宝宝。领养记录保存所选方式、确认月龄、班级和规则版本。确认时按班级最新规则校验，创建后固定起始月龄。系统按月龄初始化状态，开放此前阶段知识和固定事件回顾。历史回顾单独展示，实际照护和已达成里程碑以该学生记录为准。
- 切换月龄后，按当前阶段取喂奶／喂养、换尿布、哄睡、陪玩、洗澡、户外溜娃、体检疫苗七类操作配置。每类可有多种适龄操作，结果记录相应状态变化与执行时间。
- 六项状态为饥饿度、尿布、精力、情绪、健康、成长值。内部存储饱腹值，界面显示对应饥饿程度。调度按现实时间推进状态，低月龄的相应状态下降更快。情绪随基础状态和互动变化，健康受持续不佳的状态影响。模拟时间和正确照护推动成长进度。
- 现实时间用于状态衰减、23:00–07:00 夜间免打扰和未登录预警。夜间按学校时区进入低衰减模式，并延后非紧急提醒。模拟时间用于宝宝月龄和成长，加速卡只推进模拟成长。连续 3 天未登录暂按距本校最近一次有效登录满 72 小时设计，触发一次宝宝健康下降和预警。手机与 PC 登录使用同一个时间口径，后台会话续期不改写登录时间。

### 事件 成长与学习

- 固定发育事件按月龄或模拟日龄触发。同一次跨过多个月龄时，按时点顺序登记跨过的事件，每个宝宝同一固定事件只生成一次。概率事件从当前适龄事件库按条件抽取，调度重试复用本次判定结果。
- 两类事件共用作答和反馈流程。事件实例固定当时的内容版本，提交后记录学生选择、判定、专业依据和状态变化。随机事件正确率按已完成事件的实际作答结果统计，与测评成绩分别展示。
- 身体发育、大动作、精细动作、语言、认知社交五类里程碑按条件解锁。徽章覆盖连续照护、喂养、急救、完整成长等类型。成长曲线使用模拟身高体重点，按参考数据适用条件显示对应 WHO 曲线。
- 测评发布时锁定题目版本和计分规则，定时开放。交卷生成成绩、答题明细与错题记录。题目保留月龄段和领域标签，学情统计由实际答题数据汇总。领域热力图同时显示样本数，无作答时显示「暂无数据」。

### 社区与教学资源

- 各学校独立运行七个圈子。帖子可引用本人照护日志生成配图，保存配图所需的展示快照。公开帖子仅展示发布人选中的内容，学生可在发帖前预览。
- 当先审后发开启时，帖子进入待审队列，通过后公开。敏感词过滤、人工审核、置顶、加精和删除分别记录处理状态与操作记录。关键词云从本站已发布的提问类内容聚合，管理员可点词查看对应讨论。收录产生知识素材草稿，教师可编辑和发布。
- 公共资源按版本供各站使用，学校自建或从模板派生的内容归该站所有。交付基线为至少 **20 个固定事件、30 个随机事件、70 条分月龄知识点**。知识和事件记录保存来源、版本、适用年龄和审核状态。来源包含《0–3 岁儿童早期发展指南》、WHO 生长标准、DDST、ASQ-3、婴幼儿喂养指南、国家计划免疫程序。量表题项等需按可使用范围准备交付内容。

## 4 技术架构

```text
手机浏览器 ──────────→ 学生 H5 ─┐
微信原生小程序 ──────→ 学生 H5 ─┼─→ Spring Boot API ─→ MongoDB / Redis / OSS
PC 学生和教学平台后台 ──────────┘                  ↑
                           独立任务服务 ─→ 到期状态、预警、汇总和任务记录
```

| 层 | 方案 |
| --- | --- |
| 前端 | 学生移动 H5 和 PC Web 建议均用 Vue 3。PC 内部按学生、教学、平台空间分路由。移动端采用同一套页面适配浏览器和微信 `web-view`，小程序原生层负责入口及微信登录 |
| API | Java Spring Boot，按账号租户、养崽、内容、社区、测评、学情划分模块。移动 H5 和 PC 共用业务接口和数据 |
| 持久化 | MongoDB 保存业务记录、版本、状态和汇总，生产使用副本集支持事务和恢复 |
| 缓存与排行 | Redis 保存短期登录票据、宝宝状态缓存、社区排行和并发协调信息。业务状态和积分明细可从 MongoDB 恢复 |
| 任务服务 | 独立部署 Java Worker，处理宝宝到期状态结算、事件触发、未登录预警、测评发布、统计汇总和导出任务 |
| 文件 | 阿里云 OSS 保存配图、笔记、课件和导出文件。MongoDB 保存归属、对象路径和可见范围 |

部署层由 Web 网关提供移动 H5、PC Web 和 API 入口。独立浏览器入口支持 HTTP 和 HTTPS，页面请求使用同源地址。微信内嵌使用 HTTPS 业务域名。小程序拿到后端签发的一次性短票据后打开 H5，H5 兑换业务会话。微信账号映射同一平台用户，组织归属由服务端成员记录判断。投标参数 1 中的「微信原生开发」涉及验收口径，正式交付采用 H5 作为主要页面前，需要确认采购方是否接受混合架构。[微信开放文档 · web-view](https://developers.weixin.qq.com/miniprogram/dev/component/web-view.html)

## 5 数据库设计

### 通用字段和隔离规则

- 业务主键使用全局唯一字符串 ID，时间戳使用 BSON Date 保存为 UTC，按站点时区渲染。业务集合中用 `tenantId` 表示学校站点，用 `studentId` 引用该站点内的学生成员 ID。
- 加入学校时创建成员记录，班级归属维护在班级成员集合。业务写入保存发生时的 `classId`，历史报表按记录归属统计。当前名单按现有班级成员关系读取。
- 登录后由后端校验当前租户、角色、班级归属和记录所有权。所有学校业务查询带 `tenantId`，Redis 键和 OSS 路径也带租户维度。平台端跨学校操作走平台管理授权，并写审计记录。
- `users`、`external_identities`、`tenants`、`audit_logs` 为平台或跨作用域集合。公共资源的 `scopeKey` 为 `PLATFORM`，学校资源使用 `SCHOOL:{tenantId}` 并记录 `tenantId`。`resourceId` 标识逻辑资源，`_id` 标识具体版本。学校派生内容使用新的 `resourceId`。
- 表中 **U** 为唯一索引，**I** 为查询索引，字段顺序即复合索引顺序。按时间倒序使用的索引字段，初始化时按实际查询指定降序。

### 身份与学校

| 集合 | 关键字段 | 关键索引 |
| --- | --- | --- |
| `users` | `_id`, `loginName`, `displayName`, `credentialHash`, `platformRoles`, `status` | U `loginName`，仅具备该字段的本地账号 |
| `external_identities` | `userId`, `provider`, `appId`, `openId`, `unionId` | U `provider+appId+openId`；I `userId` |
| `tenants` | `_id`, `code`, `name`, `logoAssetId`, `timezone`, `status`, `createdAt` | U `code` |
| `tenant_members` | `_id`, `tenantId`, `userId`, `roles`, `studentNo`, `status`, `lastLoginAt` | U `tenantId+userId`；U `tenantId+studentNo`，仅有学号的记录；I `tenantId+roles+status`；I `tenantId+lastLoginAt` |
| `terms` | `tenantId`, `code`, `name`, `startsAt`, `endsAt`, `status` | U `tenantId+code` |
| `classes` | `tenantId`, `termId`, `code`, `name`, `adoptionPolicy`, `status` | U `tenantId+termId+code`；I `tenantId+termId+status` |
| `class_memberships` | `tenantId`, `classId`, `memberId`, `role`, `joinedAt`, `leftAt` | U `tenantId+classId+memberId+role`，仅当前有效记录；I `tenantId+memberId+role+leftAt` |
| `class_invites` | `tenantId`, `classId`, `tokenHash`, `createdBy`, `status`, `expiresAt` | U `tokenHash`；I `tenantId+classId+status` |
| `teaching_settings` | `scopeKey`, `tenantId`, `version`, `effectiveAt`, `decayRules`, `timeRatio`, `cardRules`, `moderation` | U `scopeKey+version`；I `scopeKey+effectiveAt`。按作用域与时点取生效配置 |

班级领养策略存于 `classes.adoptionPolicy`。字段包括 `mode`、`minMonth`、`maxMonth`、`lockedMonth`、`version`，按模式使用相应字段。领养记录保存生效策略快照，便于追溯。

### 宝宝与照护

| 集合 | 关键字段 | 关键索引 |
| --- | --- | --- |
| `babies` | `tenantId`, `studentId`, `nickname`, `adoption`, `ageMonth`, `simulationAgeMinutes`, `state`, `lastCalculatedAt`, `nextSettleAt`, `version` | U `tenantId+studentId`；I `nextSettleAt+_id` 用于调度；I `tenantId+ageMonth` |
| `care_logs` | `tenantId`, `studentId`, `classId`, `babyId`, `kind`, `actionCode`, `eventId`, `stateBefore`, `stateAfter`, `requestId`, `occurredAt` | U `tenantId+babyId+requestId`；I `tenantId+babyId+occurredAt+_id`；I `tenantId+classId+occurredAt` |
| `baby_events` | `tenantId`, `studentId`, `classId`, `babyId`, `definitionVersionId`, `kind`, `triggerKey`, `status`, `triggeredAt`, `answer`, `result` | U `tenantId+babyId+triggerKey`；I `tenantId+babyId+status+triggeredAt`；I `tenantId+classId+kind+triggeredAt` |
| `baby_growth_samples` | `tenantId`, `babyId`, `studentId`, `simulationDay`, `ageMonth`, `lengthOrHeightCm`, `weightKg`, `referenceProfile` | U `tenantId+babyId+simulationDay` |
| `student_achievements` | `tenantId`, `studentId`, `babyId`, `kind`, `definitionVersionId`, `achievementKey`, `earnedAt` | U `tenantId+studentId+achievementKey`；I `tenantId+babyId+earnedAt` |
| `student_item_ledger` | `tenantId`, `studentId`, `itemCode`, `delta`, `businessKey`, `occurredAt` | U `tenantId+studentId+itemCode+businessKey`；I `tenantId+studentId+itemCode+occurredAt` |
| `student_item_balances` | `tenantId`, `studentId`, `itemCode`, `balance`, `version` | U `tenantId+studentId+itemCode` |

宝宝文档示例。`ageMonth` 为当前模拟月龄，采用统一换算规则从模拟时间得出。`adoption.startMonth` 是领养时选择的固定月龄。

```json
{
  "_id": "baby_001",
  "tenantId": "school_a",
  "studentId": "member_001",
  "nickname": "小橙子",
  "adoption": {
    "mode": "CUSTOM",
    "startMonth": 8,
    "classId": "class_a01",
    "policyVersion": 3,
    "allowedMonthRange": [7, 9]
  },
  "ageMonth": 8,
  "lastCalculatedAt": { "$date": "2026-11-20T03:00:00Z" },
  "nextSettleAt": { "$date": "2026-11-20T03:05:00Z" },
  "state": {
    "satiety": 70,
    "diaperCleanliness": 75,
    "energy": 65,
    "mood": 82,
    "health": 95,
    "growthValue": 28
  },
  "version": 12
}
```

### 教学内容与成长参考

| 集合 | 关键字段 | 关键索引 |
| --- | --- | --- |
| `teaching_resources` | `scopeKey`, `tenantId`, `resourceId`, `type`, `code`, `version`, `ageBands`, `domains`, `status`, `sources`, `payload`, `derivedFrom` | U `resourceId+version`；U `scopeKey+type+code+version`；分别建 I `scopeKey+type+status+ageBands` 和 I `scopeKey+type+status+domains` |
| `growth_reference_points` | `standardVersion`, `indicator`, `sex`, `ageMonth`, `referenceValues`, `source` | U `standardVersion+indicator+sex+ageMonth` |
| `knowledge_progress` | `tenantId`, `studentId`, `resourceId`, `lastVersionId`, `bookmarked`, `readAt` | U `tenantId+studentId+resourceId`；I `tenantId+studentId+bookmarked` |
| `student_notes` | `tenantId`, `studentId`, `resourceId`, `text`, `assetIds`, `updatedAt` | I `tenantId+studentId+resourceId+updatedAt` |

`teaching_resources.type` 对应知识点、照护操作、固定事件、随机事件、里程碑、徽章和案例题。事件内容保存场景、触发条件、选项和反馈依据。资源发布后以版本引用，历史日志、已触发事件和已发布测评可以追溯原内容。月龄段和领域为两个数组，分别建查询索引。

### 社区

| 集合 | 关键字段 | 关键索引 |
| --- | --- | --- |
| `community_posts` | `tenantId`, `ageBand`, `section`, `authorId`, `classId`, `title`, `body`, `assetIds`, `tags`, `careShareSnapshot`, `moderationStatus`, `pinned`, `featured`, `bestCommentId`, `publishedAt` | I `tenantId+ageBand+moderationStatus+publishedAt`；I `tenantId+ageBand+section+pinned+publishedAt`；I `tenantId+authorId+publishedAt` |
| `community_comments` | `tenantId`, `postId`, `authorId`, `parentId`, `body`, `moderationStatus`, `createdAt` | I `tenantId+postId+moderationStatus+createdAt` |
| `community_likes` | `tenantId`, `userMemberId`, `targetType`, `targetId`, `createdAt` | U `tenantId+targetType+targetId+userMemberId` |
| `community_faqs` | `tenantId`, `ageBand`, `question`, `answer`, `sortOrder`, `status` | I `tenantId+ageBand+status+sortOrder` |
| `community_points` | `tenantId`, `memberId`, `delta`, `businessKey`, `occurredAt` | U `tenantId+memberId+businessKey`；I `tenantId+memberId+occurredAt` |

社区圈子由 `tenantId+ageBand` 定位。本周热帖由当周互动和教师推荐生成。关键词云由已发布提问聚合，直接复用学情汇总存储。计数按互动记录更新，重复点赞通过唯一索引处理。

### 测评 报表与运维

| 集合 | 关键字段 | 关键索引 |
| --- | --- | --- |
| `assessments` | `tenantId`, `title`, `authorId`, `classIds`, `questionsSnapshot`, `startsAt`, `endsAt`, `status` | I `tenantId+classIds+status+startsAt`；I `status+startsAt` |
| `assessment_attempts` | `tenantId`, `assessmentId`, `studentId`, `classId`, `attemptNo`, `answers`, `score`, `status`, `submittedAt` | U `tenantId+assessmentId+studentId+attemptNo`；I `tenantId+studentId+submittedAt`；I `tenantId+assessmentId+classId+status` |
| `wrong_answers` | `tenantId`, `studentId`, `questionResourceId`, `questionVersionId`, `lastAttemptId`, `wrongCount`, `updatedAt` | U `tenantId+studentId+questionResourceId`；I `tenantId+studentId+updatedAt` |
| `student_alerts` | `tenantId`, `studentId`, `classId`, `type`, `episodeKey`, `openedAt`, `closedAt`, `status`, `evidence` | U `tenantId+studentId+type+episodeKey`；I `tenantId+classId+status+type+openedAt` |
| `student_daily_activity` | `tenantId`, `studentId`, `classId`, `localDate`, `lastActivityAt` | U `tenantId+localDate+classId+studentId`；I `tenantId+localDate+studentId` |
| `analytics_rollups` | `tenantId`, `metric`, `bucketDate`, `dimensionKey`, `counts`, `calculatedAt` | U `tenantId+metric+bucketDate+dimensionKey` |
| `assets` | `tenantId`, `ownerId`, `purpose`, `objectKey`, `contentType`, `size`, `status`, `createdAt` | U `objectKey`；I `tenantId+ownerId+purpose+createdAt` |
| `export_jobs` | `tenantId`, `requesterId`, `reportType`, `filters`, `status`, `assetId`, `createdAt` | I `tenantId+requesterId+createdAt`；I `status+createdAt` |
| `audit_logs` | `scopeKey`, `tenantId`, `actorUserId`, `action`, `targetType`, `targetId`, `detail`, `occurredAt` | I `scopeKey+occurredAt`；I `scopeKey+targetType+targetId+occurredAt` |
| `outbox_events` | `tenantId`, `businessKey`, `eventType`, `payload`, `status`, `dueAt`, `attempts` | U `tenantId+businessKey`；I `status+dueAt` |

有效登录、照护、知识学习、交卷及社区互动更新本地日期的活跃记录。活跃人数按查询范围内的学生去重，照护量按日志计数。事件正确率以作答记录为分母，测评正确率按题目月龄段和领域计算，零互动依据所选观察周期内的发帖、评论和点赞记录。报表展示筛选条件、统计区间和更新时间。导出权限与看板一致，文件下载再次校验访问范围。

### 状态结算与一致性

1. Worker 按 `nextSettleAt` 分批找出到期宝宝，根据上次计算时间补算状态和模拟成长。跨夜间时段或教学参数生效时点时分段计算。用宝宝状态版本进行条件更新，多实例抢到同一记录时仅一方提交生效。
2. 学生执行照护时，服务端先结算到当前时间，再应用照护效果。在一个 MongoDB 事务内更新宝宝、写照护日志及所需的异步事件。请求携带唯一 `requestId`，网络重试返回同一次操作结果。加速卡扣减、成长变更和卡片流水也放在同一事务内。
3. 领养、事件触发、成就授予、交卷等同样使用相应唯一键或状态条件。交卷事务保存答案、成绩和异步统计任务。统计消费者根据业务标识幂等处理，避免重放时重复计数。
4. 提交后更新或失效 Redis 状态缓存，MongoDB 作为最终记录。学情和课堂互动汇总允许短时间延迟，单生页面读取的照护明细和成绩直接来自业务记录。重启后根据到期状态和事务事件继续执行。

Redis 键示例为 `baby:{tenantId}:{babyId}`、`community:week:{tenantId}:{ageBand}:{week}` 和 `login:ticket:{ticketId}`。OSS 业务文件采用 `schools/{tenantId}/{purpose}/{assetId}`，公共教学素材用平台路径管理。

## 6 API 设计

业务 API 统一使用 `/api/v1`。清单中省略此前缀。服务端从会话和成员关系确定学校、学生身份和读写权限。列表支持筛选与分页，照护时间线按时间和 ID 游标追溯。学生提交状态变更接口时携带请求标识供幂等使用。

| 模块 | 代表接口 | 行为 |
| --- | --- | --- |
| 登录与学校 | `POST /auth/login`、`POST /auth/wechat/session`、`POST /auth/exchange`、`GET /me`、`POST /me/switch-tenant` | 浏览器登录、微信票据兑换、获取身份与切换当前学校 |
| 班级邀请 | `POST /teaching/classes/{id}/invites`、`POST /student/class-invites/accept` | 教师创建班级邀请，学生登录后加入对应学校和班级 |
| 学生养崽 | `GET /student/adoption-options`、`POST /student/baby`、`GET /student/baby`、`POST /student/baby/actions`、`POST /student/baby/accelerations` | 获取班级可选范围、确认领养、读状态、执行照护和使用加速卡 |
| 宝宝事件与档案 | `POST /student/baby/events/{id}/answer`、`GET /student/baby/logs`、`GET /student/baby/growth`、`GET /student/baby/achievements` | 事件作答、照护记录、成长数据和成就，同供 PC 学生空间展示 |
| 学习与测评 | `GET /knowledge`、`GET /student/learning`、`POST /student/knowledge/{id}/notes`、`GET /student/assessments`、`POST /student/assessments/{id}/attempts`、`POST /student/attempts/{id}/submit` | 知识筛选、学习进度、笔记、创建答卷和交卷。收藏、成绩及错题提供对应接口 |
| 社区 | `GET /community/{ageBand}/posts`、`POST /community/{ageBand}/posts`、`POST /community/posts/{id}/comments`、`PUT /community/posts/{id}/best-answer` | 圈子浏览、发帖、评论和最佳回答，点赞与取消点赞提供幂等接口 |
| 教师 | `PATCH /teaching/classes/{id}/adoption-policy`、`GET /teaching/dashboard`、`GET /teaching/students/{id}`、`POST /teaching/exports` | 设置班级领养规则、看班级报表与学生档案、发起 Excel 导出 |
| 教师内容与考核 | `POST /teaching/assessments`、`POST /teaching/assessments/{id}/publish`、`POST /teaching/community/posts/{id}/moderation`、`POST /teaching/community/posts/{id}/collect` | 组卷、发布、社区审核、收录教学素材 |
| 学校管理 | `GET /school/dashboard`、`/school/members`、`/school/terms`、`/school/classes`、`/school/settings` | 管理本校成员、学期、班级和教学设置 |
| 平台管理 | `GET /platform/tenants`、`POST /platform/tenants`、`PATCH /platform/tenants/{id}`、`PUT /platform/tenants/{id}/admins` | 站点列表、开通、编辑和分配学校管理员 |

## 7 原型演示与验收

1. **学校开通和多租户。** 平台管理员创建 A 校、B 校并分配学校管理员。A 校管理员建学期和班级，分配教师。切换到 B 校，确认只有 B 校的班级、学情和论坛内容。
2. **手机照护和 PC 同步。** A 校教师把班级起始范围设为 7–9 月龄。学生从班级入口进入 H5，选 8 月龄领养，完成照护及随机事件。学生在 PC「我的宝宝」查看同一条记录，教师在单生档案查看照护变化和作答。
3. **社区与课堂。** 学生把照护日志关联到当月龄圈的帖子。教师审核、加精并收录，随后选相关案例组卷并定时发布。学生在 H5 交卷，在 PC「我的学习」看成绩、错题，教师看班级正确率并导出。
4. **时间与预警。** 用演示数据覆盖低月龄状态衰减、23:00–07:00 夜间状态、连续三天未登录、成长加速跨月、固定里程碑和随机事件。验证重复提交照护和交卷时，记录与数值只变更一次。

### 投标参数对应

| 参数 | 设计落点 |
| --- | --- |
| 1 双端配套 | 学生 H5 与微信接入、PC Web 教学后台，另含 PC 学生空间 |
| 2 领养 | 三种领养方式、班级规则、领养快照、历史回看 |
| 3 实时状态 | 六项状态、独立任务服务、夜间与未登录预警 |
| 4 差异化照护 | 七段月龄、七类操作和照护日志 |
| 5 事件引擎 | 固定与概率事件、选项解析、事件日志 |
| 6 成长激励 | 五类里程碑、WHO 曲线、成就徽章 |
| 7 月龄社区 | 每校七圈子、三分区、图文互动、照护配图 |
| 8 社区管控 | 指导帖、FAQ、审核、关键词云、收录教学资源 |
| 9 专业知识库 | 五大领域、月龄筛选、照护联动、收藏和手写笔记 |
| 10 案例与测评 | 案例题库、自定义组卷、定时发布、错题和正确率 |
| 11 学情仪表盘 | 活跃、照护、发帖、月龄分布、社区热度、预警和 Excel |
| 12 单生档案 | 照护回放、事件正确率、成长、知识热力图、成绩、社区数据和徽章 |
| 13 教学参数 | 学校配置、班级起始策略、分级账号和审核模式 |
| 14 预装内容 | 来源、内容版本与审核、至少 20 个固定事件、30 个随机事件、70 条知识点 |
| 15 技术运维 | Spring Boot、MongoDB、Redis、OSS、独立任务服务、接口文档、部署手册及一年免费运维和内容更新 |

## 8 部署与交付

生产按网关及静态站点、Spring Boot API、独立 Worker、MongoDB、Redis、OSS 组织部署。演示、测试和生产使用独立的数据库、缓存及文件配置。部署手册记录域名与微信业务域名、环境变量、MongoDB 索引初始化、基础内容导入、备份恢复和版本回滚。运维监控覆盖接口、状态结算积压、任务失败、测评发布、导出和备份恢复。

交付范围包含双端系统、预装教学内容、接口文档、数据库初始化与版本迁移说明、部署手册、使用说明、一年免费系统运维与内容迭代更新。交互原型按两所学校展示上述流程，开发联调和正式部署按投标条目核对。

参考材料为投标参数、双端调整要求、《A计划-游戏化养崽版》项目计划书和领养页、养崽主页视觉参考。
