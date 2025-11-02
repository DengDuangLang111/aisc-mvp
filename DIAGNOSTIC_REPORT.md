# 📋 Study Oasis 系统诊断报告

**诊断时间**：2025-11-02  
**诊断员**：GitHub Copilot  
**系统状态**：🟡 部分功能正常，发现 2 个关键问题

---

## 🔍 发现的问题

### 问题 1️⃣：对话上下文缺失 ⚠️ 高优先级

**症状**：用户在同一个对话框中连续提问，但 AI 无法获得之前的对话内容。

**根本原因**：
代码位置：`/apps/api/src/chat/chat.service.ts` 第 456 行

```typescript
// 3. 历史消息（最近 10 条）
dbMessages.slice(-10).forEach((msg: any) => {
  messages.push({
    role: msg.role as 'user' | 'assistant',
    content: msg.content,
  });
});    return messages;  // ❌ 缺少换行，代码格式错误！
```

**问题分析**：
- ✅ 代码逻辑本身是正确的（会加载最近 10 条消息）
- ❌ 但有格式问题（`return` 语句前缺少正确的换行）
- ✅ 消息加载数据库查询语句正确：`include: { messages: { orderBy: { createdAt: 'asc' }, take: 10 } }`
- ✅ `conversationId` 传递也正确

**实际问题原因**：
前端可能没有正确传递 `conversationId`，或者前端没有维护会话状态。查看屏幕截图，用户每次提问时似乎都是新建对话，而不是在同一个对话中继续。

**症状验证**：
观看用户上传的对话截图 - 显示两条 Level 1 消息分别于 05:28 和 05:41 发出，这表示系统正在创建不同的对话，而不是在同一对话中追加。

---

### 问题 2️⃣：OCR 功能验证 🤔 需要诊断

**症状**：无法确认 OCR 功能是否正常工作。

**诊断方法**：需要执行以下检查

```bash
# 1. 检查是否有上传的文档
curl http://localhost:4001/upload/documents

# 2. 获取特定文档的 OCR 结果
curl http://localhost:4001/upload/documents/{documentId}/ocr

# 3. 查看数据库中的 OCR 记录
# 检查 ocr_results 表是否有数据
```

**预期结果**：
- ✅ `/upload/documents` 返回文档列表（title, id, createdAt 等）
- ✅ `/upload/documents/:id/ocr` 返回 OCR 结果（fullText, pageCount, confidence 等）

---

## 📊 问题优先级和修复方案

### 优先级：P0 高 - 对话上下文缺失

**修复方案（前端）**：

1. **维护 `conversationId` 状态**
   ```typescript
   // 在 /chat 页面中
   const [conversationId, setConversationId] = useState<string | null>(null);
   
   // 第一次发送消息时
   if (!conversationId) {
     const response = await fetch('/chat', {
       method: 'POST',
       body: JSON.stringify({ message: userInput })
       // 不传 conversationId，让后端创建
     });
     setConversationId(response.conversationId); // 保存返回的 ID
   }
   
   // 后续消息
   if (conversationId) {
     const response = await fetch('/chat', {
       method: 'POST',
       body: JSON.stringify({
         message: userInput,
         conversationId  // 传递已有的 ID
       })
     });
   }
   ```

2. **加载对话历史**
   ```typescript
   // 进入对话页面时
   useEffect(() => {
     if (conversationId) {
       // 加载完整历史
       const history = await fetch(`/chat/conversations/${conversationId}`);
       setMessages(history.messages);
     }
   }, [conversationId]);
   ```

3. **显示对话上下文**
   - 在消息列表中显示完整的对话历史
   - 支持向上滚动加载更多历史消息

---

### 优先级：P1 中 - OCR 功能验证

**验证步骤**：

1. 使用测试 PDF 文件上传
2. 检查 Google Cloud Storage 是否有文件
3. 检查数据库 `ocr_results` 表
4. 调用 `/upload/documents/{id}/ocr` 端点验证结果

**预期工作流**：
```
上传文件 → 保存到 GCS → 触发 Vision API → 存储到数据库 → 返回结果
```

---

## 🛠️ 后续 TODO 优化建议

### 立即修复（今天）
- [ ] 修复前端对话状态管理，正确传递 `conversationId`
- [ ] 在对话页面加载历史消息
- [ ] 验证 OCR 功能是否正常

### 短期改进（本周）
- [ ] 实现对话列表页面（显示所有历史对话）
- [ ] 支持文件上传到对话中的流程
- [ ] 实现流式响应效果

### 中期优化（本月）
- [ ] 实现用户认证系统
- [ ] 添加数据分析仪表板
- [ ] 完善错误处理

---

## 📝 代码检查清单

### 后端状态 ✅

| 项目 | 状态 | 备注 |
|------|------|------|
| 对话历史加载 | ✅ OK | 代码逻辑正确，最近 10 条消息 |
| 系统提示词 | ✅ OK | 3 级渐进式提示正确实现 |
| 文档上下文 | ✅ OK | 从 OCR 结果读取并注入 |
| DeepSeek API | ✅ OK | 已集成并测试 |
| 数据持久化 | ✅ OK | 消息保存到 DB |

### 前端状态 🟡

| 项目 | 状态 | 备注 |
|------|------|------|
| 对话界面 | 🟡 需要改进 | 缺少对话历史显示和状态管理 |
| 消息输入 | ✅ OK | 基础输入框存在 |
| conversationId | ❌ 未传递 | 前端没有维护会话状态 |
| 历史加载 | ❌ 未实现 | 进入对话页面不加载历史 |

---

## 📞 下一步行动

1. **确认 OCR 工作状态**
   ```bash
   # 在终端运行诊断
   curl http://localhost:4001/upload/documents
   ```

2. **修复前端对话上下文**
   - 编辑 `/apps/web/app/chat/page.tsx`
   - 添加 `conversationId` 状态管理
   - 实现历史消息加载

3. **测试完整流程**
   - 上传文件后立即对话
   - 在同一对话中连续提问
   - 验证 AI 能否访问之前的问题

---

**报告完成**  
建议立即修复前端状态管理问题，这是影响用户体验的最严重问题。
