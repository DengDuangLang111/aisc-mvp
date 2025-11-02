-- ============================================
-- 完整修复所有数据库表问题
-- ============================================

-- 1. 修复 api_usage_logs 表
ALTER TABLE api_usage_logs 
ADD COLUMN IF NOT EXISTS "statusCode" INTEGER;

ALTER TABLE api_usage_logs 
ADD COLUMN IF NOT EXISTS "responseTimeMs" INTEGER;

ALTER TABLE api_usage_logs 
ADD COLUMN IF NOT EXISTS "requestSizeBytes" INTEGER;

ALTER TABLE api_usage_logs 
ADD COLUMN IF NOT EXISTS "responseSizeBytes" INTEGER;

ALTER TABLE api_usage_logs 
ADD COLUMN IF NOT EXISTS "externalApiCalls" JSONB NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE api_usage_logs 
ADD COLUMN IF NOT EXISTS "errorMessage" TEXT;

ALTER TABLE api_usage_logs 
ADD COLUMN IF NOT EXISTS "errorStack" TEXT;

-- 2. 确保 analytics_events 表使用正确的命名
-- 检查是否有 snake_case 列名，如果有则删除重复列
ALTER TABLE analytics_events 
DROP COLUMN IF EXISTS "session_id";

ALTER TABLE analytics_events 
DROP COLUMN IF EXISTS "created_at";

ALTER TABLE analytics_events 
DROP COLUMN IF EXISTS "user_id";

ALTER TABLE analytics_events 
DROP COLUMN IF EXISTS "event_name";

ALTER TABLE analytics_events 
DROP COLUMN IF EXISTS "event_category";

ALTER TABLE analytics_events 
DROP COLUMN IF EXISTS "event_properties";

ALTER TABLE analytics_events 
DROP COLUMN IF EXISTS "page_url";

ALTER TABLE analytics_events 
DROP COLUMN IF EXISTS "user_agent";

ALTER TABLE analytics_events 
DROP COLUMN IF EXISTS "device_type";

-- 3. 验证最终表结构
SELECT 'analytics_events columns:' as info;
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'analytics_events'
ORDER BY ordinal_position;

SELECT 'api_usage_logs columns:' as info;
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'api_usage_logs'
ORDER BY ordinal_position;
