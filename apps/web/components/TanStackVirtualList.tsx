import React, { useRef, useEffect } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import type { Message } from './VirtualChatList';

interface TanStackVirtualListProps {
  messages: Message[];
  height?: number;
  estimateSize?: number;
  className?: string;
}

/**
 * 使用 TanStack Virtual 的动态高度虚拟滚动列表
 * 适用于消息高度不固定的场景
 */
export function TanStackVirtualList({
  messages,
  height = 600,
  estimateSize = 100,
  className = '',
}: TanStackVirtualListProps) {
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: messages.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => estimateSize,
    overscan: 5, // 预渲染额外的项
  });

  // 自动滚动到底部
  useEffect(() => {
    if (messages.length > 0) {
      virtualizer.scrollToIndex(messages.length - 1, {
        align: 'end',
        behavior: 'smooth',
      });
    }
  }, [messages.length, virtualizer]);

  if (messages.length === 0) {
    return (
      <div className={`chat-list-empty ${className}`} style={{ height }}>
        <p>暂无消息</p>
      </div>
    );
  }

  return (
    <div
      ref={parentRef}
      className={`tanstack-virtual-list ${className}`}
      style={{
        height: `${height}px`,
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
              key={virtualItem.key}
              data-index={virtualItem.index}
              ref={virtualizer.measureElement}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                transform: `translateY(${virtualItem.start}px)`,
              }}
            >
              <div className={`message message-${message.role}`}>
                <div className="message-content">{message.content}</div>
                <div className="message-time">
                  {new Date(message.timestamp).toLocaleTimeString()}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
