'use client'

import { useEffect, useRef } from 'react'
import { MessageBubble, Message } from './MessageBubble'

export interface MessageListProps {
  messages: Message[]
  isLoading?: boolean
  streamingContent?: string // 方案7: 流式内容
  isStreaming?: boolean // 方案7: 是否正在流式输出
  isThinking?: boolean // 🧠 是否正在思考（等待第一个字）
  onFileClick?: (fileUrl?: string, filename?: string) => void // 文件点击回调
}

export function MessageList({ 
  messages, 
  isLoading = false,
  streamingContent = '',
  isStreaming = false,
  isThinking = false,
  onFileClick
}: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, streamingContent]) // 方案7: 添加 streamingContent 依赖

  if (messages.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-full text-gray-500">
        <div className="text-center space-y-4">
          <div className="text-4xl">💬</div>
          <div>
            <p className="text-lg font-medium">No messages yet</p>
            <p className="text-sm text-gray-400 mt-1">Start a conversation and ask your questions!</p>
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mt-4 max-w-sm text-sm text-left">
            <p className="font-medium text-blue-900">💡 Tips:</p>
            <ul className="mt-2 space-y-1 text-blue-700 list-disc list-inside text-xs">
              <li>Provide specific background information</li>
              <li>Describe what you've already tried</li>
              <li>Help the AI understand your needs better</li>
            </ul>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div ref={containerRef} className="px-4 py-6 space-y-4 min-h-full">{/* 改为 min-h-full，让内容可以滚动 */}
      {messages.map((message, index) => {
        const isLastMessage = index === messages.length - 1
        const isStreamingLastMessage = isLoading && isLastMessage && message.role === 'assistant'
        
        // 使用稳定的 key，让 React 更新而不是重新创建组件
        const messageKey = `msg-${index}`
        
        return (
          <MessageBubble 
            key={messageKey} 
            message={message}
            isLoading={isStreamingLastMessage}
            isStreaming={isStreamingLastMessage}
            onFileClick={onFileClick}
          />
        )
      })}
      
      {/* 方案7: 显示流式内容（独立于 messages） */}
      {/* 只在有内容时才显示流式消息气泡，思考时不显示 */}
      {isStreaming && !isThinking && streamingContent && (
        <MessageBubble
          key="streaming-message"
          message={{
            role: 'assistant',
            content: streamingContent,
            hintLevel: undefined,
            timestamp: Date.now(),
          }}
          isLoading={false}
          isStreaming={true}
          onFileClick={onFileClick}
        />
      )}
      
      {/* 🧠 Thinking indicator - waiting for AI's first response */}
      {isThinking && (
        <div className="flex justify-start mb-4">
          <div className="flex items-center gap-3 px-5 py-4 rounded-2xl bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 rounded-bl-sm shadow-sm">
            <div className="flex gap-1.5">
              <div className="w-2.5 h-2.5 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <div className="w-2.5 h-2.5 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <div className="w-2.5 h-2.5 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-blue-700">🧠 AI is thinking</span>
              <span className="text-xs text-blue-500 animate-pulse">...</span>
            </div>
          </div>
        </div>
      )}
      
      {/* Loading indicator while waiting for response (fallback for non-streaming) */}
      {isLoading && !isStreaming && !isThinking && (messages.length === 0 || messages[messages.length - 1]?.role === 'user') && (
        <div className="flex justify-start mb-4">
          <div className="flex items-center gap-2 px-4 py-3 rounded-2xl bg-gray-100 rounded-bl-sm">
            <div className="flex gap-1">
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
            <span className="text-sm text-gray-600 ml-2">AI is responding...</span>
          </div>
        </div>
      )}
      
      <div ref={bottomRef} />
    </div>
  )
}
