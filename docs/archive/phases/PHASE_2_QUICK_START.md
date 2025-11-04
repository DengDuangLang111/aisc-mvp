# Phase 2 快速启动指南

**最后更新**: 2025-11-02  
**完成度**: 95% (SSE 基础实现已完成，UI 集成待补充)

## 🚀 快速开始

### 1. 启动系统

```bash
# 终端 1: 启动后端
cd /Users/knight/study_oasis_simple/apps/api
npm run start

# 终端 2: 启动前端
cd /Users/knight/study_oasis_simple/apps/web
npm run dev
```

### 2. 验证系统就绪

```bash
# 检查后端健康状态
curl http://localhost:4001/health

# 检查前端
curl http://localhost:3000/chat
```

---

## ✨ 新功能演示

### 功能 1️⃣: 对话上下文（已修复）

**场景**: 多轮对话自动保存和恢复

**测试步骤**:

1. 打开 http://localhost:3000/chat

2. 发送第一条消息:
   ```
   "请帮我解释一下什么是光合作用"
   ```

3. 观察控制台日志，记下 `conversationId`（应该类似 `conv-xxx`）

4. 发送第二条消息:
   ```
   "能给我举个例子吗？"
   ```

5. **预期结果**:
   - ✅ 两条消息在同一个对话中
   - ✅ AI 回复会参考第一条消息的内容
   - ✅ hint level 从 1 递增到 2
   - ✅ 刷新页面后，两条消息仍然存在

**验证方式**:

打开浏览器开发者工具 (F12) → Application → LocalStorage

查看 `study_oasis_sessions` 中是否包含：
```json
{
  "id": "session-xxx",
  "fileId": null,
  "messages": [
    {"role": "user", "content": "..."},
    {"role": "assistant", "content": "..."}
  ],
  "conversationId": "conv-xxx"
}
```

---

### 功能 2️⃣: 文件上传集成（新增）

**场景**: 上传 PDF/图片 → 自动 OCR → 对话中引用

**测试步骤**:

1. 在聊天页面找到文件上传按钮（📎 图标）

2. 点击选择一个 PDF 或图片文件

3. 观察过程:
   - [ ] 文件上传进行中...
   - [ ] 显示"已上传文档: filename.pdf"
   - [ ] 开始"正在识别文本..."
   - [ ] OCR 完成后显示识别结果摘要

4. 在上传完成后提问:
   ```
   "这份文档主要讲了什么？"
   ```

5. **预期结果**:
   - ✅ AI 回复应该基于文档内容
   - ✅ 回复中应该有对文档的引用
   - ✅ conversationId 保持一致

**API 直接测试**:

```bash
# 1. 上传文件
curl -F "file=@/path/to/test.pdf" http://localhost:4001/upload

# 响应示例:
# {
#   "id": "upload-abc123",
#   "filename": "test.pdf",
#   "url": "http://localhost:4001/uploads/upload-abc123.pdf",
#   "size": 102400,
#   "mimeType": "application/pdf"
# }

# 2. 轮询 OCR（等待 1-5 分钟）
curl http://localhost:4001/upload/documents/upload-abc123/ocr

# 3. 在对话中使用
curl -X POST http://localhost:4001/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "这个文档讲了什么？",
    "uploadId": "upload-abc123",
    "conversationHistory": []
  }'
```

---

### 功能 3️⃣: SSE 流式响应（已实现）

**场景**: AI 回复逐字符显示（打字机效果）

**测试步骤**:

1. 打开浏览器开发者工具 → Network 标签

2. 使用 curl 测试 SSE 端点:
   ```bash
   curl -N "http://localhost:4001/chat/stream?message=请解释牛顿第一定律&conversationId=&uploadId="
   ```

3. **预期输出** (SSE 格式):
   ```
   data: {"token":"请","complete":false}
   data: {"token":"解","complete":false}
   data: {"token":"释","complete":false}
   ...
   data: {"token":"","complete":true,"conversationId":"conv-xxx"}
   ```

4. **在前端中** (待实现 UI):
   - 消息应该逐字显示
   - 有打字机动画效果
   - 最后一个 chunk 表示完成

---

## 📊 系统状态检查

### 检查清单

运行自动化验证:

```bash
cd /Users/knight/study_oasis_simple
chmod +x test-phase2.sh
./test-phase2.sh
```

**预期输出**:
```
=== Phase 2 Integration Test ===

▶ Test: Backend Health Check
✅ PASS

▶ Test: First Message (Conversation Context)
✅ PASS - conversationId: conv-xxx

▶ Test: Second Message (Context Continuity)
✅ PASS - Context maintained

▶ Test: Get Conversations API
✅ PASS

▶ Test: SSE Stream Endpoint
✅ PASS - SSE endpoint responds

▶ Test: Frontend Type Definitions
✅ PASS - useChatLogic updated with conversationId

▶ Test: Frontend API Client
✅ PASS - ApiClient has chatStream method

▶ Test: Type Contracts
✅ PASS - Contracts updated with conversationId

=== Test Summary ===
Passed: 8
Failed: 0

✅ All tests passed!
```

---

## 🐛 故障排查

### 问题 1: 对话上下文仍然丢失

**症状**:
- 第二条消息看不到第一条内容
- 每条消息都有不同的 conversationId

**排查步骤**:

```bash
# 1. 检查后端日志
tail -f apps/api/logs/app.log

# 2. 检查数据库中的对话
docker exec postgres psql -U postgres -d study_oasis -c \
  "SELECT id, title FROM conversations ORDER BY created_at DESC LIMIT 5;"

# 3. 检查前端状态
# 打开 DevTools → Console，运行：
localStorage.getItem('study_oasis_sessions')

# 应该显示：
# {
#   "sessions": [
#     {
#       "id": "...",
#       "conversationId": "conv-xxx",
#       "messages": [...]
#     }
#   ]
# }
```

**解决方案**:
1. 清除浏览器缓存: `localStorage.clear()`
2. 重新启动后端服务
3. 重新开始对话

---

### 问题 2: 文件上传失败

**症状**:
- 上传时报 404 或 500
- 没有显示"已上传"消息

**排查步骤**:

```bash
# 1. 检查 uploads 目录
ls -la apps/api/uploads

# 2. 如果不存在，创建它
mkdir -p apps/api/uploads
chmod 755 apps/api/uploads

# 3. 查看后端错误日志
tail -50 apps/api/logs/app.log | grep -i upload

# 4. 尝试直接上传测试
curl -v -F "file=@test.txt" http://localhost:4001/upload
```

**解决方案**:
1. 确保 uploads 目录存在且可写
2. 检查 Prisma 数据库连接
3. 重启后端服务

---

### 问题 3: SSE 流式连接失败

**症状**:
- SSE 端点返回 404 或 500
- 没有看到 `data: ` 事件

**排查步骤**:

```bash
# 1. 测试 SSE 端点
curl -v "http://localhost:4001/chat/stream?message=test&conversationId=&uploadId="

# 查看 Headers，应该看到：
# Content-Type: text/event-stream
# Cache-Control: no-cache
# Connection: keep-alive

# 2. 检查是否有 CORS 错误
# 前端 DevTools → Console
# 查看是否有红色的 CORS 错误

# 3. 查看后端日志
tail -f apps/api/logs/app.log
```

**解决方案**:
1. 确保后端 SSE 端点已部署 (`GET /chat/stream`)
2. 检查 CORS 配置 (main.ts)
3. 检查 DeepSeek API 密钥配置

---

## 📈 性能测试

### 基准测试

```bash
# 测试对话响应时间
time curl -X POST http://localhost:4001/chat \
  -H "Content-Type: application/json" \
  -d '{"message":"1+1=?","conversationHistory":[]}'

# 预期: < 2 秒

# 测试 SSE 流式响应时间
time curl -N "http://localhost:4001/chat/stream?message=test&conversationId=&uploadId=" \
  | head -20

# 预期: < 3 秒
```

### 监控系统资源

```bash
# 查看 Node 进程内存使用
ps aux | grep node

# 查看数据库连接
docker exec postgres psql -U postgres -c \
  "SELECT datname, count(*) FROM pg_stat_activity GROUP BY datname;"
```

---

## 📝 API 端点快速参考

### 聊天相关

| 端点 | 方法 | 说明 | 状态 |
|-----|------|------|------|
| `/chat` | POST | 发送聊天消息（普通） | ✅ |
| `/chat/stream` | GET | 发送聊天消息（流式 SSE） | ✅ |
| `/chat/conversations` | GET | 获取对话列表 | ✅ |
| `/chat/conversations/:id` | GET | 获取对话详情 | ✅ |
| `/chat/conversations/:id` | DELETE | 删除对话 | ✅ |

### 文件相关

| 端点 | 方法 | 说明 | 状态 |
|-----|------|------|------|
| `/upload` | POST | 上传文件 | ✅ |
| `/upload/documents` | GET | 获取文档列表 | ✅ |
| `/upload/documents/:id` | GET | 获取文档详情 | ✅ |
| `/upload/documents/:id/ocr` | GET | 获取 OCR 结果 | ✅ |
| `/upload/documents/:id` | DELETE | 删除文档 | ✅ |

---

## 🎯 下一步计划

### 立即可做（今天）
- [ ] 运行 `test-phase2.sh` 验证所有功能
- [ ] 在浏览器中测试对话上下文功能
- [ ] 上传一个文件测试 OCR 流程
- [ ] 检查 SSE 端点是否返回正确格式

### 短期改进（明天-后天）
- [ ] 实现打字机效果 UI (MessageBubble.tsx)
- [ ] 改进上传进度条显示
- [ ] 添加错误恢复机制
- [ ] 单元测试补充

### 中期改进（本周末）
- [ ] 用户认证系统 (Task 9)
- [ ] WebSocket 替代轮询
- [ ] 消息编辑和删除
- [ ] 对话导出功能

---

## 💡 常用命令速查

```bash
# 启动系统
cd apps/api && npm run start &
cd apps/web && npm run dev &

# 运行验证脚本
./test-phase2.sh

# 查看日志
tail -f apps/api/logs/app.log

# 清除缓存重新测试
curl http://localhost:3000/chat -c /dev/null

# 测试对话创建
curl -X POST http://localhost:4001/chat \
  -H "Content-Type: application/json" \
  -d '{"message":"Hello","conversationHistory":[]}'

# 测试 SSE 流式
curl -N "http://localhost:4001/chat/stream?message=Hello"

# 查看数据库
docker exec postgres psql -U postgres -d study_oasis -c \
  "SELECT * FROM conversations LIMIT 5;"
```

---

## 📚 相关文档

- 📋 [Phase 2 实现方案](./PHASE_2_IMPLEMENTATION_PLAN.md)
- ✅ [Phase 2 完成报告](./PHASE_2_COMPLETION_REPORT.md)
- 🔍 [验证指南](./PHASE_2_VERIFICATION_GUIDE.md)
- 🎯 [产品 TODO](./PRODUCT_TODO_SUMMARY.md)

---

**状态**: 🟢 准备就绪，可以开始测试

**需要帮助?** 查看 `PHASE_2_VERIFICATION_GUIDE.md` 中的故障排查部分。
