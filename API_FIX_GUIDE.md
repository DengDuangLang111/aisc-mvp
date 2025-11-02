# 🔧 API 修复指南

## 当前状态

✅ **前端**: 运行正常 (localhost:3000)  
✅ **后端 API**: 已启动 (localhost:4001)  
❌ **数据库**: Schema 不匹配 - 缺少 `sessionId` 列

## 🎯 需要执行的步骤

### 步骤 1: 在 Supabase 修复数据库 ⚠️ **需要你手动操作**

1. **登录 Supabase**
   - 访问: https://supabase.com
   - 登录你的账号
   - 选择项目: `study-oasis` (或你的项目名)

2. **打开 SQL Editor**
   - 左侧菜单 → 点击 "SQL Editor"
   - 点击 "New query" 创建新查询

3. **执行以下 SQL**
   ```sql
   -- 添加缺失的 sessionId 列
   ALTER TABLE analytics_events 
   ADD COLUMN IF NOT EXISTS "sessionId" TEXT NOT NULL DEFAULT gen_random_uuid()::text;

   -- 添加索引
   CREATE INDEX IF NOT EXISTS idx_analytics_events_session 
   ON analytics_events("sessionId", "createdAt");

   -- 验证（可选 - 查看结果）
   SELECT column_name, data_type, is_nullable 
   FROM information_schema.columns 
   WHERE table_name = 'analytics_events' 
   ORDER BY ordinal_position;
   ```

4. **点击 "Run" 执行**

5. **确认成功**
   - 应该看到 "Success" 消息
   - 验证查询应该显示 `sessionId` 列

---

### 步骤 2: 重启 API 服务器

执行这个命令：

```bash
# 停止当前 API
pkill -f "node.*main.js"

# 重新启动
/Users/knight/study_oasis_simple/start-api.sh > /tmp/api.log 2>&1 &

# 等待 3 秒
sleep 3

# 测试
curl http://localhost:4001/health
```

---

### 步骤 3: 测试完整功能

```bash
# 运行测试脚本
/Users/knight/study_oasis_simple/test-api.sh
```

---

## 📊 预期结果

执行完成后，你应该看到：

✅ 健康检查: 返回 `{"status":"healthy",...}`  
✅ 文件上传: 返回包含 `documentId` 的 JSON  
✅ AI 对话: 返回 AI 生成的回复  

---

## 🔍 如果还有问题

检查 API 日志：
```bash
tail -f /tmp/api.log
```

检查数据库连接：
```bash
cd /Users/knight/study_oasis_simple/apps/api
export DATABASE_URL="postgresql://postgres.rtdbfisxskunrkjmjpvv:DuDu7622-Arknights@aws-1-us-east-1.pooler.supabase.com:6543/postgres"
npx prisma db pull
```

---

## 🎉 完成后

访问以下地址测试：

- 前端: http://localhost:3000
- API 文档: http://localhost:4001/api-docs
- 健康检查: http://localhost:4001/health

