import { HintLevelBadge } from './HintLevelBadge'
import { FileAttachment } from './FileAttachment'
import { logger } from '../../../lib/logger';

export interface FileAttachmentData {
  filename: string
  fileUrl?: string
  documentId?: string
  fileSize?: number
  uploadTime?: number
}

export interface Message {
  role: 'user' | 'assistant'
  content: string
  hintLevel?: 1 | 2 | 3
  conversationId?: string
  timestamp?: number
  attachment?: FileAttachmentData // 文件附件
}

export interface MessageBubbleProps {
  message: Message
  isLoading?: boolean
  isStreaming?: boolean
  onFileClick?: (fileUrl?: string, filename?: string) => void // 点击文件附件的回调
}

export function MessageBubble({ message, isLoading = false, isStreaming = false, onFileClick }: MessageBubbleProps) {
  const isUser = message.role === 'user'

  // 调试：记录内容变化
  if (isStreaming && !isUser) {
    logger.debug('[MessageBubble] Rendering with content length', { length: message.content.length });
  }

  const formatTime = (timestamp?: number) => {
    if (!timestamp) return ''
    const date = new Date(timestamp)
    return date.toLocaleTimeString('zh-CN', {
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const handleFileClick = () => {
    if (message.attachment && onFileClick) {
      onFileClick(message.attachment.fileUrl, message.attachment.filename)
    }
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
        </div>

        {/* File Attachment (if present) */}
        {message.attachment && (
          <div className="mb-2">
            <FileAttachment
              filename={message.attachment.filename}
              fileUrl={message.attachment.fileUrl}
              fileSize={message.attachment.fileSize}
              uploadTime={message.attachment.uploadTime}
              onClick={onFileClick ? handleFileClick : undefined}
            />
          </div>
        )}

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
