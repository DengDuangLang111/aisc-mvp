# Phase 2 Execution Plan - Gamification System

**Date:** November 4, 2025  
**Status:** 🚀 Ready to Start  
**Duration:** 2-3 weeks (80-120 hours)  
**Priority:** HIGH - Critical for user retention

---

## 🎯 Phase 2 Objective

Implement a complete gamification system to **keep users engaged and coming back** with:
- ✅ Streak tracking (consecutive days of studying)
- ✅ Points & leveling system (immediate rewards)
- ✅ Achievements & badges (milestone celebrations)
- ✅ Daily reminders (motivation nudges)

**Expected Impact:** 40%+ increase in 7-day retention rate

---

## 📊 Phase 2 Components

### Component 1: Streaks System

**What it does:**
- Track consecutive days the user completes at least 1 focus session
- Display current streak and longest streak
- Allow one "freeze" per month to protect streak
- Show calendar view of study days

**Database Schema:**
```sql
CREATE TABLE user_streaks (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  current_streak INT DEFAULT 0,
  longest_streak INT DEFAULT 0,
  last_study_date DATE,
  freeze_count INT DEFAULT 0,
  freeze_last_used_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Index for quick lookup
CREATE INDEX idx_user_streaks_user_id ON user_streaks(user_id);
```

**Backend Implementation:**

```typescript
// File: /apps/api/src/gamification/streaks/streaks.service.ts

@Injectable()
export class StreaksService {
  constructor(private prisma: PrismaService) {}

  /**
   * Update streak when user completes a focus session
   */
  async updateStreakOnSessionComplete(userId: string): Promise<UserStreak> {
    const today = new Date().toDateString()
    const userStreak = await this.prisma.userStreak.findUnique({
      where: { userId }
    })

    if (!userStreak) {
      // First focus session ever
      return this.prisma.userStreak.create({
        data: {
          userId,
          current_streak: 1,
          longest_streak: 1,
          last_study_date: new Date()
        }
      })
    }

    const lastStudyDate = userStreak.last_study_date
    const lastStudyDateString = lastStudyDate.toDateString()
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toDateString()

    // If already studied today, no change
    if (lastStudyDateString === today) {
      return userStreak
    }

    // If last study was yesterday, increment streak
    if (lastStudyDateString === yesterday) {
      const newStreak = userStreak.current_streak + 1
      return this.prisma.userStreak.update({
        where: { userId },
        data: {
          current_streak: newStreak,
          longest_streak: Math.max(userStreak.longest_streak, newStreak),
          last_study_date: new Date()
        }
      })
    }

    // If last study was > 2 days ago, reset streak
    return this.prisma.userStreak.update({
      where: { userId },
      data: {
        current_streak: 1,
        last_study_date: new Date()
      }
    })
  }

  /**
   * Use freeze to protect streak (1 per month)
   */
  async useFreeze(userId: string): Promise<UserStreak> {
    const userStreak = await this.prisma.userStreak.findUnique({
      where: { userId }
    })

    if (!userStreak) {
      throw new NotFoundException('Streak not found')
    }

    if (userStreak.freeze_count >= 1) {
      throw new BadRequestException('No freezes available this month')
    }

    const lastFreeze = userStreak.freeze_last_used_at
    const now = new Date()
    const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

    if (lastFreeze && lastFreeze > oneMonthAgo) {
      throw new BadRequestException('Freeze already used this month')
    }

    // Update last_study_date to today to prevent streak loss
    return this.prisma.userStreak.update({
      where: { userId },
      data: {
        last_study_date: new Date(),
        freeze_count: lastFreeze && lastFreeze < oneMonthAgo ? 1 : 2,
        freeze_last_used_at: new Date()
      }
    })
  }

  /**
   * Get streak calendar for UI display
   */
  async getStreakCalendar(userId: string, year: number, month: number) {
    const streak = await this.prisma.userStreak.findUnique({
      where: { userId }
    })

    if (!streak) {
      throw new NotFoundException('Streak not found')
    }

    // Query focus_sessions for the specified month
    const startDate = new Date(year, month - 1, 1)
    const endDate = new Date(year, month, 0)

    const sessions = await this.prisma.focusSession.findMany({
      where: {
        user_id: userId,
        started_at: {
          gte: startDate,
          lte: endDate
        },
        status: 'completed'
      },
      select: { started_at: true }
    })

    // Group by day
    const studyDays = new Set(
      sessions.map(s => s.started_at.toDateString())
    )

    // Generate calendar grid
    const days = []
    let currentDate = new Date(startDate)
    while (currentDate <= endDate) {
      days.push({
        date: currentDate.toDateString(),
        hasSession: studyDays.has(currentDate.toDateString())
      })
      currentDate.setDate(currentDate.getDate() + 1)
    }

    return {
      currentStreak: streak.current_streak,
      longestStreak: streak.longest_streak,
      freezesRemaining: Math.max(0, 1 - streak.freeze_count),
      calendar: days
    }
  }
}
```

**Frontend Hook:**

```typescript
// File: /apps/web/hooks/useStreak.ts

export function useStreak(userId: string) {
  const [streak, setStreak] = useState<StreakData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchStreak = async () => {
    try {
      setLoading(true)
      const response = await apiFetch(`/gamification/streaks/${userId}`)
      setStreak(response)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch streak')
    } finally {
      setLoading(false)
    }
  }

  const useFreeze = async () => {
    try {
      const response = await apiFetch(`/gamification/streaks/${userId}/freeze`, {
        method: 'POST'
      })
      setStreak(response)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to use freeze')
    }
  }

  useEffect(() => {
    if (userId) {
      fetchStreak()
    }
  }, [userId])

  return { streak, loading, error, useFreeze, refetch: fetchStreak }
}
```

**Status:** 📋 Ready to implement

---

### Component 2: Points & Leveling

**What it does:**
- Earn points for various activities (session complete +50pts, upload +10pts, etc.)
- Level up every 100 points
- Show progress bar toward next level
- Display points on profile and dashboard

**Database Schema:**
```sql
CREATE TABLE user_points (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  total_points INT DEFAULT 0,
  current_level INT DEFAULT 1,
  points_in_current_level INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE point_transactions (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  points INT NOT NULL,
  reason VARCHAR(100) NOT NULL, -- 'session_complete', 'upload_doc', etc.
  reference_id UUID, -- Link to session, achievement, etc.
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_user_points_user_id ON user_points(user_id);
CREATE INDEX idx_point_transactions_user_id ON point_transactions(user_id, created_at DESC);
```

**Point Earning Rules:**
```typescript
export const POINT_RULES = {
  SESSION_COMPLETE: 50,        // Complete focus session
  UPLOAD_DOCUMENT: 10,          // Upload assignment
  ASK_QUESTION: 5,              // Ask AI question (max 50/session)
  FIRST_HINT: 10,               // Use first hint in session
  COMPLETE_WORK_PROOF: 100,    // Upload completion proof
  DAILY_LOGIN: 20,              // Login for 1st time today
  ACHIEVEMENT_UNLOCK: 50        // Unlock new achievement
}
```

**Backend Service:**

```typescript
// File: /apps/api/src/gamification/points/points.service.ts

@Injectable()
export class PointsService {
  constructor(private prisma: PrismaService) {}

  /**
   * Add points for an action
   */
  async addPoints(
    userId: string,
    reason: string,
    points: number,
    referenceId?: string
  ): Promise<UserPoints> {
    // Record transaction
    await this.prisma.pointTransaction.create({
      data: {
        user_id: userId,
        points,
        reason,
        reference_id: referenceId
      }
    })

    // Get or create user points
    let userPoints = await this.prisma.userPoints.findUnique({
      where: { user_id: userId }
    })

    if (!userPoints) {
      userPoints = await this.prisma.userPoints.create({
        data: { user_id: userId }
      })
    }

    // Update total and level
    const newTotalPoints = userPoints.total_points + points
    const newLevel = Math.floor(newTotalPoints / 100) + 1
    const pointsInLevel = newTotalPoints % 100

    return this.prisma.userPoints.update({
      where: { user_id: userId },
      data: {
        total_points: newTotalPoints,
        current_level: newLevel,
        points_in_current_level: pointsInLevel
      }
    })
  }

  /**
   * Get point history for user
   */
  async getPointHistory(userId: string, limit = 10, offset = 0) {
    return this.prisma.pointTransaction.findMany({
      where: { user_id: userId },
      orderBy: { created_at: 'desc' },
      take: limit,
      skip: offset
    })
  }

  /**
   * Get leaderboard (top 100 users this month)
   */
  async getLeaderboard(limit = 100) {
    const monthStart = new Date()
    monthStart.setDate(1)
    monthStart.setHours(0, 0, 0, 0)

    // Get points earned this month
    const leaderboard = await this.prisma.pointTransaction.groupBy({
      by: ['user_id'],
      _sum: { points: true },
      where: {
        created_at: { gte: monthStart }
      },
      orderBy: { _sum: { points: 'desc' } },
      take: limit
    })

    // Fetch user details
    return Promise.all(
      leaderboard.map(async (entry) => {
        const user = await this.prisma.user.findUnique({
          where: { id: entry.user_id },
          select: { id: true, email: true }
        })
        return {
          userId: entry.user_id,
          userEmail: user?.email,
          pointsThisMonth: entry._sum.points || 0
        }
      })
    )
  }
}
```

**Status:** 📋 Ready to implement

---

### Component 3: Achievements & Badges

**What it does:**
- Unlock achievements when milestones are reached
- Display badges on profile
- Show achievement history
- Grant bonus points for achievements

**Achievements Definition:**

```typescript
export const ACHIEVEMENTS = [
  {
    id: 'first-session',
    name: 'First Focus',
    description: 'Complete your first focus session',
    icon: '🎯',
    pointsReward: 50,
    criteria: { type: 'session_count', value: 1 }
  },
  {
    id: 'streak-7',
    name: '7-Day Streak',
    description: 'Maintain a 7-day study streak',
    icon: '🔥',
    pointsReward: 100,
    criteria: { type: 'streak', value: 7 }
  },
  {
    id: 'streak-30',
    name: 'Marathon',
    description: 'Maintain a 30-day study streak',
    icon: '🏃',
    pointsReward: 500,
    criteria: { type: 'streak', value: 30 }
  },
  {
    id: 'level-5',
    name: 'Level 5',
    description: 'Reach level 5 (500 points)',
    icon: '⭐',
    pointsReward: 0, // Already earned points
    criteria: { type: 'level', value: 5 }
  },
  {
    id: 'perfect-focus',
    name: 'Perfect Focus',
    description: 'Complete a session with zero distractions',
    icon: '💎',
    pointsReward: 200,
    criteria: { type: 'distractions', value: 0 }
  },
  {
    id: 'homework-hero',
    name: 'Homework Hero',
    description: 'Complete 10 focus sessions',
    icon: '🦸',
    pointsReward: 150,
    criteria: { type: 'session_count', value: 10 }
  },
  {
    id: 'question-master',
    name: 'Question Master',
    description: 'Ask 50 questions to AI',
    icon: '🧠',
    pointsReward: 100,
    criteria: { type: 'questions_asked', value: 50 }
  }
]
```

**Database Schema:**
```sql
CREATE TABLE achievements (
  id UUID PRIMARY KEY,
  code VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  icon VARCHAR(50),
  points_reward INT DEFAULT 0,
  criteria JSONB NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE user_achievements (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  achievement_id UUID NOT NULL REFERENCES achievements(id),
  earned_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, achievement_id)
);

CREATE INDEX idx_user_achievements_user_id ON user_achievements(user_id);
```

**Backend Service:**

```typescript
// File: /apps/api/src/gamification/achievements/achievements.service.ts

@Injectable()
export class AchievementsService {
  constructor(
    private prisma: PrismaService,
    private pointsService: PointsService
  ) {}

  /**
   * Check and unlock achievements after session completion
   */
  async checkAchievements(userId: string): Promise<Achievement[]> {
    const unlockedAchievements: Achievement[] = []

    // Get user stats
    const sessionCount = await this.prisma.focusSession.count({
      where: { user_id: userId, status: 'completed' }
    })

    const userPoints = await this.prisma.userPoints.findUnique({
      where: { user_id: userId }
    })

    const userStreak = await this.prisma.userStreak.findUnique({
      where: { user_id: userId }
    })

    // Check each achievement
    for (const achDef of ACHIEVEMENTS) {
      const alreadyUnlocked = await this.prisma.userAchievement.findFirst({
        where: {
          user_id: userId,
          achievement: { code: achDef.id }
        }
      })

      if (alreadyUnlocked) continue

      let shouldUnlock = false

      switch (achDef.criteria.type) {
        case 'session_count':
          shouldUnlock = sessionCount >= achDef.criteria.value
          break
        case 'streak':
          shouldUnlock = userStreak?.current_streak >= achDef.criteria.value
          break
        case 'level':
          shouldUnlock = userPoints?.current_level >= achDef.criteria.value
          break
        case 'distractions':
          // Check last session
          const lastSession = await this.prisma.focusSession.findFirst({
            where: { user_id: userId },
            orderBy: { started_at: 'desc' }
          })
          shouldUnlock = lastSession?.total_distractions === achDef.criteria.value
          break
      }

      if (shouldUnlock) {
        const achievement = await this.prisma.achievement.findUnique({
          where: { code: achDef.id }
        })

        if (achievement) {
          await this.prisma.userAchievement.create({
            data: {
              user_id: userId,
              achievement_id: achievement.id
            }
          })

          if (achievement.points_reward > 0) {
            await this.pointsService.addPoints(
              userId,
              'achievement_unlock',
              achievement.points_reward,
              achievement.id
            )
          }

          unlockedAchievements.push(achievement)
        }
      }
    }

    return unlockedAchievements
  }

  /**
   * Get user's achievements
   */
  async getUserAchievements(userId: string) {
    return this.prisma.userAchievement.findMany({
      where: { user_id: userId },
      include: { achievement: true },
      orderBy: { earned_at: 'desc' }
    })
  }

  /**
   * Get all available achievements
   */
  async getAllAchievements() {
    return this.prisma.achievement.findMany()
  }
}
```

**Status:** 📋 Ready to implement

---

### Component 4: Reminders & Notifications

**What it does:**
- Send daily reminder at user's preferred time
- Send alert if streak is about to break
- Send celebration notification on achievement unlock
- Send weekly digest with progress

**Database Schema:**
```sql
CREATE TABLE user_notification_preferences (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  daily_reminder_enabled BOOLEAN DEFAULT true,
  daily_reminder_time TIME DEFAULT '09:00:00',
  streak_alert_enabled BOOLEAN DEFAULT true,
  achievement_notification_enabled BOOLEAN DEFAULT true,
  weekly_digest_enabled BOOLEAN DEFAULT true,
  email_notifications BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE user_notifications (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(200) NOT NULL,
  body TEXT,
  type VARCHAR(50), -- 'daily_reminder', 'streak_alert', 'achievement', 'weekly_digest'
  read BOOLEAN DEFAULT false,
  action_url VARCHAR(500),
  created_at TIMESTAMP DEFAULT NOW(),
  read_at TIMESTAMP
);

CREATE INDEX idx_user_notifications_user_id ON user_notifications(user_id, created_at DESC);
CREATE INDEX idx_user_notifications_unread ON user_notifications(user_id, read) WHERE read = false;
```

**Notification Service:**

```typescript
// File: /apps/api/src/gamification/notifications/notifications.service.ts

@Injectable()
export class NotificationsService {
  constructor(
    private prisma: PrismaService,
    private logger: Logger
  ) {}

  /**
   * Send notification to user (in-app)
   */
  async sendNotification(
    userId: string,
    title: string,
    body: string,
    type: string,
    actionUrl?: string
  ) {
    return this.prisma.userNotification.create({
      data: {
        user_id: userId,
        title,
        body,
        type,
        action_url: actionUrl
      }
    })
  }

  /**
   * Get user's unread notifications
   */
  async getUnreadNotifications(userId: string) {
    return this.prisma.userNotification.findMany({
      where: {
        user_id: userId,
        read: false
      },
      orderBy: { created_at: 'desc' },
      take: 20
    })
  }

  /**
   * Mark notification as read
   */
  async markAsRead(notificationId: string) {
    return this.prisma.userNotification.update({
      where: { id: notificationId },
      data: { read: true, read_at: new Date() }
    })
  }

  /**
   * Get user notification preferences
   */
  async getPreferences(userId: string) {
    let prefs = await this.prisma.userNotificationPreferences.findUnique({
      where: { user_id: userId }
    })

    if (!prefs) {
      prefs = await this.prisma.userNotificationPreferences.create({
        data: { user_id: userId }
      })
    }

    return prefs
  }

  /**
   * Update notification preferences
   */
  async updatePreferences(userId: string, updates: any) {
    return this.prisma.userNotificationPreferences.update({
      where: { user_id: userId },
      data: updates
    })
  }
}
```

**Scheduled Jobs (using BullMQ/Cron):**

```typescript
// File: /apps/api/src/gamification/notifications/daily-reminder.job.ts

@Injectable()
export class DailyReminderJob {
  constructor(
    private prisma: PrismaService,
    private notificationsService: NotificationsService
  ) {}

  /**
   * Run daily at various times based on user preference
   * Scheduled via Cron: "0 * * * *" (every hour)
   */
  @Cron('0 * * * *')
  async sendDailyReminders() {
    const now = new Date()
    const currentHour = now.getHours()
    const currentMinute = now.getMinutes()

    const preferences = await this.prisma.userNotificationPreferences.findMany({
      where: {
        daily_reminder_enabled: true
        // Check if reminder time matches current time
      },
      include: { user: true }
    })

    for (const pref of preferences) {
      const [prefHour, prefMinute] = pref.daily_reminder_time.split(':')
      
      if (parseInt(prefHour) === currentHour && parseInt(prefMinute) === currentMinute) {
        // Check if user already studied today
        const todayStart = new Date()
        todayStart.setHours(0, 0, 0, 0)

        const sessionToday = await this.prisma.focusSession.findFirst({
          where: {
            user_id: pref.user_id,
            status: 'completed',
            started_at: { gte: todayStart }
          }
        })

        if (!sessionToday) {
          await this.notificationsService.sendNotification(
            pref.user_id,
            '📚 Time to Study!',
            'You haven\'t studied yet today. Start a focus session now!',
            'daily_reminder',
            '/chat'
          )
        }
      }
    }
  }

  /**
   * Check for streaks about to break (daily at 9 PM)
   */
  @Cron('0 21 * * *')
  async checkStreakAtRisk() {
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    yesterday.setHours(0, 0, 0, 0)

    const usersAtRisk = await this.prisma.userStreak.findMany({
      where: {
        current_streak: { gt: 0 },
        last_study_date: {
          lt: yesterday
        }
      },
      include: { user: true }
    })

    for (const streak of usersAtRisk) {
      const prefs = await this.notificationsService.getPreferences(streak.user_id)

      if (prefs.streak_alert_enabled) {
        await this.notificationsService.sendNotification(
          streak.user_id,
          '🔥 Streak at Risk!',
          `Your ${streak.current_streak}-day streak ends at midnight! Study now to keep it alive.`,
          'streak_alert',
          '/chat'
        )
      }
    }
  }
}
```

**Status:** 📋 Ready to implement

---

## 🛠️ Implementation Steps

### Week 1: Backend Gamification Core

**Day 1-2: Streaks System**
- [ ] Create Streaks database table
- [ ] Implement StreaksService (update, freeze, calendar)
- [ ] Create /gamification/streaks endpoints
- [ ] Add unit tests

**Day 3-4: Points & Leveling**
- [ ] Create Points database tables
- [ ] Implement PointsService (add points, history, leaderboard)
- [ ] Create /gamification/points endpoints
- [ ] Add unit tests

**Day 5: Achievements**
- [ ] Create Achievements database tables
- [ ] Implement AchievementsService (check, unlock, list)
- [ ] Create /gamification/achievements endpoints
- [ ] Add unit tests

### Week 2: Frontend Components

**Day 1-2: Streak Component**
- [ ] Create StreakCard component (display current/longest streak)
- [ ] Create StreakCalendar component (visual calendar)
- [ ] Create FreezeButtton component
- [ ] Integrate into dashboard

**Day 3-4: Points & Level Component**
- [ ] Create LevelCard component (current level, progress bar)
- [ ] Create PointsHistory component (transaction list)
- [ ] Create LeaderboardComponent (top users)
- [ ] Integrate into dashboard

**Day 5: Achievements Display**
- [ ] Create AchievementBadge component
- [ ] Create AchievementsGrid component
- [ ] Create UnlockNotification component (celebration)
- [ ] Integrate into profile page

### Week 3: Notifications & Integration

**Day 1-2: Notification System**
- [ ] Create UserNotificationPreferences table
- [ ] Implement NotificationsService
- [ ] Create NotificationCenter component (in-app)
- [ ] Create NotificationPreferencesModal

**Day 3-4: Scheduled Jobs**
- [ ] Set up BullMQ / Cron for scheduled jobs
- [ ] Implement daily reminder job
- [ ] Implement streak alert job
- [ ] Test job scheduling

**Day 5: Integration & Testing**
- [ ] Hook up gamification to focus session completion
- [ ] Trigger achievement checks
- [ ] Send notifications
- [ ] Full E2E testing

---

## 📈 API Endpoints

### Streaks Endpoints
```
GET    /gamification/streaks/:userId        - Get current streak
POST   /gamification/streaks/:userId/freeze - Use freeze
GET    /gamification/streaks/:userId/calendar?year=2025&month=11 - Get calendar
```

### Points Endpoints
```
GET    /gamification/points/:userId          - Get points/level
GET    /gamification/points/:userId/history  - Get transaction history
GET    /gamification/leaderboard             - Get monthly leaderboard
```

### Achievements Endpoints
```
GET    /gamification/achievements            - Get all achievements
GET    /gamification/achievements/:userId    - Get user's achievements
POST   /gamification/achievements/:userId/check - Check for unlocks (called after session)
```

### Notifications Endpoints
```
GET    /gamification/notifications           - Get unread notifications
POST   /gamification/notifications/:id/read  - Mark as read
GET    /gamification/notification-preferences - Get preferences
PUT    /gamification/notification-preferences - Update preferences
```

---

## 🧪 Testing Checklist

### Backend Tests
- [ ] Streak increments on consecutive days
- [ ] Streak resets after gap > 1 day
- [ ] Freeze protects streak
- [ ] Points accumulate correctly
- [ ] Level increases at 100-point intervals
- [ ] Achievements unlock at correct thresholds
- [ ] Notifications are created and retrieved
- [ ] Leaderboard filters correctly by month

### Frontend Tests
- [ ] Streak card displays correctly
- [ ] Calendar highlights study days
- [ ] Points progress bar updates
- [ ] Achievement badges show unlock animations
- [ ] Notifications appear and disappear
- [ ] Settings persist preferences

### E2E Tests
- [ ] Complete session → streak increases → notification sent
- [ ] Earn points → level up → achievement unlocked → celebration
- [ ] Miss day → reminder sent → freeze saves streak
- [ ] Open leaderboard → see monthly rankings

---

## 📊 Success Metrics

### Quantitative
- ✅ **7-day retention:** Increase from current baseline to > 40%
- ✅ **Daily active users:** Increase by 30%
- ✅ **Average sessions/user:** Increase from 2 to 3+
- ✅ **Streak adoption:** > 60% of users with active streak

### Qualitative
- ✅ User feedback: "Motivation to keep my streak" (top reason cited)
- ✅ Social sharing: > 20% of achievements shared
- ✅ Preferences: > 75% keep notifications enabled

---

## 🚀 Rollout Plan

### Staged Rollout
1. **Week 3 (Internal Testing):** QA team tests all features
2. **Week 4 (Beta Users):** 10% of users get gamification
3. **Week 5 (Full Launch):** 100% rollout

### Monitoring
- Track achievement unlock rates (should be > 60% within first week)
- Monitor notification opt-in rate
- Watch for bugs in streak calculation (critical)
- Monitor job scheduler reliability

### Fallback Plan
- If achievement unlock breaks: Feature flag to disable
- If notifications cause spam: Default to opt-in instead of opt-out
- If leaderboard has performance issues: Cache top 100 instead of all users

---

## 📚 Dependencies

### Libraries
- `@nestjs/schedule` - For cron jobs
- `bullmq` or `bull` - For job queue (optional, can use cron)
- `zustand` - Frontend state for points/streaks (already installed)

### Installation
```bash
# Backend
npm install @nestjs/schedule

# Optional job queue
npm install bullmq redis

# Frontend is already set up with Zustand
```

---

## 💾 Migration from Phase 1

**Important:** Phase 2 builds on Phase 1's focus sessions. Ensure:
- ✅ Focus session table has `status` column
- ✅ Focus session table has `total_distractions` column
- ✅ All Phase 1 focus sessions completed before Phase 2 launch
- ✅ Database has proper indexes for performance

---

## 🎓 Documentation

After completion, create:
- [ ] User guide: "How Streaks Work" (in-app tooltip)
- [ ] Blog post: "New Gamification Features!"
- [ ] API documentation for new endpoints
- [ ] Admin dashboard to view gamification stats

---

## 📞 Support & Troubleshooting

**Common Issues:**

1. **Streak resets unexpectedly**
   - Check timezone handling in last_study_date
   - Verify cron job runs at correct time
   - Solution: Use UTC for all timestamps

2. **Achievements not unlocking**
   - Check if checkAchievements() is called after session complete
   - Verify achievement criteria logic
   - Solution: Add logging, check achievement criteria JSON

3. **Notifications not sent**
   - Check if preference.email_notifications is enabled
   - Verify cron job is running
   - Solution: Check job logs, test with manual trigger

---

**Status:** ✅ READY FOR IMPLEMENTATION  
**Next Step:** Start Week 1 backend development

---

## Quick Links

- Phase 1 Reference: `/docs/implementation/PHASE_1_COMPLETION_REPORT.md`
- API Format: `/docs/API_DOCUMENTATION.md`
- Database: Supabase PostgreSQL
- Frontend Components: Next.js + React
- Testing: Jest + Playwright

