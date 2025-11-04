import React, { useRef, useEffect, useCallback } from 'react';
import { FixedSizeList as List } from 'react-window';

export interface Message {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: string;
}

interface VirtualChatListProps {
  messages: Message[];
  height?: number;
  itemSize?: number;
  className?: string;
  onScrollToBottom?: () => void;
}

/**
 * 虚拟滚动聊天列表组件
 * 使用 react-window 优化大量消息的渲染性能
 */
export function VirtualChatList({
  messages,
  height = 600,
  itemSize = 100,
  className = '',
  onScrollToBottom,
}: VirtualChatListProps) {
  const listRef = useRef<List>(null);

  // 自动滚动到底部
  const scrollToBottom = useCallback(() => {
    if (listRef.current && messages.length > 0) {
      listRef.current.scrollToItem(messages.length - 1, 'end');
      onScrollToBottom?.();
    }
  }, [messages.length, onScrollToBottom]);

  // 新消息时自动滚动
  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // 渲染单个消息行
  const Row = ({ index, style }: { index: number; style: React.CSSProperties }) => {
    const message = messages[index];
    
    return (
      <div style={style} className="message-row">
        <div className={`message message-${message.role}`}>
          <div className="message-content">{message.content}</div>
          <div className="message-time">
            {new Date(message.timestamp).toLocaleTimeString()}
          </div>
        </div>
      </div>
    );
  };

  if (messages.length === 0) {
    return (
      <div className={`chat-list-empty ${className}`} style={{ height }}>
        <p>暂无消息</p>
      </div>
    );
  }

  return (
    <div className={`virtual-chat-list ${className}`}>
      <List
        ref={listRef}
        height={height}
        itemCount={messages.length}
        itemSize={itemSize}
        width="100%"
        overscanCount={5} // 预渲染额外的5个项
      >
        {Row}
      </List>
    </div>
  );
}
