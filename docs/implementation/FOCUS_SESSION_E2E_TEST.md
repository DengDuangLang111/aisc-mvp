# 🚀 端到端真实场景测试指南

## 当前架构总结

✅ **已完成**
- 前端：集成 Supabase Auth + Google OAuth 登录
- 后端：JWT 认证 Guard + Focus Session API
- 数据库：单个共享 PostgreSQL（所有用户数据存在 `focus_sessions` 表，通过 `userId` 区分）
- 前端 Hook：`useFocusSession` 自动处理认证和 API 调用

## 测试步骤

### 前置准备
1. **确保服务器运行**
   ```bash
   # 后端（port 4001）- 已启动
   curl http://localhost:4001/health
   
   # 前端（port 3000） - 已启动
   ```

2. **检查 Supabase 配置**
   - 在 Supabase Dashboard 中确认 Google OAuth 已启用
   - 前端 `/apps/web/.env.local` 中的 `NEXT_PUBLIC_SUPABASE_URL` 和 `NEXT_PUBLIC_SUPABASE_ANON_KEY` 正确

### 场景 1：用户A 登录并创建会话

1. 在浏览器中打开 `http://localhost:3000`
2. 点击 "Sign in with Google"
3. 用 Google 账号登录（例如 user.a@gmail.com）
4. 登录成功后，导航到 `/chat` 页面
5. （需要前端集成）点击 "开始专注会话" 按钮
   - 这会调用 `/focus/sessions` POST 接口
   - 后端会从 JWT token 中自动提取用户 ID
   - 创建会话记录：`{ userId: "user-a-uuid", status: "active", startTime: "2025-11-05T..." }`

### 场景 2：用户A 在会话中记录干扰

1. 在专注会话中，点击 "记录干扰" 或自动检测到干扰（如标签页切换）
2. 调用 `/focus/sessions/{sessionId}/distractions` POST
3. 干扰会被记录到 `focus_distractions` 表
4. `focusSession.distractionCount` 会自动增加

### 场景 3：用户A 完成会话

1. 点击 "完成会话" 按钮
2. 调用 `/focus/sessions/{sessionId}/complete` POST
3. 会话状态更新为 `completed`，计算专注分数（0-100）
4. 系统自动生成分析报告（grade、insights）

### 场景 4：切换浏览器/设备，用户A 再次登录

1. **新浏览器或隐身窗口**：打开 `http://localhost:3000`
2. 点击 "Sign in with Google"
3. 用 **同一个 Google 账号**（user.a@gmail.com）登录
4. Supabase 识别这是同一用户（基于 Google ID），返回相同的 Supabase User UUID
5. 导航到 `/chat` → 点击 "我的会话列表"
6. **结果**：会看到之前创建的会话！
   - 调用 `GET /focus/sessions` → 后端根据 JWT 中的 userId 返回该用户的所有会话
   - 数据来自数据库的 `focus_sessions` 表，`userId` 匹配

### 场景 5：用户B 登录（数据隔离验证）

1. 在另一个浏览器/隐身窗口打开 `http://localhost:3000`
2. 点击 "Sign in with Google"
3. 用 **不同的 Google 账号**（user.b@gmail.com）登录
4. 登录后，Supabase 创建一个新的 User UUID
5. 导航到 `/ chat` → 点击 "我的会话列表"
6. **结果**：**没有** 用户A的会话，只能看到用户B自己的会话
   - 后端 `getUserSessions()` 检查 JWT 中的 userId
   - 只返回 `focus_sessions.userId === userB_uuid` 的记录
   - 其他用户的会话对用户B 不可见（ForbiddenException）

## 架构保证数据隔离

### 后端层面的保护

```typescript
// 每个端点都使用 @UseGuards(SupabaseAuthGuard)
@Get('sessions/:id')
@UseGuards(SupabaseAuthGuard)
async getSession(@Param('id') sessionId: string, @Req() req: Request) {
  const userId = req.user.sub; // 从 JWT 自动提取
  return this.focusService.getSession(sessionId, userId); // 权限校验
}

// Service 检查权限
async getSession(sessionId: string, userId: string) {
  const session = await this.prisma.focusSession.findUnique({ where: { id } });
  if (session.userId !== userId) {
    throw new ForbiddenException(); // 用户只能访问自己的会话
  }
  return session;
}
```

### 数据库层面

- 单个 PostgreSQL 实例 (Supabase)
- `focus_sessions` 表包含 `userId` 列
- 用户身份由 Supabase Auth 保证（OAuth with Google）
- 每个用户的 UUID 由 Supabase 生成，全局唯一

## 验证清单

- [ ] **用户A 登录** → Supabase 返回 User ID（UUID）和 JWT token
- [ ] **用户A 创建会话** → 会话记录插入数据库，`userId = User A's UUID`
- [ ] **用户A 完成会话** → 查看分析报告（分数、等级、建议）
- [ ] **用户A 切换浏览器登录** → 看到同一用户的会话列表（数据持久化）
- [ ] **用户B 登录** → 得到不同的 UUID 和 JWT token
- [ ] **用户B 查看会话列表** → 只看到自己的会话（数据隔离）
- [ ] **用户B 尝试访问用户A 的会话** → 返回 403 Forbidden（权限校验）

## 关键 API 端点（需要 JWT 认证）

```
POST   /focus/sessions                    # 创建会话
PUT    /focus/sessions/:id                # 更新会话
POST   /focus/sessions/:id/distractions   # 记录干扰
POST   /focus/sessions/:id/complete       # 完成会话
GET    /focus/sessions/:id                # 获取会话详情
GET    /focus/sessions/:id/analytics      # 获取分析报告
GET    /focus/sessions                    # 获取用户的会话列表（分页）
```

所有请求都需要在 header 中附带：
```
Authorization: Bearer <JWT_TOKEN>
```

## 下一步

1. **前端 UI 集成**
   - 在 `/app/chat/page.tsx` 中集成 `useFocusSession` hook
   - 添加 "开始专注会话"、"记录干扰"、"完成会话" 按钮
   - 显示会话列表和分析报告

2. **Work Completion Flow**
   - 创建完成证明上传组件（文件/截图）
   - 关联到 `focus_sessions.completionProofId`

3. **Session Report 页面**
   - 创建 `/app/focus/report/[sessionId]/page.tsx`
   - 显示分数、等级、建议、时间线图表

4. **监控和日志**
   - 记录用户的会话创建/完成事件
   - 生成每日/每周的专注统计
