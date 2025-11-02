-- ============================================
-- 最终修复：添加所有缺失的 userId 列 + 清理缓存
-- ============================================

-- 1. 添加 userId 列到所有需要的表
ALTER TABLE api_usage_logs 
ADD COLUMN IF NOT EXISTS "userId" TEXT;

ALTER TABLE conversations 
ADD COLUMN IF NOT EXISTS "userId" TEXT;

ALTER TABLE documents 
ADD COLUMN IF NOT EXISTS "userId" TEXT;

-- 2. 清理旧的 snake_case userId 列
ALTER TABLE api_usage_logs DROP COLUMN IF EXISTS user_id;
ALTER TABLE conversations DROP COLUMN IF EXISTS user_id;
ALTER TABLE documents DROP COLUMN IF EXISTS user_id;

-- 3. 清理 prepared statements 缓存
DEALLOCATE ALL;

-- 4. 验证修复
SELECT 'Verification:' as status;
SELECT table_name, column_name 
FROM information_schema.columns 
WHERE table_name IN ('api_usage_logs', 'conversations', 'documents')
AND column_name LIKE '%userId%'
ORDER BY table_name, column_name;
