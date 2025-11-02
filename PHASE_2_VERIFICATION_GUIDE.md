# Phase 2 实现验证指南

## 1. 对话上下文功能验证 ✅

### 步骤 1: 第一条消息
```bash
curl -X POST http://localhost:4001/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "1 + 2 = ?",
    "conversationHistory": []
  }'
```

**预期响应**:
```json
{
  "reply": "这是一个很好的数学问题...",
  "hintLevel": 1,
  "timestamp": 1698765432000,
  "conversationId": "conv-xxx",
  "tokensUsed": 150
}
```

**关键字段**: `conversationId` 必须返回

### 步骤 2: 第二条消息（使用 conversationId）
```bash
curl -X POST http://localhost:4001/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "能给我一些提示吗？",
    "conversationId": "conv-xxx",  # 使用上一条的 ID
    "conversationHistory": [
      {"role": "user", "content": "1 + 2 = ?"},
      {"role": "assistant", "content": "这是一个很好的数学问题..."}
    ]
  }'
```

**预期结果**:
- ✅ 第二条消息的 hintLevel 应该是 2（递增）
- ✅ 消息保存到同一个对话中
- ✅ conversationId 保持不变

### 验证：检查数据库
```sql
SELECT id, title, message_count, created_at FROM conversations;
SELECT conversation_id, role, content, created_at FROM messages;
```

---

## 2. 文件上传流程验证 ✅

### 步骤 1: 上传文件
```bash
# 准备一个 PDF 或图片文件
curl -X POST http://localhost:4001/upload \
  -F "file=@/path/to/document.pdf"
```

**预期响应**:
```json
{
  "id": "upload-123",
  "filename": "document.pdf",
  "url": "http://localhost:4001/uploads/upload-123.pdf",
  "size": 1024000,
  "mimeType": "application/pdf"
}
```

### 步骤 2: 轮询 OCR 结果
```bash
# 立即查询（返回 404 或 processing）
curl http://localhost:4001/upload/documents/upload-123/ocr

# 等待 2-5 分钟后再查询
curl http://localhost:4001/upload/documents/upload-123/ocr
```

**预期响应（处理完成后）**:
```json
{
  "status": "completed",
  "confidence": 0.95,
  "text": "识别的文本内容...",
  "language": "zh",
  "pageCount": 5,
  "processedAt": "2025-11-02T10:00:00Z"
}
```

### 步骤 3: 在对话中使用文件
```bash
curl -X POST http://localhost:4001/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "这个文档讲了什么？",
    "uploadId": "upload-123",  # 传递上传的文件 ID
    "conversationHistory": []
  }'
```

**预期结果**:
- ✅ AI 回复应该基于文档内容
- ✅ 消息中应该包含文档上下文
- ✅ 响应中返回 conversationId

---

## 3. SSE 流式响应验证 ✅

### 步骤 1: 发起流式请求
```bash
curl http://localhost:4001/chat/stream \
  -H "Accept: text/event-stream" \
  -G \
  --data-urlencode "message=请解释什么是光合作用" \
  --data-urlencode "conversationId=" \
  --data-urlencode "uploadId="
```

**预期输出**（SSE 格式）:
```
data: {"token":"光","complete":false}
data: {"token":"合","complete":false}
data: {"token":"作","complete":false}
...
data: {"token":"","complete":true,"conversationId":"conv-xxx"}
```

### 步骤 2: 在前端实现打字机效果
- [ ] 前端 EventSource 连接正常
- [ ] 每个 token 逐个显示
- [ ] 实现打字机动画效果
- [ ] 最后一个 chunk 包含 conversationId

---

## 4. 前端功能集成验证

### 通过浏览器测试

1. **打开聊天页面**: http://localhost:3000/chat

2. **测试对话上下文**:
   - [ ] 第一条消息发送正常
   - [ ] 在 localStorage 中保存了对话
   - [ ] 刷新页面后消息仍然存在
   - [ ] 第二条消息的 hint level 递增

3. **测试文件上传**:
   - [ ] 点击上传按钮（📎 图标）
   - [ ] 选择一个 PDF 或图片
   - [ ] 显示"正在处理..."进度
   - [ ] OCR 完成后显示识别结果
   - [ ] 提示"可以现在提问关于这份文档的问题"

4. **测试流式响应** (可选):
   - [ ] 发送消息时看到"打字机"效果
   - [ ] 回复逐字符显示，而不是一次性显示
   - [ ] 完成后显示完整回复

---

## 5. 工程测试

### 单元测试
```bash
cd apps/api
npm test -- src/chat/chat.service.spec.ts

cd apps/web
npm test -- app/chat/hooks/useChatLogic.test.ts
```

### 集成测试
```bash
cd apps/api
npm test:e2e

cd apps/web  
npm run test:e2e
```

### 系统级别验证
```bash
# 1. 启动所有服务
pnpm start

# 2. 运行验证脚本
./verify-system.sh

# 3. 检查输出：所有服务应该是 ✅
```

---

## 6. 故障排查

### 问题 1: 对话上下文丢失
**症状**: 第二条消息看不到第一条消息的内容
**排查**:
1. 检查浏览器 localStorage 中 `study_oasis_sessions` 的内容
2. 检查后端 conversations 表中是否有多个对话
3. 验证前端传递的 `conversationId` 是否正确

```sql
-- 检查数据库
SELECT * FROM conversations WHERE id = 'conv-xxx';
SELECT * FROM messages WHERE conversation_id = 'conv-xxx' ORDER BY created_at;
```

### 问题 2: 文件上传失败
**症状**: 上传文件时报 404 或 500
**排查**:
1. 检查 `apps/api/uploads` 目录是否存在且可写
2. 检查 DeepSeek API 密钥配置
3. 查看后端日志了解具体错误

```bash
# 创建 uploads 目录
mkdir -p apps/api/uploads
chmod 755 apps/api/uploads

# 查看最近的日志
tail -f apps/api/logs/app.log
```

### 问题 3: SSE 流式不工作
**症状**: 收不到 SSE 事件或收到 404
**排查**:
1. 检查浏览器控制台是否有 CORS 错误
2. 检查后端是否正确设置了 SSE headers
3. 使用 curl 测试后端端点

```bash
# 测试 SSE 端点
curl -v http://localhost:4001/chat/stream?message=test&conversationId=&uploadId=

# 应该看到：
# Content-Type: text/event-stream
# data: {"token":"...","complete":false}
```

---

## 7. 性能指标

### 目标指标
- ✅ 对话响应时间 < 2 秒（常规 AI API 调用）
- ✅ 流式响应延迟 < 100ms/token
- ✅ 文件上传 < 1 秒（至少 50MB）
- ✅ OCR 处理 < 5 分钟（典型 PDF）
- ✅ 对话加载时间 < 500ms

### 监控方式
```javascript
// 前端性能监控
console.time('API call');
const response = await ApiClient.chat({ /* ... */ });
console.timeEnd('API call');
```

---

## 检查清单

- [ ] 对话上下文功能正常工作
  - [ ] conversationId 正确返回
  - [ ] 多轮对话保存和恢复正确
  - [ ] 数据库中的消息关联正确
  
- [ ] 文件上传流程完整
  - [ ] 文件上传成功
  - [ ] OCR 处理完成
  - [ ] 对话中可以引用文档内容
  
- [ ] SSE 流式响应实现
  - [ ] 后端端点返回 SSE 格式
  - [ ] 前端可以正确解析并显示
  - [ ] 打字机效果工作正常
  
- [ ] 工程质量
  - [ ] 单元测试覆盖率 > 80%
  - [ ] 集成测试通过
  - [ ] 无 TypeScript 编译错误
  - [ ] 日志记录完整

- [ ] 文档完整
  - [ ] API 文档更新
  - [ ] 前端组件文档更新
  - [ ] 集成指南完整
  - [ ] 故障排查指南完整
