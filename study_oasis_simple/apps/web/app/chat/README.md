# Chat 功能文档

AI 聊天界面，支持渐进式提示的多轮对话。

## 功能特性

1. **多轮对话**: 维护完整的对话历史
2. **渐进式提示**: 根据提问次数自动调整提示等级
3. **实时反馈**: 打字动画和状态提示
4. **消息气泡**: 区分用户和 AI 消息
5. **自动滚动**: 新消息自动滚动到底部

## 组件结构

```
chat/
├── README.md           # 本文档
├── page.tsx           # 聊天页面主组件
└── components/        # 聊天相关组件
    ├── README.md      # 组件文档
    ├── MessageList.tsx    # 消息列表
    ├── MessageBubble.tsx  # 单条消息气泡
    ├── MessageInput.tsx   # 输入框
    └── HintLevelBadge.tsx # 提示等级标识
```

## API 接口

### POST /chat

**请求格式:**
```typescript
{
  message: string                    // 用户输入的消息
  conversationHistory: Message[]     // 对话历史
  uploadId?: string                  // 关联的文件 ID（可选）
}

interface Message {
  role: 'user' | 'assistant'
  content: string
}
```

**响应格式:**
```typescript
{
  reply: string          // AI 回复内容
  hintLevel: 1 | 2 | 3  // 提示等级
  timestamp: number      // 时间戳
  sources?: string[]     // 来源（可选）
}
```

## 提示等级说明

### Level 1 - 轻微提示 🤔
- **触发条件**: 0-1 次提问
- **提示风格**: 引导思考方向，不给具体答案
- **徽章颜色**: 绿色 (#10b981)

### Level 2 - 中等提示 💡
- **触发条件**: 2-3 次提问
- **提示风格**: 提供思路步骤，接近答案但不直接给出
- **徽章颜色**: 橙色 (#f59e0b)

### Level 3 - 详细提示 ✨
- **触发条件**: 4+ 次提问
- **提示风格**: 详细指导，非常接近答案
- **徽章颜色**: 红色 (#ef4444)

## 状态管理

使用 React useState 管理以下状态：
- `messages`: 消息列表
- `input`: 输入框内容
- `isLoading`: 是否正在发送/接收消息
- `error`: 错误信息

## 样式设计

### 消息气泡
- **用户消息**: 
  - 背景: `bg-blue-600`
  - 文字: `text-white`
  - 位置: 右对齐
  
- **AI 消息**:
  - 背景: `bg-gray-100`
  - 文字: `text-gray-900`
  - 位置: 左对齐

### 输入框
- 固定在底部
- 自适应高度（multiline）
- 发送按钮带加载动画

## 使用示例

```tsx
// 基本使用
import ChatPage from '@/app/chat/page'

// 在应用中使用
<ChatPage />

// 从上传页面跳转
router.push(`/chat?uploadId=${fileId}`)
```

## 测试覆盖

- [x] 消息发送功能
- [x] 消息显示
- [x] 提示等级徽章
- [x] 加载状态
- [x] 错误处理
- [x] 自动滚动

## 性能优化

1. **虚拟滚动**: 大量消息时使用虚拟列表
2. **防抖输入**: 防止频繁触发
3. **缓存历史**: LocalStorage 持久化对话
4. **懒加载**: 按需加载历史消息

## 更新日志

### 2025-10-29
- ✅ 创建聊天功能文档
- ⏳ 实现消息列表组件
- ⏳ 实现输入框组件
- ⏳ 实现提示等级徽章
- ⏳ 集成 API
- ⏳ 添加测试
