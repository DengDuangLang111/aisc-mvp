# 虚拟滚动实现指南 (P3-7)

## 📝 概述

虚拟滚动（Virtual Scrolling）是一种性能优化技术，只渲染可见区域的列表项，大大提升大数据量列表的渲染性能。

## 🎯 适用场景

- ✅ 聊天消息列表（数百条消息）
- ✅ 文档列表
- ✅ 对话历史列表
- ✅ 任何大数据量列表

## 📦 推荐库

### 1. react-window（推荐）

轻量级，性能最好：

```bash
cd apps/web
pnpm add react-window
pnpm add -D @types/react-window
```

### 2. react-virtualized

功能更丰富：

```bash
pnpm add react-virtualized
pnpm add -D @types/react-virtualized
```

### 3. TanStack Virtual

现代化，TypeScript 优先：

```bash
pnpm add @tanstack/react-virtual
```

## 🚀 实现方案

### 方案 1: react-window（推荐）

#### 1. 创建虚拟列表组件

```typescript
// apps/web/components/VirtualChatList.tsx
import { FixedSizeList as List } from 'react-window';
import { Message } from '../types';

interface VirtualChatListProps {
  messages: Message[];
  height: number;
  itemSize: number;
}

export function VirtualChatList({ messages, height, itemSize }: VirtualChatListProps) {
  const Row = ({ index, style }: { index: number; style: React.CSSProperties }) => {
    const message = messages[index];
    
    return (
      <div style={style} className="message-item">
        <div className={`message ${message.role}`}>
          <div className="message-content">{message.content}</div>
          <div className="message-time">{message.timestamp}</div>
        </div>
      </div>
    );
  };

  return (
    <List
      height={height}
      itemCount={messages.length}
      itemSize={itemSize}
      width="100%"
    >
      {Row}
    </List>
  );
}
```

#### 2. 在聊天页面中使用

```typescript
// apps/web/app/chat/page.tsx
import { VirtualChatList } from '@/components/VirtualChatList';

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);

  return (
    <div className="chat-container">
      <VirtualChatList
        messages={messages}
        height={600}
        itemSize={100}
      />
      <ChatInput onSend={handleSend} />
    </div>
  );
}
```

### 方案 2: 动态高度虚拟滚动

对于消息高度不固定的情况：

```typescript
// apps/web/components/DynamicVirtualChatList.tsx
import { VariableSizeList as List } from 'react-window';
import { useRef, useEffect } from 'react';

export function DynamicVirtualChatList({ messages }: { messages: Message[] }) {
  const listRef = useRef<List>(null);
  const rowHeights = useRef<{ [key: number]: number }>({});

  // 测量每个消息的实际高度
  const getItemSize = (index: number) => {
    return rowHeights.current[index] || 100; // 默认高度
  };

  const Row = ({ index, style }: any) => {
    const rowRef = useRef<HTMLDivElement>(null);
    const message = messages[index];

    useEffect(() => {
      if (rowRef.current) {
        const height = rowRef.current.getBoundingClientRect().height;
        if (rowHeights.current[index] !== height) {
          rowHeights.current[index] = height;
          listRef.current?.resetAfterIndex(index);
        }
      }
    }, [index]);

    return (
      <div style={style}>
        <div ref={rowRef} className="message-item">
          <div className={`message ${message.role}`}>
            <div className="message-content">{message.content}</div>
            <div className="message-time">{message.timestamp}</div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <List
      ref={listRef}
      height={600}
      itemCount={messages.length}
      itemSize={getItemSize}
      width="100%"
    >
      {Row}
    </List>
  );
}
```

### 方案 3: TanStack Virtual（最现代）

```typescript
// apps/web/components/TanStackVirtualList.tsx
import { useVirtualizer } from '@tanstack/react-virtual';
import { useRef } from 'react';

export function TanStackVirtualList({ messages }: { messages: Message[] }) {
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: messages.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 100,
    overscan: 5, // 预渲染额外的项
  });

  return (
    <div
      ref={parentRef}
      className="chat-list"
      style={{
        height: '600px',
        overflow: 'auto',
      }}
    >
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative',
        }}
      >
        {virtualizer.getVirtualItems().map((virtualItem) => {
          const message = messages[virtualItem.index];
          return (
            <div
              key={virtualItem.index}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: `${virtualItem.size}px`,
                transform: `translateY(${virtualItem.start}px)`,
              }}
            >
              <div className={`message ${message.role}`}>
                {message.content}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
```

## 🎨 样式优化

```css
/* apps/web/app/chat/styles.css */
.chat-list {
  overflow-y: auto;
  scroll-behavior: smooth;
}

/* 优化滚动性能 */
.chat-list::-webkit-scrollbar {
  width: 8px;
}

.chat-list::-webkit-scrollbar-track {
  background: #f1f1f1;
}

.chat-list::-webkit-scrollbar-thumb {
  background: #888;
  border-radius: 4px;
}

.message-item {
  padding: 12px 16px;
  border-bottom: 1px solid #eee;
}

.message {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.message.user {
  align-items: flex-end;
}

.message.assistant {
  align-items: flex-start;
}
```

## ⚡ 性能优化技巧

### 1. 自动滚动到底部

```typescript
const scrollToBottom = useCallback(() => {
  if (listRef.current) {
    listRef.current.scrollToItem(messages.length - 1, 'end');
  }
}, [messages.length]);

useEffect(() => {
  scrollToBottom();
}, [messages, scrollToBottom]);
```

### 2. 滚动到特定消息

```typescript
const scrollToMessage = (messageId: string) => {
  const index = messages.findIndex(m => m.id === messageId);
  if (index !== -1 && listRef.current) {
    listRef.current.scrollToItem(index, 'center');
  }
};
```

### 3. 虚拟化配置优化

```typescript
<List
  height={600}
  itemCount={messages.length}
  itemSize={100}
  width="100%"
  overscanCount={5}  // 预渲染额外的5个项
  useIsScrolling    // 滚动时显示占位符
  initialScrollOffset={0}
>
```

### 4. 使用 React.memo

```typescript
const MessageRow = React.memo(({ message }: { message: Message }) => {
  return (
    <div className="message-item">
      {/* 消息内容 */}
    </div>
  );
});
```

## 📊 性能对比

| 方案 | 优点 | 缺点 | 适用场景 |
|------|------|------|----------|
| **无虚拟滚动** | 简单 | 性能差 | <100 项 |
| **react-window** | 轻量、快速 | 功能有限 | 固定高度列表 |
| **react-virtualized** | 功能丰富 | 体积较大 | 复杂需求 |
| **TanStack Virtual** | 现代、灵活 | 较新 | 动态高度 |

## 🧪 测试

```typescript
// apps/web/__tests__/VirtualChatList.test.tsx
import { render, screen } from '@testing-library/react';
import { VirtualChatList } from '@/components/VirtualChatList';

describe('VirtualChatList', () => {
  const mockMessages = Array.from({ length: 1000 }, (_, i) => ({
    id: `msg-${i}`,
    content: `Message ${i}`,
    role: i % 2 === 0 ? 'user' : 'assistant',
    timestamp: new Date().toISOString(),
  }));

  it('should render only visible messages', () => {
    render(
      <VirtualChatList
        messages={mockMessages}
        height={600}
        itemSize={100}
      />
    );

    // 只应该渲染可见区域的消息（约 6 个）
    const renderedMessages = screen.getAllByRole('listitem');
    expect(renderedMessages.length).toBeLessThan(20);
  });

  it('should handle empty messages', () => {
    render(
      <VirtualChatList
        messages={[]}
        height={600}
        itemSize={100}
      />
    );

    expect(screen.queryByRole('listitem')).not.toBeInTheDocument();
  });
});
```

## 🔍 调试技巧

```typescript
// 添加性能监控
useEffect(() => {
  const startTime = performance.now();
  
  return () => {
    const endTime = performance.now();
    console.log(`Render time: ${endTime - startTime}ms`);
  };
}, [messages]);
```

## 📚 参考资料

- [react-window 文档](https://react-window.vercel.app/)
- [TanStack Virtual 文档](https://tanstack.com/virtual/latest)
- [虚拟滚动原理](https://web.dev/virtualize-long-lists-react-window/)

## ✅ 实现检查清单

- [ ] 安装虚拟滚动库
- [ ] 创建 VirtualChatList 组件
- [ ] 在聊天页面集成
- [ ] 实现自动滚动到底部
- [ ] 添加样式和动画
- [ ] 性能测试（1000+ 消息）
- [ ] 编写单元测试
- [ ] 优化移动端体验

## 🎯 预期效果

实现后应达到：
- ✅ 1000+ 消息流畅滚动（60fps）
- ✅ 初始渲染时间 < 100ms
- ✅ 内存占用降低 70%
- ✅ 滚动性能提升 10x
