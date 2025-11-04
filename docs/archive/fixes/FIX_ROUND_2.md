# 🔧 第二轮修复 - 解决剩余问题

## 新发现的问题

1. ❌ `api_usage_logs` 表缺少 `statusCode` 等列
2. ❌ `analytics_events` 表有重复的 snake_case 列（`session_id`, `created_at` 等）

## 解决方案

### 在 Supabase SQL Editor 中执行以下 SQL：

```sql
-- 1. 修复 api_usage_logs 表（添加缺失列）
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

-- 2. 清理 analytics_events 表的重复 snake_case 列
ALTER TABLE analytics_events DROP COLUMN IF EXISTS "session_id";
ALTER TABLE analytics_events DROP COLUMN IF EXISTS "created_at";
ALTER TABLE analytics_events DROP COLUMN IF EXISTS "user_id";
ALTER TABLE analytics_events DROP COLUMN IF EXISTS "event_name";
ALTER TABLE analytics_events DROP COLUMN IF EXISTS "event_category";
ALTER TABLE analytics_events DROP COLUMN IF EXISTS "event_properties";
ALTER TABLE analytics_events DROP COLUMN IF EXISTS "page_url";
ALTER TABLE analytics_events DROP COLUMN IF EXISTS "user_agent";
ALTER TABLE analytics_events DROP COLUMN IF EXISTS "device_type";

-- 3. 验证修复结果
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'analytics_events'
AND column_name IN ('sessionId', 'createdAt', 'userId', 'eventName')
ORDER BY column_name;
```

## 执行完成后

**告诉我 "第二轮 SQL 完成"**

我会再次重启 API 并测试所有功能！

---

**这次会彻底解决数据库表结构问题！** 🚀
