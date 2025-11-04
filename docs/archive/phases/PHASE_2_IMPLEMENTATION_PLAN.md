# Phase 2 实现方案 - Task 4.1 & Task 5.1

## 目标
- **Task 4.1**: 完整文件上传流程 (文件上传 → OCR 处理 → 自动加载对话上下文)
- **Task 5.1**: SSE 流式响应 (使用 EventSource 实现打字机效果)
- **Bug Fix**: 修复对话上下文功能 (确保多轮对话正常工作)

## 分阶段实现

### 第一阶段: 诊断问题
1. 检查对话上下文为什么不工作
   - 检查 `useChatLogic.ts` 中的 `conversationHistory` 构建
   - 检查后端 `chat.service.ts` 中的对话加载逻辑
   - 检查数据库中的数据是否正确保存

### 第二阶段: 实现 SSE 流式响应
后端改造:
1. `chat.controller.ts` - 添加 `/chat/stream` 端点 (SSE)
2. `chat.service.ts` - 实现流式调用 DeepSeek API
3. 使用 RxJS 的 Observable 处理流

前端改造:
1. `api-client.ts` - 添加 `chatStream()` 方法
2. `useChatLogic.ts` - 实现 EventSource 监听
3. `MessageBubble.tsx` - 打字机效果动画

### 第三阶段: 实现文件上传流程
后端改造:
1. `upload.controller.ts` - 优化上传端点
2. `upload.service.ts` - 添加 OCR 轮询逻辑
3. 返回 `uploadId` 给前端用于后续引用

前端改造:
1. `useChatLogic.ts` - 完整实现 `handleFileSelect()`
2. `MessageInput.tsx` - 改进文件上传 UI
3. 支持拖拽上传和进度条显示

### 第四阶段: 工程完善
1. 单元测试更新
2. 集成测试
3. 文档更新
4. 系统验证

## 实现详情

### Step 1: 修复对话上下文问题

**问题诊断**:
```
前端:
- localStorage 保存消息 ✅ (ChatStorage)
- 但 conversationHistory 可能没有正确传递给后端 ❓
- 需要检查 POST /chat 请求体

后端:
- /chat 端点正确处理 conversationHistory ✅
- 但需要验证数据库中的对话是否正确关联 ❓
```

**修复方案**:
1. 检查 `useChatLogic.ts` 中的 `handleSend()` 逻辑
2. 确保传递 `conversationHistory` 到后端
3. 后端使用 `conversationId` 加载历史消息

### Step 2: 实现 SSE 流式响应

**后端实现**:
```typescript
// POST /chat/stream (SSE)
@Post('stream')
@Header('Content-Type', 'text/event-stream')
@Header('Cache-Control', 'no-cache')
@Header('Connection', 'keep-alive')
async chatStream(@Body() request: ChatRequestDto, @Res() res: Response) {
  // 返回 Observable<string>
  // 使用 DeepSeek API 的流式输出
  // 每个 token 发送一个 SSE 事件
}
```

**前端实现**:
```typescript
// api-client.ts
static async *chatStream(request: ChatRequest) {
  const eventSource = new EventSource(
    `${API_URL}/chat/stream?${new URLSearchParams(request)}`
  );
  
  for await (const event of eventSource) {
    yield JSON.parse(event.data);
  }
}

// useChatLogic.ts
const handleStreamChat = async () => {
  for await (const chunk of ApiClient.chatStream(request)) {
    // 逐个 token 更新消息内容
    setMessages(prev => updateLastMessage(prev, chunk.token));
  }
}
```

### Step 3: 实现文件上传流程

**前端改造**:
```typescript
const handleFileSelect = async (file: File) => {
  // 1. 验证文件
  validateFile(file);
  
  // 2. 上传文件
  const uploadResponse = await ApiClient.uploadFile(file);
  const { id: uploadId, filename, size } = uploadResponse;
  
  // 3. 等待 OCR 完成 (轮询)
  const ocrResult = await pollOcrCompletion(uploadId);
  
  // 4. 自动插入"已上传文件" 消息
  setMessages(prev => [...prev, {
    role: 'system',
    content: `已上传文档: ${filename}`,
  }]);
  
  // 5. 自动加载文档内容到对话上下文
  // 下一条用户消息会自动包含 uploadId
  setCurrentUploadId(uploadId);
};
```

**后端改造**:
```typescript
// /upload 端点返回
{
  id: 'upload-123',
  filename: 'document.pdf',
  size: 1024,
  mimeType: 'application/pdf',
  status: 'processing', // processing | completed | failed
  ocrUrl: 'http://localhost:4000/upload/documents/upload-123/ocr'
}

// /upload/documents/:id/ocr 端点返回
{
  status: 'processing' | 'completed' | 'failed',
  confidence: 0.95,
  text: '识别的文本内容...',
  language: 'zh',
  pageCount: 5,
  processedAt: '2025-11-02T10:00:00Z'
}
```

## 时间估计
- Step 1 (诊断上下文): 30 分钟
- Step 2 (SSE 流式响应): 2 小时
- Step 3 (文件上传流程): 1.5 小时
- Step 4 (测试和文档): 1 小时

**总计**: 5 小时

## 验收标准
- ✅ 对话上下文功能完全正常 (多轮对话保存和恢复)
- ✅ SSE 流式响应正常工作 (打字机效果显示)
- ✅ 文件上传从选择到对话集成完整
- ✅ 单元测试覆盖率 > 80%
- ✅ 文档完整且清晰
- ✅ 系统集成测试通过
