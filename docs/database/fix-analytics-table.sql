-- ============================================
-- 修复 analytics_events 表 - 添加缺失的 sessionId 列
-- ============================================

-- 1. 添加 sessionId 列（如果不存在）
ALTER TABLE analytics_events 
ADD COLUMN IF NOT EXISTS "sessionId" TEXT NOT NULL DEFAULT gen_random_uuid()::text;

-- 2. 添加索引以提升性能
CREATE INDEX IF NOT EXISTS idx_analytics_events_session 
ON analytics_events("sessionId", "createdAt");

-- 3. 验证表结构
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'analytics_events' 
ORDER BY ordinal_position;
