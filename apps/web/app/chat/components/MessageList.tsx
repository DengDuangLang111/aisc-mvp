'use client'

import { useEffect, useRef } from 'react'
import { MessageBubble, Message } from './MessageBubble'

export interface MessageListProps {
  messages: Message[]
  isLoading?: boolean
}

export function MessageList({ messages, isLoading = false }: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  if (messages.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-gray-500">
        <div className="text-center space-y-4">
          <div className="text-4xl">💬</div>
          <div>
            <p className="text-lg font-medium">还没有消息</p>
            <p className="text-sm text-gray-400 mt-1">开始对话吧，提出你的问题或疑惑！</p>
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mt-4 max-w-sm text-sm text-left">
            <p className="font-medium text-blue-900">💡 小提示：</p>
            <ul className="mt-2 space-y-1 text-blue-700 list-disc list-inside text-xs">
              <li>提供具体的问题背景</li>
              <li>描述你已经尝试过的方法</li>
              <li>让 AI 助手更好地理解你的需求</li>
            </ul>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div ref={containerRef} className="flex-1 overflow-y-auto px-4 py-6 space-y-4">
      {messages.map((message, index) => {
        const isLastMessage = index === messages.length - 1
        const isStreamingLastMessage = isLoading && isLastMessage && message.role === 'assistant'
        
        return (
          <MessageBubble 
            key={index} 
            message={message}
            isLoading={isStreamingLastMessage}
            isStreaming={isStreamingLastMessage}
          />
        )
      })}
      
      {/* Loading indicator while waiting for response */}
      {isLoading && (messages.length === 0 || messages[messages.length - 1]?.role === 'user') && (
        <div className="flex justify-start mb-4">
          <div className="flex items-center gap-2 px-4 py-3 rounded-2xl bg-gray-100 rounded-bl-sm">
            <div className="flex gap-1">
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
            <span className="text-sm text-gray-600 ml-2">AI 正在思考中...</span>
          </div>
        </div>
      )}
      
      <div ref={bottomRef} />
    </div>
  )
}
