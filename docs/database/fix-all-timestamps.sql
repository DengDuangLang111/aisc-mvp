-- ============================================
-- 一次性修复所有数据库表的 createdAt/updatedAt 列
-- ============================================

-- 1. users 表
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- 2. documents 表
ALTER TABLE documents 
ADD COLUMN IF NOT EXISTS "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- 3. ocr_results 表
ALTER TABLE ocr_results 
ADD COLUMN IF NOT EXISTS "extractedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- 4. conversations 表（关键！）
ALTER TABLE conversations 
ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE conversations 
ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- 5. messages 表
ALTER TABLE messages 
ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- 6. analytics_events 表（已修复，但再确认一次）
ALTER TABLE analytics_events 
ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- 7. api_usage_logs 表（关键！）
ALTER TABLE api_usage_logs 
ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- 8. user_daily_stats 表
ALTER TABLE user_daily_stats 
ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE user_daily_stats 
ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- 9. 清理所有旧的 snake_case 时间戳列（避免冲突）
ALTER TABLE users DROP COLUMN IF EXISTS created_at;
ALTER TABLE documents DROP COLUMN IF EXISTS uploaded_at;
ALTER TABLE ocr_results DROP COLUMN IF EXISTS extracted_at;
ALTER TABLE conversations DROP COLUMN IF EXISTS created_at;
ALTER TABLE conversations DROP COLUMN IF EXISTS updated_at;
ALTER TABLE messages DROP COLUMN IF EXISTS created_at;
ALTER TABLE analytics_events DROP COLUMN IF EXISTS created_at;
ALTER TABLE api_usage_logs DROP COLUMN IF EXISTS created_at;
ALTER TABLE user_daily_stats DROP COLUMN IF EXISTS created_at;
ALTER TABLE user_daily_stats DROP COLUMN IF EXISTS updated_at;

-- 10. 验证所有关键表
SELECT 'users:' as table_name, column_name 
FROM information_schema.columns 
WHERE table_name = 'users' AND column_name LIKE '%created%'
UNION ALL
SELECT 'conversations:', column_name 
FROM information_schema.columns 
WHERE table_name = 'conversations' AND column_name LIKE '%At'
UNION ALL
SELECT 'api_usage_logs:', column_name 
FROM information_schema.columns 
WHERE table_name = 'api_usage_logs' AND column_name LIKE '%created%';
