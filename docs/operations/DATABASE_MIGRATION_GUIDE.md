# 数据库迁移指南

## 前提条件
- ✅ Supabase 项目已创建
- ✅ 已获取数据库连接字符串

## 步骤 1: 更新环境变量

1. 编辑 `apps/api/.env` 文件
2. 替换 DATABASE_URL：
```bash
DATABASE_URL="postgresql://postgres:[YOUR-PASSWORD]@db.xxx.supabase.co:5432/postgres"
```

## 步骤 2: 生成 Prisma Client

```bash
cd apps/api
npx prisma generate
```

**预期输出**:
```
✔ Generated Prisma Client
```

## 步骤 3: 运行数据库迁移

```bash
npx prisma migrate dev --name init
```

**预期输出**:
```
Environment variables loaded from .env
Prisma schema loaded from prisma/schema.prisma
Datasource "db": PostgreSQL database "postgres", schema "public" at "db.xxx.supabase.co:5432"

Applying migration `20251101000000_init`

The following migration(s) have been created and applied from new schema changes:

migrations/
  └─ 20251101000000_init/
    └─ migration.sql

Your database is now in sync with your schema.

✔ Generated Prisma Client
```

**这会创建 8 个数据表**:
- ✅ users
- ✅ documents
- ✅ ocr_results
- ✅ conversations
- ✅ messages
- ✅ analytics_events
- ✅ api_usage_logs
- ✅ user_daily_stats

## 步骤 4: 验证数据库

```bash
npx prisma studio
```

这会打开一个浏览器窗口（http://localhost:5555），你可以看到所有创建的表。

## 步骤 5: 验证编译

```bash
pnpm run build
```

**预期**: ✅ 编译成功，无错误

## 步骤 6: 运行 E2E 测试

```bash
pnpm test:e2e cloud-integration.e2e-spec
```

**预期**: 9 个测试步骤全部通过

## 故障排查

### 问题 1: 连接失败
```
Error: P1001: Can't reach database server
```

**解决方案**:
- 检查 DATABASE_URL 是否正确
- 检查 Supabase 项目是否处于活动状态
- 检查网络连接

### 问题 2: 权限错误
```
Error: P3014: Prisma Migrate could not create the shadow database
```

**解决方案**:
在 Supabase Dashboard 中:
1. 进入 SQL Editor
2. 运行:
```sql
GRANT ALL ON SCHEMA public TO postgres;
```

### 问题 3: 迁移已存在
```
Error: The migration has already been applied
```

**解决方案**:
```bash
npx prisma migrate resolve --applied 20251101000000_init
```

## 成功验证清单

- [ ] Prisma Client 生成成功
- [ ] 迁移成功应用
- [ ] Prisma Studio 可以看到 8 个表
- [ ] 编译成功
- [ ] E2E 测试通过（9/9）

## 下一步

迁移成功后:
1. ✅ 配置 Google Cloud API Keys
2. ✅ 配置 DeepSeek API Key
3. ✅ 运行本地测试
4. ✅ 部署到生产环境

---

**需要帮助?** 如果遇到任何问题，请告诉我具体的错误信息。
