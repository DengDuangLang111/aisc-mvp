-- ============================================
-- 清理 PostgreSQL 预编译语句缓存
-- ============================================

-- 方法 1: 清理所有 prepared statements
DEALLOCATE ALL;

-- 方法 2: 断开当前连接并重新连接
-- （这个会在 Supabase 控制台执行后自动重连）

SELECT 'Prepared statements cleared' as status;
