-- ============================================
-- 完整修复 analytics_events 表
-- ============================================

-- 1. 先检查表是否存在
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_name = 'analytics_events'
) AS table_exists;

-- 2. 添加缺少的列（如果不存在）
ALTER TABLE analytics_events 
ADD COLUMN IF NOT EXISTS "sessionId" TEXT NOT NULL DEFAULT gen_random_uuid()::text;

ALTER TABLE analytics_events 
ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- 3. 添加其他可能缺少的列
ALTER TABLE analytics_events 
ADD COLUMN IF NOT EXISTS "userId" TEXT;

ALTER TABLE analytics_events 
ADD COLUMN IF NOT EXISTS "eventName" TEXT NOT NULL DEFAULT 'unknown';

ALTER TABLE analytics_events 
ADD COLUMN IF NOT EXISTS "eventCategory" TEXT NOT NULL DEFAULT 'general';

ALTER TABLE analytics_events 
ADD COLUMN IF NOT EXISTS "eventProperties" JSONB NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE analytics_events 
ADD COLUMN IF NOT EXISTS "pageUrl" TEXT;

ALTER TABLE analytics_events 
ADD COLUMN IF NOT EXISTS "referrer" TEXT;

ALTER TABLE analytics_events 
ADD COLUMN IF NOT EXISTS "userAgent" TEXT;

ALTER TABLE analytics_events 
ADD COLUMN IF NOT EXISTS "deviceType" TEXT;

ALTER TABLE analytics_events 
ADD COLUMN IF NOT EXISTS "browser" TEXT;

ALTER TABLE analytics_events 
ADD COLUMN IF NOT EXISTS "os" TEXT;

-- 4. 创建索引
CREATE INDEX IF NOT EXISTS idx_analytics_events_session 
ON analytics_events("sessionId", "createdAt");

CREATE INDEX IF NOT EXISTS idx_analytics_events_user 
ON analytics_events("userId", "createdAt");

CREATE INDEX IF NOT EXISTS idx_analytics_events_name 
ON analytics_events("eventName", "createdAt");

-- 5. 验证表结构
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'analytics_events'
ORDER BY ordinal_position;
