import { HintLevelBadge } from './HintLevelBadge'

export interface Message {
  role: 'user' | 'assistant'
  content: string
  hintLevel?: 1 | 2 | 3
  conversationId?: string
  timestamp?: number
}

export interface MessageBubbleProps {
  message: Message
  isLoading?: boolean
  isStreaming?: boolean
}

export function MessageBubble({ message, isLoading = false, isStreaming = false }: MessageBubbleProps) {
  const isUser = message.role === 'user'

  const formatTime = (timestamp?: number) => {
    if (!timestamp) return ''
    const date = new Date(timestamp)
    return date.toLocaleTimeString('zh-CN', {
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4 group`}>
      <div className={`max-w-[70%] ${isUser ? 'order-2' : 'order-1'}`}>
        {/* Timestamp and hint level above message */}
        <div className={`flex items-center gap-2 mb-1 ${isUser ? 'justify-end' : 'justify-start'} text-xs text-gray-500`}>
          {!isUser && message.hintLevel && (
            <span className="hidden group-hover:inline">
              <HintLevelBadge level={message.hintLevel} compact />
            </span>
          )}
          {message.timestamp && (
            <span className="opacity-0 group-hover:opacity-100 transition-opacity">
              {formatTime(message.timestamp)}
            </span>
          )}
          {isStreaming && !isUser && (
            <span className="text-xs text-blue-500 font-medium">
              🔄 流式响应中...
            </span>
          )}
        </div>

        {/* Message bubble */}
        <div
          className={`px-4 py-3 rounded-2xl transition-all ${
            isUser
              ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-br-sm shadow-md hover:shadow-lg'
              : `${isLoading || isStreaming ? 'bg-blue-50 border border-blue-200' : 'bg-gray-100'} text-gray-900 rounded-bl-sm shadow-sm hover:shadow-md`
          }`}
        >
          <p className="text-sm md:text-base whitespace-pre-wrap break-words leading-relaxed">
            {message.content}
            {(isLoading || isStreaming) && <span className="inline-block ml-1 animate-pulse">▌</span>}
          </p>
        </div>

        {/* Hint level badge below message (visible on mobile) */}
        {!isUser && message.hintLevel && (
          <div className="mt-2 sm:hidden">
            <HintLevelBadge level={message.hintLevel} />
          </div>
        )}
      </div>
    </div>
  )
}
