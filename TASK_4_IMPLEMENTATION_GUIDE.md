# Task 4.1 - 文件上传到对话流程实现指南

**优先级**：P1  
**预计时间**：2-3 小时  
**状态**：⏳ 待实现  

---

## 📋 需求分析

### 功能目标
在聊天对话中集成文件上传功能，让用户能够：
1. 直接从对话页上传文件
2. 上传后自动加载 OCR 结果作为对话上下文
3. 在对话中引用文件内容

### 用户流程
```
用户打开 /chat
  ↓
点击上传按钮 (✏️ 或📎)
  ↓
选择文件
  ↓
文件上传到 API
  ↓
系统调用 OCR 处理
  ↓
OCR 结果加载到对话
  ↓
用户可以询问关于文件的问题
```

---

## 🔧 技术实现

### Step 1：后端 API 检查

**现有端点**（需要验证）：

```bash
# 1. 上传文件
POST /upload/documents
Content-Type: multipart/form-data
Body: { file: File }
Response: { id, filename, url, fileSize, ocrStatus }

# 2. 获取 OCR 结果
GET /upload/documents/{id}/ocr
Response: { ocrStatus, fullText, pages[] }

# 3. 获取文档列表
GET /upload/documents
Response: { documents[] }
```

**验证命令**：
```bash
# 检查端点是否存在
curl -X OPTIONS http://localhost:4001/upload/documents -v
curl -X GET http://localhost:4001/upload/documents -v
```

---

### Step 2：前端 API 集成

**文件**：`/apps/web/lib/api-client.ts`

需要添加以下方法：

```typescript
export class ApiClient {
  // 上传文件
  static async uploadDocument(file: File, onProgress?: (progress: number) => void) {
    const formData = new FormData();
    formData.append('file', file);

    return fetch('/api/upload', {
      method: 'POST',
      body: formData,
      // Note: XMLHttpRequest 用于进度跟踪
    }).then(res => res.json());
  }

  // 获取 OCR 结果
  static async getOCRResult(documentId: string) {
    const response = await fetch(`/api/documents/${documentId}/ocr`);
    if (!response.ok) throw new ApiError(response.status, response.statusText);
    return response.json();
  }

  // 获取文档列表
  static async getDocuments() {
    const response = await fetch('/api/documents');
    if (!response.ok) throw new ApiError(response.status, response.statusText);
    return response.json();
  }

  // 删除文档
  static async deleteDocument(documentId: string) {
    const response = await fetch(`/api/documents/${documentId}`, {
      method: 'DELETE',
    });
    if (!response.ok) throw new ApiError(response.status, response.statusText);
    return response.json();
  }
}
```

---

### Step 3：更新 useChatLogic 钩子

**文件**：`/apps/web/app/chat/hooks/useChatLogic.ts`

增强 `handleFileSelect` 方法：

```typescript
const handleFileSelect = async (file: File) => {
  setError(null);
  
  // 验证文件
  const validation = validateFile(file);
  if (!validation.valid) {
    setError(validation.error);
    return;
  }

  try {
    setIsLoading(true);

    // 1. 上传文件
    const uploadResponse = await ApiClient.uploadDocument(file);
    const documentId = uploadResponse.id;
    const filename = uploadResponse.filename;

    // 2. 轮询等待 OCR 完成
    let ocrResult = null;
    let attempts = 0;
    const maxAttempts = 60; // 最多等待 5 分钟（每次 5 秒）

    while (attempts < maxAttempts) {
      const ocrStatus = await ApiClient.getOCRResult(documentId);
      
      if (ocrStatus.status === 'completed') {
        ocrResult = ocrStatus.fullText;
        break;
      } else if (ocrStatus.status === 'failed') {
        throw new Error('OCR 处理失败');
      }

      // 等待 5 秒后重试
      await new Promise(resolve => setTimeout(resolve, 5000));
      attempts++;
    }

    if (!ocrResult) {
      throw new Error('OCR 处理超时');
    }

    // 3. 将文件信息保存到会话
    updateSessionWithDocument(documentId, filename);

    // 4. 可选：自动发送问候消息
    const greeting = `我已加载了文档 "${filename}"，请基于这个文档回答我的问题。`;
    await handleSend(greeting);

  } catch (err) {
    setError(err instanceof Error ? err.message : '文件上传失败');
    console.error('File upload error:', err);
  } finally {
    setIsLoading(false);
  }
};

// 辅助函数：验证文件
function validateFile(file: File) {
  const maxSize = 50 * 1024 * 1024; // 50MB
  const allowedTypes = [
    'application/pdf',
    'text/plain',
    'image/jpeg',
    'image/png',
    'image/gif',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ];

  if (file.size > maxSize) {
    return { valid: false, error: '文件过大，请选择不超过 50MB 的文件' };
  }

  if (!allowedTypes.includes(file.type)) {
    return { 
      valid: false, 
      error: '不支持该文件类型。支持：PDF、TXT、图片(JPG/PNG/GIF)、Word 文档' 
    };
  }

  return { valid: true };
}

// 辅助函数：更新会话
function updateSessionWithDocument(documentId: string, filename: string) {
  // 更新 URL 参数
  const params = new URLSearchParams({
    fileId: documentId,
    filename: filename,
  });
  window.history.pushState({}, '', `/chat?${params.toString()}`);

  // 保存到本地存储
  ChatStorage.updateSessionDocument(fileId, documentId, filename);
}
```

---

### Step 4：更新 ChatLayout 组件

添加上传状态提示：

```typescript
{/* 文件上传进度 */}
{isLoading && (
  <div className="bg-blue-50 border-b border-blue-200 px-4 py-3">
    <div className="flex items-center gap-2">
      <div className="animate-spin">⏳</div>
      <span className="text-sm text-blue-700">
        正在处理文件，请稍候...
      </span>
    </div>
  </div>
)}
```

---

### Step 5：处理多文件场景

如果用户上传新文件，需要：
1. 清除旧的文件上下文
2. 加载新文件的 OCR 结果
3. 清空对话历史（可选）

```typescript
const handleFileSelect = async (file: File) => {
  // 如果已有文件，提示用户
  if (fileId && fileId !== searchParams.get('fileId')) {
    const confirm = window.confirm(
      '已有加载的文件，上传新文件将替换它。是否继续？'
    );
    if (!confirm) return;
    
    // 清除旧对话
    setMessages([]);
  }

  // ... 继续上传新文件
};
```

---

## 📊 实现清单

### 前端
- [ ] 更新 `ApiClient` 添加文件上传方法
- [ ] 更新 `useChatLogic` 的 `handleFileSelect` 实现
- [ ] 添加文件验证逻辑
- [ ] 添加上传进度显示
- [ ] 添加 OCR 轮询逻辑
- [ ] 测试完整的上传流程

### 后端（如需调整）
- [ ] 验证文件上传端点
- [ ] 验证 OCR 处理流程
- [ ] 添加错误处理
- [ ] 添加日志记录

### UI/UX
- [ ] 上传按钮样式
- [ ] 加载状态显示
- [ ] 错误提示
- [ ] 成功反馈

---

## 🧪 测试场景

### 成功场景
1. ✅ 上传 PDF 文件，正常处理
2. ✅ 上传图片，识别文字
3. ✅ 上传文本文档
4. ✅ 上传 Word 文档

### 失败场景
1. ❌ 上传过大文件（> 50MB）
2. ❌ 上传不支持的文件类型
3. ❌ 网络中断
4. ❌ OCR 处理失败
5. ❌ 超时处理

### 边界情况
1. 🔄 文件正在处理时，用户刷新页面
2. 🔄 文件正在处理时，用户选择新文件
3. 🔄 多个文件同时上传

---

## 📝 配置和常数

```typescript
// 上传配置
export const UPLOAD_CONFIG = {
  MAX_FILE_SIZE: 50 * 1024 * 1024, // 50MB
  ALLOWED_TYPES: [
    'application/pdf',
    'text/plain',
    'image/jpeg',
    'image/png',
    'image/gif',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ],
  OCR_POLL_INTERVAL: 5000, // 5 秒
  OCR_MAX_ATTEMPTS: 60, // 5 分钟
};
```

---

## 🔗 相关文件

- `/apps/web/app/chat/page.tsx` - 主页面
- `/apps/web/app/chat/components/MessageInput.tsx` - 输入组件
- `/apps/web/app/chat/hooks/useChatLogic.ts` - 业务逻辑
- `/apps/web/lib/api-client.ts` - API 客户端
- `/apps/api/src/upload/upload.controller.ts` - 后端上传控制器

---

## 💡 优化建议

1. **渐进式上传**：支持拖拽上传
2. **文件预览**：上传前显示文件预览
3. **批量上传**：支持一次上传多个文件
4. **缓存**：缓存已处理的 OCR 结果
5. **断点续传**：大文件分片上传

---

## 🚀 下一步

完成此任务后，可以：
1. 实现 Task 5：流式响应
2. 实现 Task 10：优化提示词
3. 进行端到端测试

---

**预计完成日期**：2025-11-03  
**优先级**：🔴 P1 - 核心功能
