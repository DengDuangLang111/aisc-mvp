# 🔧 完整修复 SQL - 立即执行

## 问题诊断
- ❌ `analytics_events` 表缺少 `sessionId` 列
- ❌ `analytics_events` 表缺少 `createdAt` 列
- ❌ 可能还缺少其他列

## 解决方案

### 在 Supabase SQL Editor 中执行以下 SQL：

```sql
-- 添加缺少的核心列
ALTER TABLE analytics_events 
ADD COLUMN IF NOT EXISTS "sessionId" TEXT NOT NULL DEFAULT gen_random_uuid()::text;

ALTER TABLE analytics_events 
ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- 添加其他必需列
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

-- 创建性能索引
CREATE INDEX IF NOT EXISTS idx_analytics_events_session 
ON analytics_events("sessionId", "createdAt");

CREATE INDEX IF NOT EXISTS idx_analytics_events_user 
ON analytics_events("userId", "createdAt");

CREATE INDEX IF NOT EXISTS idx_analytics_events_name 
ON analytics_events("eventName", "createdAt");

-- 验证修复结果
SELECT 
  column_name, 
  data_type, 
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'analytics_events'
ORDER BY ordinal_position;
```

## 执行步骤

1. ✅ 复制上面的整段 SQL
2. ✅ 粘贴到 Supabase SQL Editor
3. ✅ 点击 "Run" 按钮
4. ✅ 等待执行完成
5. ✅ 查看最后的验证结果，确认所有列都存在

## 预期结果

你应该看到表结构包含这些列：
- ✅ `id`
- ✅ `sessionId`
- ✅ `createdAt`
- ✅ `userId`
- ✅ `eventName`
- ✅ `eventCategory`
- ✅ `eventProperties`
- ✅ 其他列...

## 执行完成后

**告诉我 "SQL 执行完成" 或直接截图验证结果**

我会立即：
1. 重启 API
2. 运行完整测试
3. 验证所有功能正常

---

**这次的 SQL 更完整，会一次性修复所有缺失的列！** 🚀
