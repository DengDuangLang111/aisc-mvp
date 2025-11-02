# 前后端交互详解 - Study Oasis

## 📚 目录
1. [系统架构概览](#系统架构概览)
2. [文件上传流程](#文件上传流程)
3. [AI 对话流程](#ai-对话流程)
4. [技术栈详解](#技术栈详解)
5. [数据流动图](#数据流动图)

---

## 🏗️ 系统架构概览

```
┌─────────────────────────────────────────────────────────┐
│                      浏览器 (Browser)                     │
│  http://localhost:3000                                   │
│  ┌─────────────────────────────────────────────────┐   │
│  │         Next.js 前端应用 (React)                  │   │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐      │   │
│  │  │  首页    │  │ 上传页面  │  │ 聊天页面  │      │   │
│  │  │  /       │  │ /upload   │  │ /chat    │      │   │
│  │  └──────────┘  └──────────┘  └──────────┘      │   │
│  └─────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
                         │
                         │ HTTP Requests
                         ↓
┌─────────────────────────────────────────────────────────┐
│              NestJS 后端服务器 (Backend)                  │
│              http://localhost:4000                       │
│  ┌─────────────────────────────────────────────────┐   │
│  │              API 端点 (Endpoints)                 │   │
│  │  ┌─────────────────────────────────────────┐    │   │
│  │  │ GET  /         - 健康检查                 │    │   │
│  │  │ POST /upload   - 文件上传                 │    │   │
│  │  │ POST /chat     - AI 对话                  │    │   │
│  │  └─────────────────────────────────────────┘    │   │
│  │                                                   │   │
│  │  ┌─────────────────────────────────────────┐    │   │
│  │  │            业务逻辑层                      │    │   │
│  │  │  • UploadService  - 文件处理              │    │   │
│  │  │  • ChatService    - AI 对话逻辑           │    │   │
│  │  └─────────────────────────────────────────┘    │   │
│  │                                                   │   │
│  │  ┌─────────────────────────────────────────┐    │   │
│  │  │           文件存储 (Storage)               │    │   │
│  │  │       apps/api/uploads/                   │    │   │
│  │  │  • UUID-命名的上传文件                     │    │   │
│  │  └─────────────────────────────────────────┘    │   │
│  └─────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

---

## 📤 文件上传流程详解

### 步骤 1: 用户选择文件（前端）

**位置**: `/study_oasis_simple/apps/web/app/upload/page.tsx`

```tsx
// 用户点击文件选择器
<input
  ref={fileRef}
  type="file"
  onChange={() => {
    setStatus("");
    setUploadedFile(null);
  }}
/>
```

**发生了什么**:
1. 用户点击 "选择文件" 按钮
2. 浏览器打开文件选择对话框
3. 用户选择一个文件（比如 `study.pdf`）
4. 文件对象存储在 `fileRef.current.files[0]`

---

### 步骤 2: 用户点击上传（前端）

```tsx
async function handleUpload() {
  const file = fileRef.current?.files?.[0];
  if (!file) {
    setStatus("请选择一个文件");
    return;
  }

  // 显示上传状态
  setStatus(`正在上传：${file.name}...`);
  setUploading(true);

  // 创建 FormData 对象（重要！）
  const fd = new FormData();
  fd.append("file", file);
  
  // ...
}
```

**FormData 的作用**:
- `FormData` 是浏览器提供的 API，用于构建 `multipart/form-data` 格式的数据
- 这是**唯一正确的方式**来上传二进制文件（如 PDF、图片等）
- 不能用 JSON 发送文件！

**为什么用 multipart/form-data？**
```
Content-Type: multipart/form-data; boundary=----WebKitFormBoundary7MA4YWxkTrZu0gW

------WebKitFormBoundary7MA4YWxkTrZu0gW
Content-Disposition: form-data; name="file"; filename="study.pdf"
Content-Type: application/pdf

[二进制文件内容...]
------WebKitFormBoundary7MA4YWxkTrZu0gW--
```

---

### 步骤 3: 发送 HTTP 请求到后端

```tsx
try {
  const res = await fetch("http://localhost:4000/upload", {
    method: "POST",
    body: fd,  // 直接传 FormData，浏览器会自动设置 Content-Type
  });

  if (!res.ok) {
    throw new Error(`上传失败: ${res.statusText}`);
  }

  const json = await res.json();
  // json = { id: "uuid", filename: "study.pdf", url: "..." }
}
```

**HTTP 请求详情**:
```http
POST http://localhost:4000/upload HTTP/1.1
Host: localhost:4000
Content-Type: multipart/form-data; boundary=----WebKitFormBoundary7MA4YWxkTrZu0gW
Content-Length: 245678

[FormData 内容...]
```

---

### 步骤 4: 后端接收文件（NestJS）

**位置**: `/apps/api/src/upload/upload.controller.ts`

```typescript
@Controller('upload')
export class UploadController {
  @Post()
  @UseInterceptors(
    FileInterceptor('file', {  // ← 'file' 必须和前端 fd.append('file', ...) 的名字一致
      storage: diskStorage({
        destination: './uploads',  // 存储目录
        filename: (req, file, cb) => {
          const uniqueId = randomUUID();  // 生成 UUID
          const ext = extname(file.originalname);  // 获取扩展名
          cb(null, `${uniqueId}${ext}`);  // 最终文件名: abc123-def456.pdf
        },
      }),
    }),
  )
  uploadFile(@UploadedFile() file: Express.Multer.File) {
    // file 对象包含上传的文件信息
    return {
      id: file.filename.replace(extname(file.filename), ''),
      filename: file.originalname,
      url: `http://localhost:4000/uploads/${file.filename}`,
    };
  }
}
```

**Multer 中间件的作用**:
1. **解析 multipart/form-data**：提取文件和表单字段
2. **保存文件到磁盘**：按照配置保存到 `./uploads/` 目录
3. **生成唯一文件名**：避免文件名冲突
4. **填充 file 对象**：提供给控制器使用

**file 对象结构**:
```typescript
{
  fieldname: 'file',
  originalname: 'study.pdf',
  encoding: '7bit',
  mimetype: 'application/pdf',
  destination: './uploads',
  filename: '9c7f7648-75b9-44e2-a123-0866de434e62.pdf',
  path: 'uploads/9c7f7648-75b9-44e2-a123-0866de434e62.pdf',
  size: 245678
}
```

---

### 步骤 5: 返回响应给前端

**后端返回的 JSON**:
```json
{
  "id": "9c7f7648-75b9-44e2-a123-0866de434e62",
  "filename": "study.pdf",
  "url": "http://localhost:4000/uploads/9c7f7648-75b9-44e2-a123-0866de434e62.pdf"
}
```

**前端接收响应**:
```tsx
const json = await res.json();
console.log("后端返回：", json);
setUploadedFile(json);  // 保存文件信息
setStatus(`✅ 上传成功！文件：${json.filename}`);
```

---

### 步骤 6: 显示文件信息和跳转按钮

```tsx
{uploadedFile && (
  <div className="border-t pt-4 space-y-3">
    <div className="text-sm text-gray-600">
      <p><span className="font-medium">文件名：</span>{uploadedFile.filename}</p>
      <p><span className="font-medium">文件 ID：</span>{uploadedFile.id}</p>
    </div>

    <Button onClick={handleStartChat} variant="primary" className="w-full">
      开始对话学习 →
    </Button>
  </div>
)}
```

---

### 步骤 7: 跳转到聊天页面

```tsx
function handleStartChat() {
  if (uploadedFile) {
    router.push(`/chat?fileId=${uploadedFile.id}&filename=${encodeURIComponent(uploadedFile.filename)}`);
  } else {
    router.push('/chat');
  }
}
```

**URL 示例**:
```
http://localhost:3000/chat?fileId=9c7f7648-75b9-44e2-a123-0866de434e62&filename=study.pdf
```

---

## 💬 AI 对话流程详解

### 步骤 1: 聊天页面初始化（前端）

**位置**: `/study_oasis_simple/apps/web/app/chat/page.tsx`

```tsx
'use client';

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(false);
  
  // 可以从 URL 获取文件信息
  // const searchParams = useSearchParams();
  // const fileId = searchParams.get('fileId');
  // const filename = searchParams.get('filename');
}
```

---

### 步骤 2: 用户输入问题并发送

```tsx
async function handleSend() {
  if (!inputValue.trim() || loading) return;

  // 1. 创建用户消息对象
  const userMessage: Message = {
    id: Date.now().toString(),
    role: 'user',
    content: inputValue,
    timestamp: new Date().toLocaleTimeString('zh-CN', {
      hour: '2-digit',
      minute: '2-digit',
    }),
  };

  // 2. 立即显示在界面上（乐观更新）
  setMessages((prev) => [...prev, userMessage]);
  setInputValue('');  // 清空输入框
  setLoading(true);   // 显示加载状态

  // 3. 发送 HTTP 请求到后端
  try {
    const response = await fetch('http://localhost:4000/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',  // ← 发送 JSON
      },
      body: JSON.stringify({
        message: inputValue,
        conversationHistory: messages,  // 可选：发送对话历史
      }),
    });

    // ...
  }
}
```

**HTTP 请求详情**:
```http
POST http://localhost:4000/chat HTTP/1.1
Host: localhost:4000
Content-Type: application/json
Content-Length: 156

{
  "message": "什么是量子力学？",
  "conversationHistory": [
    { "role": "user", "content": "你好", "timestamp": "14:30" },
    { "role": "assistant", "content": "你好！", "hintLevel": 1, "timestamp": "14:30" }
  ]
}
```

---

### 步骤 3: 后端处理 AI 请求

**位置**: `/apps/api/src/chat/chat.controller.ts`

```typescript
@Controller('chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Post()
  async chat(@Body() body: { message: string; conversationHistory?: any[] }) {
    return this.chatService.processMessage(body.message, body.conversationHistory);
  }
}
```

**位置**: `/apps/api/src/chat/chat.service.ts`

```typescript
@Injectable()
export class ChatService {
  processMessage(message: string, history?: any[]): ChatResponse {
    // 1. 分析消息内容
    const messageLength = message.length;
    
    // 2. 根据内容长度决定提示等级（简化逻辑）
    let hintLevel: HintLevel;
    if (messageLength < 10) {
      hintLevel = 1;  // 短消息 -> 轻度提示
    } else if (messageLength < 30) {
      hintLevel = 2;  // 中等消息 -> 中度提示
    } else {
      hintLevel = 3;  // 长消息 -> 详细提示
    }

    // 3. 生成不同等级的回复内容
    const responses = {
      1: `🤔 关于"${message}"，你可以先思考一下这个方向...`,
      2: `💡 让我给你一些提示：首先考虑...然后...`,
      3: `✨ 详细解答：${message}的核心概念是...完整的理解包括...`,
    };

    // 4. 返回响应
    return {
      message: responses[hintLevel],
      hintLevel: hintLevel,
      timestamp: new Date().toISOString(),
    };
  }
}
```

**实际应用中可能的改进**:
- 调用真实的 AI API（OpenAI、Claude 等）
- 根据文件内容提供上下文
- 使用向量数据库存储文件知识
- 实现对话历史记忆

---

### 步骤 4: 返回 AI 响应

**后端返回的 JSON**:
```json
{
  "message": "🤔 关于\"什么是量子力学？\"，你可以先思考一下这个方向...",
  "hintLevel": 1,
  "timestamp": "2025-10-29T14:30:15.123Z"
}
```

---

### 步骤 5: 前端显示 AI 回复

```tsx
const response = await fetch('http://localhost:4000/chat', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ message: inputValue }),
});

const data = await response.json();

// 创建 AI 消息对象
const aiMessage: Message = {
  id: (Date.now() + 1).toString(),
  role: 'assistant',
  content: data.message,
  hintLevel: data.hintLevel,
  timestamp: new Date().toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
  }),
};

// 添加到消息列表
setMessages((prev) => [...prev, aiMessage]);
setLoading(false);
```

---

### 步骤 6: 消息列表自动滚动

**位置**: `/study_oasis_simple/apps/web/app/chat/components/MessageList.tsx`

```tsx
export function MessageList({ messages }: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  // 每次消息更新时自动滚动到底部
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4">
      {messages.map((message) => (
        <MessageBubble key={message.id} message={message} />
      ))}
      <div ref={bottomRef} />  {/* 滚动锚点 */}
    </div>
  );
}
```

---

## 🔧 技术栈详解

### 前端 (Next.js + React)

```
Next.js 16.0.1
├── React 19.2.0                 - UI 框架
├── TypeScript 5                 - 类型安全
├── Tailwind CSS 4               - 样式系统
├── Jest + React Testing Library - 单元测试
└── pnpm                         - 包管理器
```

**关键概念**:
- **Client Components** (`'use client'`): 可以使用 hooks、事件处理
- **Server Components** (默认): 在服务器渲染，性能更好
- **App Router**: 基于文件系统的路由

---

### 后端 (NestJS)

```
NestJS 11.1.8
├── TypeScript                   - 类型安全
├── Express.js (底层)            - HTTP 服务器
├── Multer                       - 文件上传中间件
├── CORS                         - 跨域资源共享
└── Node.js                      - 运行时环境
```

**架构模式**:
```
Controller (路由层)
    ↓
Service (业务逻辑层)
    ↓
数据访问层 (未来可扩展)
```

---

## 📊 数据流动图

### 完整用户旅程

```
用户打开浏览器
    ↓
访问 http://localhost:3000
    ↓
看到首页，点击"上传学习材料"
    ↓
跳转到 /upload 页面
    ↓
1. 选择文件 (study.pdf)
    ↓
2. 点击"上传文件"
    ↓
3. 前端创建 FormData
   fd.append('file', file)
    ↓
4. 发送 POST 请求到 http://localhost:4000/upload
    ↓
5. 后端 Multer 解析文件
    ↓
6. 保存到 ./uploads/uuid.pdf
    ↓
7. 返回 { id, filename, url }
    ↓
8. 前端显示文件信息
    ↓
9. 用户点击"开始对话学习"
    ↓
10. 跳转到 /chat?fileId=uuid&filename=study.pdf
    ↓
11. 用户输入问题："量子力学是什么？"
    ↓
12. 前端发送 POST 到 http://localhost:4000/chat
    body: { message: "量子力学是什么？" }
    ↓
13. 后端 ChatService 处理
    ↓
14. 返回 { message: "🤔 提示...", hintLevel: 1 }
    ↓
15. 前端显示 AI 回复
    ↓
16. MessageList 自动滚动到底部
    ↓
用户可以继续提问...
```

---

## 🔑 关键技术点

### 1. 跨域请求 (CORS)

**问题**: 前端 (localhost:3000) 无法直接请求后端 (localhost:4000)

**解决**: 后端启用 CORS

```typescript
// main.ts
app.enableCors({
  origin: 'http://localhost:3000',  // 允许的前端地址
  credentials: true,
});
```

---

### 2. FormData vs JSON

| 场景 | 使用 |
|------|------|
| 上传文件 | FormData + multipart/form-data |
| 发送文本/对象 | JSON + application/json |

**错误示例**:
```tsx
// ❌ 不能用 JSON 发送文件
await fetch('/upload', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ file: file })  // 不起作用！
});
```

**正确示例**:
```tsx
// ✅ 使用 FormData
const fd = new FormData();
fd.append('file', file);
await fetch('/upload', {
  method: 'POST',
  body: fd,  // 浏览器自动设置正确的 Content-Type
});
```

---

### 3. 状态管理

**React 的状态管理**:
```tsx
const [messages, setMessages] = useState<Message[]>([]);

// 添加新消息（不可变更新）
setMessages((prev) => [...prev, newMessage]);

// ❌ 错误：直接修改状态
messages.push(newMessage);  // 不会触发重新渲染！

// ✅ 正确：创建新数组
setMessages([...messages, newMessage]);
```

---

### 4. 异步操作

**async/await 模式**:
```tsx
async function handleSend() {
  setLoading(true);
  try {
    const response = await fetch('/chat', { ... });
    const data = await response.json();
    // 处理数据
  } catch (error) {
    console.error('请求失败', error);
    setError('发送失败，请重试');
  } finally {
    setLoading(false);  // 无论成功失败都执行
  }
}
```

---

## 🎯 总结

### 上传流程
1. **前端**: 用户选择文件 → 创建 FormData → 发送 POST 请求
2. **后端**: Multer 接收文件 → 生成 UUID → 保存到磁盘 → 返回文件信息
3. **前端**: 显示上传成功 → 跳转到聊天页面

### 对话流程
1. **前端**: 用户输入问题 → 发送 JSON 请求 → 显示加载状态
2. **后端**: 接收消息 → 处理逻辑 → 生成回复 → 返回 JSON
3. **前端**: 接收回复 → 更新消息列表 → 自动滚动

### 核心技术
- **HTTP 通信**: fetch API
- **文件上传**: FormData + Multer
- **状态管理**: React Hooks (useState, useEffect, useRef)
- **类型安全**: TypeScript
- **样式**: Tailwind CSS

---

**最后更新**: 2025年10月29日
**版本**: v1.0.0
