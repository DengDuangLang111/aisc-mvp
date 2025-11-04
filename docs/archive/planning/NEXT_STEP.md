# 🎯 立即行动 - 修复 API 最后一步

## ✅ 当前状态

- ✅ **前端**: 正常运行在 http://localhost:3000
- ✅ **API**: 正常运行在 http://localhost:4001  
- ✅ **健康检查**: 通过
- ❌ **文件上传/AI对话**: 失败 (数据库列缺失)

---

## 🚨 你需要做的事情（5分钟）

### 唯一需要手动操作的步骤：

#### 📝 在 Supabase 执行 SQL

1. **打开浏览器，访问**: https://supabase.com
2. **登录并选择你的项目**
3. **左侧菜单 → SQL Editor**
4. **粘贴并执行这段 SQL**:

```sql
ALTER TABLE analytics_events 
ADD COLUMN IF NOT EXISTS "sessionId" TEXT NOT NULL DEFAULT gen_random_uuid()::text;

CREATE INDEX IF NOT EXISTS idx_analytics_events_session 
ON analytics_events("sessionId", "createdAt");
```

5. **点击 Run 按钮**
6. **看到 "Success" 后回来告诉我**

---

## 🔄 执行完 SQL 后，我会帮你：

1. 重启 API 服务器
2. 测试文件上传功能
3. 测试 AI 对话功能
4. 验证所有功能正常

---

## 📋 备注

- SQL 文件已保存在: `docs/database/fix-analytics-table.sql`
- 完整指南在: `API_FIX_GUIDE.md`
- 这是唯一需要在 Supabase 手动操作的步骤
- 执行后立即生效，无需重启数据库

---

**执行完告诉我，我会继续后续步骤！** 🚀
