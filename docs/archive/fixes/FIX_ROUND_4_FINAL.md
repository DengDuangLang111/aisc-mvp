w# 🔧 最终修复 - 修复所有表的时间戳列

## 问题诊断

多个表缺少 `createdAt` / `updatedAt` 列：
- ❌ `conversations` 表
- ❌ `api_usage_logs` 表
- ❌ 其他表可能也有问题

## 一次性解决方案

### 在 Supabase SQL Editor 中执行以下完整 SQL：

```sql
-- 添加所有表的时间戳列
ALTER TABLE users ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE ocr_results ADD COLUMN IF NOT EXISTS "extractedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- 关键表：conversations
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- 关键表：messages
ALTER TABLE messages ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- 关键表：api_usage_logs
ALTER TABLE api_usage_logs ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- user_daily_stats
ALTER TABLE user_daily_stats ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE user_daily_stats ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- 清理旧的 snake_case 列（避免冲突）
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
```

## 执行完成后

**告诉我 "时间戳修复完成" 或 "done"**

我会：
1. ✅ 再次清理缓存 (`DEALLOCATE ALL`)
2. ✅ 重启 API
3. ✅ 完整测试所有功能

---

**这次会彻底解决所有数据库表结构问题！** 🚀
