# Phase 2 Quick Start Guide - 15分钟快速上手

**Date:** November 4, 2025  
**Target:** 快速理解 Phase 2 结构并启动开发

---

## 🎯 Phase 2 一句话总结

**给用户持续的动力系统：** 追踪学习日历（Streaks）→ 积累点数升级 → 解锁成就徽章 → 收到学习提醒

---

## 📊 4个核心模块

### 1️⃣ **Streaks 系统** 🔥
**作用：** 追踪用户连续学习天数

```
用户完成Focus会话 → 检查是否是新的一天 → 增加streak计数 → 显示火焰 🔥
```

**关键字段：**
- `current_streak` - 当前连续天数
- `longest_streak` - 最长记录
- `freeze_count` - 冻结次数（保护streak，月1次）

**核心逻辑：**
```typescript
// 今天有学习？streak +1
// 昨天最后学习？streak +1（连续）
// 2天前没学？streak 重置为 1
```

---

### 2️⃣ **Points & Leveling** ⭐
**作用：** 用户做任何事情都有奖励

**积分规则：**
```
完成Focus会话    → +50 points
上传作业         → +10 points
问AI问题（×5）  → +5 points/个
完成工作证明     → +100 points
每日登录         → +20 points
解锁成就         → +50 points
```

**升级系统：**
```
0-99 points     → Level 1
100-199 points  → Level 2
200-299 points  → Level 3
...
```

**显示在前端：**
```
⭐ Level 3  ████░░░░░░ 45/100 points to Level 4
```

---

### 3️⃣ **Achievements & Badges** 🏆
**作用：** 里程碑庆祝，额外奖励

**内置成就示例：**
```
🎯 First Focus      - 完成第1个Focus会话
🔥 7-Day Streak    - 连续7天学习
🏃 Marathon         - 连续30天学习
💎 Perfect Focus    - 0个分心完成会话
🧠 Question Master  - 问50个问题
```

**触发方式：**
```
Focus会话完成 → 自动检查成就条件 → 解锁新成就 → 显示庆祝动画 🎉
```

---

### 4️⃣ **Notifications & Reminders** 📬
**作用：** 在关键时刻提醒和庆祝

**4种提醒类型：**

| 类型 | 时机 | 示例 |
|------|------|------|
| 📚 Daily Reminder | 用户设定的时间 | "Time to study! You haven't studied yet today" |
| 🔥 Streak Alert | 晚上21:00 | "Your 5-day streak ends at midnight!" |
| 🏆 Achievement | 即时 | "You unlocked: 7-Day Streak! 🔥" |
| 📊 Weekly Digest | 周日晚上 | "This week: 5 sessions, 350 points, Level 2" |

**用户控制：**
```
设置 → 通知偏好
- ☑️ 每日提醒 (时间: 09:00)
- ☑️ Streak警告
- ☑️ 成就通知
- ☑️ 周报告
```

---

## 🗂️ 文件结构

```
apps/api/src/gamification/
├── streaks/
│   ├── streaks.service.ts       ← 主逻辑
│   ├── streaks.controller.ts
│   └── streaks.entity.ts
├── points/
│   ├── points.service.ts
│   ├── points.controller.ts
│   └── points.entity.ts
├── achievements/
│   ├── achievements.service.ts
│   ├── achievements.controller.ts
│   └── achievements.definitions.ts
└── notifications/
    ├── notifications.service.ts
    ├── notifications.controller.ts
    ├── daily-reminder.job.ts     ← 定时任务
    └── streak-alert.job.ts

apps/web/components/
├── StreakCard.tsx               ← 显示当前streak
├── StreakCalendar.tsx           ← 学习日历
├── LevelCard.tsx                ← 显示等级和进度
├── PointsHistory.tsx            ← 积分交易历史
├── AchievementBadge.tsx         ← 单个成就显示
├── AchievementsGrid.tsx         ← 所有成就
├── NotificationCenter.tsx       ← 通知中心
└── NotificationPreferences.tsx

apps/web/hooks/
├── useStreak.ts                 ← Streak数据
├── usePoints.ts                 ← Points数据
├── useAchievements.ts           ← Achievements数据
└── useNotifications.ts          ← Notifications
```

---

## 🚀 启动开发 - 3个步骤

### Step 1: 创建数据库表 (15分钟)

```bash
# 进入项目
cd /Users/knight/study_oasis_simple

# 创建迁移文件
npx prisma migrate dev --name add_gamification_tables

# 创建新文件：apps/api/prisma/migrations/[timestamp]_add_gamification_tables/migration.sql
```

**文件内容在 PHASE_2_GAMIFICATION_PLAN.md 的 "Database Schema" 部分**

### Step 2: 后端实现 (2-3天)

```bash
# 创建gamification模块
cd apps/api
npm run schematics:schematic -- @nestjs/schematics:module gamification

# 按照这个顺序创建服务：
# 1. streaks.service.ts
# 2. points.service.ts
# 3. achievements.service.ts
# 4. notifications.service.ts (包括定时任务)
```

**参考文件位置：** `/docs/implementation/PHASE_2_GAMIFICATION_PLAN.md` 中的 "Backend Service" 代码块

### Step 3: 前端集成 (1-2天)

```bash
# 创建组件和hooks
cd apps/web

# 创建hooks
touch hooks/useStreak.ts
touch hooks/usePoints.ts
touch hooks/useAchievements.ts
touch hooks/useNotifications.ts

# 创建组件
touch components/StreakCard.tsx
touch components/LevelCard.tsx
touch components/AchievementBadge.tsx
touch components/NotificationCenter.tsx
```

**集成位置：** 
- Dashboard: 显示 StreakCard + LevelCard + AchievementsGrid
- Profile: 显示详细的成就列表
- Header: 显示 NotificationCenter 和未读数

---

## 📌 关键集成点

### 集成点 1: Focus Session 完成时

**文件：** `apps/api/src/focus/focus.service.ts`

```typescript
// 在 completeSession() 方法的最后添加：

async completeSession(sessionId: string, userId: string, ...) {
  // ... 现有代码 ...
  
  // 🆕 新增：更新gamification
  await this.streaksService.updateStreakOnSessionComplete(userId)
  await this.pointsService.addPoints(userId, 'session_complete', 50, sessionId)
  const unlockedAchievements = await this.achievementsService.checkAchievements(userId)
  
  // 🆕 发送解锁通知
  for (const achievement of unlockedAchievements) {
    await this.notificationsService.sendNotification(
      userId,
      `🏆 Achievement Unlocked: ${achievement.name}`,
      achievement.description,
      'achievement',
      `/profile/achievements`
    )
  }
}
```

### 集成点 2: 定时任务启动

**文件：** `apps/api/src/main.ts`

```typescript
// 确保在 app bootstrap 后启用定时任务
import { ScheduleModule } from '@nestjs/schedule'

@Module({
  imports: [
    ScheduleModule.forRoot(),  // ✅ 添加这行
    // ... 其他模块 ...
  ]
})
export class AppModule {}
```

### 集成点 3: 仪表板显示

**文件：** `apps/web/app/dashboard/page.tsx`

```typescript
export default function DashboardPage() {
  const { user } = useAuth()
  const { streak } = useStreak(user?.id)
  const { points } = usePoints(user?.id)
  const { achievements } = useAchievements(user?.id)

  return (
    <div className="grid grid-cols-3 gap-4">
      <StreakCard data={streak} />
      <LevelCard data={points} />
      <AchievementsGrid achievements={achievements.slice(0, 6)} />
    </div>
  )
}
```

---

## 🧪 本地测试

### 快速测试 Streaks

```bash
# 1. 创建focus会话
curl -X POST http://localhost:4001/api/focus/sessions \
  -H "Authorization: Bearer YOUR_JWT" \
  -H "Content-Type: application/json" \
  -d '{"documentId":"...","conversationId":"..."}'

# 2. 完成会话
curl -X POST http://localhost:4001/api/focus/sessions/{sessionId}/complete \
  -H "Authorization: Bearer YOUR_JWT" \
  -d '{"completionProofId":"..."}'

# 3. 查看streak
curl http://localhost:4001/api/gamification/streaks/YOUR_USER_ID \
  -H "Authorization: Bearer YOUR_JWT"

# 预期返回：
# {
#   "currentStreak": 1,
#   "longestStreak": 1,
#   "lastStudyDate": "2025-11-04",
#   "freezesRemaining": 1
# }
```

### 快速测试 Points

```bash
# 查看积分
curl http://localhost:4001/api/gamification/points/YOUR_USER_ID \
  -H "Authorization: Bearer YOUR_JWT"

# 预期返回：
# {
#   "totalPoints": 50,
#   "currentLevel": 1,
#   "pointsInCurrentLevel": 50
# }
```

### 快速测试 Achievements

```bash
# 查看可用成就
curl http://localhost:4001/api/gamification/achievements \
  -H "Authorization: Bearer YOUR_JWT"

# 查看用户成就
curl http://localhost:4001/api/gamification/achievements/YOUR_USER_ID \
  -H "Authorization: Bearer YOUR_JWT"
```

---

## ✅ 完成检查清单

### 后端完成后
- [ ] 所有表创建成功
- [ ] POST /gamification/streaks/:userId/check 返回正确数据
- [ ] POST /gamification/points/:userId 增加积分
- [ ] GET /gamification/achievements/:userId 返回解锁成就
- [ ] 定时任务无错误运行
- [ ] 单元测试覆盖 > 90%

### 前端完成后
- [ ] Dashboard 显示 StreakCard + LevelCard
- [ ] Profile 显示所有成就
- [ ] NotificationCenter 显示未读通知
- [ ] 点击通知可以标记为已读
- [ ] 响应式设计（手机/平板/桌面）
- [ ] 性能良好（< 2.5s 加载）

### 集成完成后
- [ ] 完成Focus会话 → Streak +1 ✅
- [ ] 完成Focus会话 → Points +50 ✅
- [ ] 积分达到100 → Level up ✅
- [ ] 条件满足 → Achievement 解锁 ✅
- [ ] Achievement 解锁 → Notification 发送 ✅
- [ ] 晚上21:00 → Streak alert 发送 ✅

---

## 🐛 常见问题

### Q: Streak 每次都重置？
**A:** 检查时区处理。使用 UTC 统一：
```typescript
// ❌ 错误
new Date().toDateString()

// ✅ 正确
new Date().toUTCString().split(' ').slice(0,4).join(' ')
```

### Q: Points 没有增加？
**A:** 确保 `addPoints()` 被调用。检查：
1. Focus会话状态是否是 `completed`
2. `completeSession()` 是否调用了 `pointsService.addPoints()`
3. 数据库是否有 `user_points` 表

### Q: Notifications 没有发送？
**A:** 检查定时任务：
```bash
# 验证定时任务是否运行
npm run start:dev   # 应该看到日志：
# [Nest] ... [SchedulerRegistry] scheduled jobs registered in...
```

---

## 📚 相关文档

- **详细计划：** `PHASE_2_GAMIFICATION_PLAN.md`
- **Phase 1 参考：** `PHASE_1_COMPLETION_REPORT.md`
- **API 文档：** `API_DOCUMENTATION.md`
- **数据库设计：** `DATABASE_SCHEMA.sql`

---

## 🎓 开发流程

```
Day 1-2:  创建表 + Streaks 服务 + 测试
Day 3-4:  Points 服务 + Achievements 服务 + 测试
Day 5:    Notifications + 定时任务 + 集成测试
Day 6-7:  前端组件 + 集成到 Dashboard/Profile
Day 8-9:  E2E 测试 + 性能优化
Day 10:   部署到 staging + QA 验收
```

---

## 🚀 立即开始

```bash
# 1. 切换到项目
cd /Users/knight/study_oasis_simple

# 2. 创建新分支
git checkout -b feature/phase-2-gamification

# 3. 创建迁移
npx prisma migrate dev --name add_gamification_tables

# 4. 启动开发服务器
pnpm -F api start:dev &
pnpm -F web dev &

# 5. 打开文件编辑
code apps/api/src/gamification/streaks/streaks.service.ts
```

---

**预计完成时间:** 2-3 周  
**预期成果:** 用户有持续动力回来学习  
**下一个 Phase:** Phase 3 - 自动分类和高级分析

✨ **Let's Go!** ✨

