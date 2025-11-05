import React, { useRef, useEffect } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';

export interface Message {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: string;
}

export interface VirtualChatListProps {
  messages: Message[];
  height: number;
  itemSize: number;
  className?: string;
  onScrollToBottom?: () => void;
}

/**
 * VirtualChatList - 使用 TanStack Virtual 实现的虚拟滚动聊天消息列表
 *
 * 特性:
 * - 高性能渲染大量消息
 * - 固定高度的消息项
 * - 自动滚动到底部
 * - 支持自定义样式
 *
 * @param messages - 消息数组
 * @param height - 列表容器高度
 * @param itemSize - 每条消息的固定高度
 * @param className - 自定义类名
 * @param onScrollToBottom - 滚动到底部时的回调
 */
export const VirtualChatList: React.FC<VirtualChatListProps> = ({
  messages,
  height,
  itemSize,
  className = '',
  onScrollToBottom,
}) => {
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: messages.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => itemSize,
    overscan: 5,
  });

  // 当消息更新时自动滚动到底部
  useEffect(() => {
    if (messages.length > 0) {
      virtualizer.scrollToIndex(messages.length - 1, { align: 'end' });
      onScrollToBottom?.();
    }
  }, [messages.length, virtualizer, onScrollToBottom]);

  if (messages.length === 0) {
    return <div className="empty-state">No messages yet</div>;
  }

  return (
    <div
      ref={parentRef}
      className={`virtual-chat-list ${className}`}
      style={{
        height: `${height}px`,
        overflow: 'auto',
      }}
      role="list"
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
              key={message.id}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: `${virtualItem.size}px`,
                transform: `translateY(${virtualItem.start}px)`,
              }}
              className={`virtual-chat-message ${message.role}`}
              role="listitem"
            >
              <div className="message-content">{message.content}</div>
              <div className="message-time">
                {new Date(message.timestamp).toLocaleTimeString()}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
