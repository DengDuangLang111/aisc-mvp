# Chat Page

AI 对话学习页面，支持文档查看与对话并行。

## 功能

### 核心功能
1. **实时对话**: 与 AI 进行学习讨论
2. **提示等级**: AI 回复带有提示等级（轻度、中度、详细）
3. **历史记录**: 保存对话历史
4. **响应式设计**: 适配各种屏幕尺寸

### ✨ 分屏布局（新）
5. **文档查看器**: 左侧显示上传的学习材料
6. **切换显示**: 可以显示/隐藏文档查看器
7. **动态布局**: 根据是否有文档自动调整宽度
8. **多格式支持**: PDF、图片、文本文件预览

## 页面布局

```
┌─────────────────────────────────────────────────────┐
│ Header: AI学习助手        [显示/隐藏文档] 按钮      │
├────────────────────────┬────────────────────────────┤
│                        │                            │
│   文档查看器           │    聊天消息列表            │
│   (DocumentViewer)     │    (MessageList)           │
│                        │                            │
│   - PDF预览            │    - 用户消息              │
│   - 图片显示           │    - AI回复                │
│   - 文本预览           │    - 提示等级              │
│   - 新窗口打开         │                            │
│                        │                            │
│   50% 宽度             │    50% 宽度                │
│   (可隐藏)             │    (可扩展到100%)          │
│                        │                            │
├────────────────────────┼────────────────────────────┤
│                        │  消息输入框                │
│                        │  (MessageInput)            │
└────────────────────────┴────────────────────────────┘
```

## 使用方式

### 方式 1: 从上传页面跳转
1. 在上传页面上传文件
2. 点击"开始对话学习"按钮
3. 自动跳转到聊天页面，带上 `fileId` 和 `filename` 参数
4. 左侧自动显示文档，右侧开始对话

### 方式 2: 直接访问
直接访问 `/chat` 页面，无文档模式，全屏聊天界面。

### 方式 3: URL 参数访问
```
/chat?fileId=abc123&filename=study.pdf
```

## URL 参数

| 参数 | 类型 | 说明 | 示例 |
|------|------|------|------|
| `fileId` | string | 上传文件的 ID | `9c7f7648-75b9-44e2-a123-0866de434e62` |
| `filename` | string | 原始文件名 | `数学作业.pdf` |

## 技术实现

### 前端架构
- **框架**: Next.js 16 App Router
- **状态管理**: React useState hooks
- **URL 参数**: `useSearchParams()` hook
- **客户端渲染**: 'use client' 指令

### API 集成
```typescript
const response = await fetch('http://localhost:4000/api/chat', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    message: userMessage,
    fileId: fileId, // 可选，如果有上传文件
  }),
})
```

### 文档 URL 构建
```typescript
const fileUrl = fileId 
  ? `http://localhost:4000/uploads/${fileId}.${filename?.split('.').pop()}`
  : undefined
```

### 响应式宽度
```typescript
className={`flex flex-col ${showDocument && fileUrl ? 'w-1/2' : 'w-full'}`}
```

## 组件结构

```
page.tsx (Client Component)
├── Layout
│   ├── Header
│   │   ├── Title: "AI学习助手"
│   │   └── Toggle Button: 显示/隐藏文档
│   ├── Content (flex-1 flex)
│   │   ├── DocumentViewer (w-1/2, 条件渲染)
│   │   └── Chat Area (w-1/2 or w-full)
│   │       ├── MessageList
│   │       └── MessageInput
```

## 状态管理

| State | Type | 说明 |
|-------|------|------|
| `messages` | `Message[]` | 聊天消息列表 |
| `isLoading` | `boolean` | API 请求加载状态 |
| `error` | `string \| null` | 错误信息 |
| `showDocument` | `boolean` | 是否显示文档查看器 |

## 交互流程

### 发送消息
1. 用户在 `MessageInput` 输入内容
2. 点击发送或按 Enter
3. 消息添加到 `messages` 状态
4. 调用后端 `/api/chat` 接口
5. 接收 AI 回复并添加到消息列表
6. 自动滚动到最新消息

### 切换文档显示
1. 点击 Header 的"显示/隐藏文档"按钮
2. `showDocument` 状态切换
3. 左侧面板显示/隐藏
4. 右侧聊天区宽度自动调整

## 错误处理

- API 请求失败：显示错误消息横幅
- 文档加载失败：显示上传引导
- 网络断开：提示重新连接

## 性能优化

- 使用 `useEffect` 自动滚动到底部
- 条件渲染避免不必要的组件加载
- 文件 URL 延迟构建（仅在需要时）

---

**最后更新**: 2025年10月30日
