# Phase 2 数据库迁移脚本

## 1. Streaks 系统

```sql
-- Create user_streaks table
CREATE TABLE user_streaks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  current_streak INT DEFAULT 0,
  longest_streak INT DEFAULT 0,
  last_study_date DATE,
  freeze_count INT DEFAULT 0,
  freeze_last_used_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_user_streaks_user_id ON user_streaks(user_id);
```

---

## 2. Points & Leveling 系统

```sql
-- Create user_points table
CREATE TABLE user_points (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  total_points INT DEFAULT 0,
  current_level INT DEFAULT 1,
  points_in_current_level INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create point_transactions table
CREATE TABLE point_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  points INT NOT NULL,
  reason VARCHAR(100) NOT NULL,
  reference_id UUID,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_user_points_user_id ON user_points(user_id);
CREATE INDEX idx_point_transactions_user_id ON point_transactions(user_id, created_at DESC);
```

---

## 3. Achievements & Badges 系统

```sql
-- Create achievements table
CREATE TABLE achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  icon VARCHAR(50),
  points_reward INT DEFAULT 0,
  criteria JSONB NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create user_achievements table
CREATE TABLE user_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  achievement_id UUID NOT NULL REFERENCES achievements(id),
  earned_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, achievement_id)
);

CREATE INDEX idx_user_achievements_user_id ON user_achievements(user_id);
```

---

## 4. Notifications & Reminders 系统

```sql
-- Create user_notification_preferences table
CREATE TABLE user_notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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

-- Create user_notifications table
CREATE TABLE user_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(200) NOT NULL,
  body TEXT,
  type VARCHAR(50),
  read BOOLEAN DEFAULT false,
  action_url VARCHAR(500),
  created_at TIMESTAMP DEFAULT NOW(),
  read_at TIMESTAMP
);

CREATE INDEX idx_user_notification_preferences_user_id ON user_notification_preferences(user_id);
CREATE INDEX idx_user_notifications_user_id ON user_notifications(user_id, created_at DESC);
CREATE INDEX idx_user_notifications_unread ON user_notifications(user_id, read) WHERE read = false;
```

---

## 5. 插入初始成就数据

```sql
INSERT INTO achievements (code, name, description, icon, points_reward, criteria) VALUES
('first-session', 'First Focus', 'Complete your first focus session', '🎯', 50, '{"type":"session_count","value":1}'::jsonb),
('streak-7', '7-Day Streak', 'Maintain a 7-day study streak', '🔥', 100, '{"type":"streak","value":7}'::jsonb),
('streak-30', 'Marathon', 'Maintain a 30-day study streak', '🏃', 500, '{"type":"streak","value":30}'::jsonb),
('level-5', 'Level 5', 'Reach level 5 (500 points)', '⭐', 0, '{"type":"level","value":5}'::jsonb),
('perfect-focus', 'Perfect Focus', 'Complete a session with zero distractions', '💎', 200, '{"type":"distractions","value":0}'::jsonb),
('homework-hero', 'Homework Hero', 'Complete 10 focus sessions', '🦸', 150, '{"type":"session_count","value":10}'::jsonb),
('question-master', 'Question Master', 'Ask 50 questions to AI', '🧠', 100, '{"type":"questions_asked","value":50}'::jsonb);
```

---

## 注意事项

1. **创建迁移：** 运行 `npx prisma migrate dev --name add_gamification_tables`
2. **验证表：** 在 Supabase 仪表板中检查所有表是否创建
3. **索引性能：** 索引对 user_id 和日期的查询至关重要
4. **时区处理：** 所有时间戳使用 UTC
5. **数据备份：** 在应用迁移前备份生产数据库

