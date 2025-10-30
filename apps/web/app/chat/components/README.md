# Chat Components

聊天功能相关的 React 组件。

## 组件列表

### MessageBubble
单个消息气泡，显示用户或 AI 的消息。

**Props**:
- `message: Message` - 消息对象
  - `role: 'user' | 'assistant'` - 消息发送者
  - `content: string` - 消息内容
  - `hintLevel?: 1 | 2 | 3` - 提示等级（仅 AI 消息）
  - `timestamp: number` - 时间戳

**样式**:
- 用户消息：蓝色背景，右对齐
- AI 消息：灰色背景，左对齐，包含提示等级徽章

---

### HintLevelBadge
显示 AI 回复的提示等级。

**Props**:
- `level: 1 | 2 | 3` - 提示等级

**等级说明**:
- Level 1 (🤔): 轻度提示 - 绿色
- Level 2 (💡): 中度提示 - 黄色
- Level 3 (✨): 详细提示 - 红色

---

### MessageList
消息列表容器，自动滚动到最新消息。

**Props**:
- `messages: Message[]` - 消息数组

**功能**:
- 自动滚动到底部
- 空状态提示
- 响应式布局

---

### MessageInput
消息输入框组件。

**Props**:
- `onSend: (content: string) => void` - 发送消息回调
- `disabled?: boolean` - 是否禁用
- `placeholder?: string` - 占位符文本

**功能**:
- 多行文本输入
- Enter 发送，Shift+Enter 换行
- 发送按钮
- 禁用状态处理

---

### DocumentViewer ✨ 新增
文档查看器组件，支持在聊天页面查看上传的文档。

**Props**:
- `fileUrl?: string` - 文件 URL
- `filename?: string` - 文件名

**功能**:
- 支持 PDF 文件预览（iframe）
- 支持图片文件预览（jpg, png, gif, webp）
- 支持文本文件预览（txt, md, json, js, ts, css, html）
- 新窗口打开文件
- 下载文件
- 无文件时显示上传引导
- 不支持的文件类型显示下载选项

**支持的文件类型**:
- PDF: 直接在 iframe 中显示
- 图片: jpg, jpeg, png, gif, webp
- 文本: txt, md, json, js, ts, tsx, jsx, css, html
- 其他: 提供下载选项

---

## 使用示例

### 基础聊天功能
```tsx
import { MessageList } from './components/MessageList'
import { MessageInput } from './components/MessageInput'

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([])

  const handleSend = async (content: string) => {
    // 添加用户消息
    const userMessage = {
      role: 'user',
      content,
      timestamp: Date.now(),
    }
    setMessages([...messages, userMessage])

    // 调用 API...
  }

  return (
    <>
      <MessageList messages={messages} />
      <MessageInput onSend={handleSend} />
    </>
  )
}
```

### 分屏布局（文档+聊天）
```tsx
import { DocumentViewer } from './components/DocumentViewer'
import { MessageList } from './components/MessageList'
import { MessageInput } from './components/MessageInput'

export default function ChatPage() {
  const fileUrl = 'http://localhost:4000/uploads/abc123.pdf'
  const filename = 'study.pdf'

  return (
    <div className="flex h-screen">
      {/* 左侧：文档查看器 */}
      <div className="w-1/2 border-r">
        <DocumentViewer fileUrl={fileUrl} filename={filename} />
      </div>

      {/* 右侧：聊天界面 */}
      <div className="w-1/2 flex flex-col">
        <MessageList messages={messages} />
        <MessageInput onSend={handleSend} />
      </div>
    </div>
  )
}
```

### 从 URL 获取文件信息
```tsx
'use client'

import { useSearchParams } from 'next/navigation'

export default function ChatPage() {
  const searchParams = useSearchParams()
  const fileId = searchParams.get('fileId')
  const filename = searchParams.get('filename')
  
  const fileUrl = fileId 
    ? `http://localhost:4000/uploads/${fileId}.${filename?.split('.').pop()}`
    : undefined

  return (
    <DocumentViewer fileUrl={fileUrl} filename={filename || undefined} />
  )
}
```

---

## 样式说明

所有组件使用 Tailwind CSS 进行样式设计，遵循以下原则：

- **颜色**: 蓝色（用户）、灰色（AI）、语义化颜色（提示等级）
- **间距**: 统一使用 Tailwind 的间距系统
- **圆角**: rounded-lg (8px)
- **阴影**: shadow-sm 用于卡片效果
- **响应式**: 使用 flex 布局适配不同屏幕

---

## 新功能亮点

### 📄 分屏布局
- 左侧显示文档（50% 宽度）
- 右侧显示聊天界面（50% 宽度）
- 可通过按钮切换显示/隐藏文档
- 没有文档时聊天界面占满全屏

### 🔄 动态布局
- 自动检测是否有文件 URL
- 响应式宽度调整
- 平滑的显示/隐藏过渡

### 📱 移动端优化
- 小屏幕设备可隐藏文档查看器
- 保持聊天功能始终可用

---

**最后更新**: 2025年10月30日
