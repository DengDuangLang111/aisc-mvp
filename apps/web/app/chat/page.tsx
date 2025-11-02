'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { MessageList } from './components/MessageList'
import { MessageInput } from './components/MessageInput'
import { Message } from './components/MessageBubble'
import { DocumentViewer } from './components/DocumentViewer'
import { ApiClient, ApiError } from '../../lib/api-client'
import { ChatStorage } from '../../lib/storage'

export default function ChatPage() {
  const searchParams = useSearchParams()
  const [messages, setMessages] = useState<Message[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showDocument, setShowDocument] = useState(true)
  const [sessionLoaded, setSessionLoaded] = useState(false)
  
  // 从 URL 获取文件信息
  const fileId = searchParams.get('fileId')
  const filename = searchParams.get('filename')
  const fileUrl = fileId && filename
    ? ApiClient.buildFileUrl(fileId, filename.split('.').pop() || 'txt')
    : undefined

  // 加载历史会话
  useEffect(() => {
    if (sessionLoaded) return

    try {
      let session = null
      
      if (fileId) {
        // 如果有 fileId，尝试加载对应的会话
        session = ChatStorage.getSessionByFileId(fileId)
      } else {
        // 否则加载最近的通用会话
        const allSessions = ChatStorage.getAllSessions()
        session = allSessions.find(s => !s.fileId) || null
      }

      if (session && session.messages.length > 0) {
        setMessages(session.messages)
        console.log(`已加载 ${session.messages.length} 条历史消息`)
      }
    } catch (e) {
      console.error('加载会话失败:', e)
    } finally {
      setSessionLoaded(true)
    }
  }, [fileId, sessionLoaded])

  // 保存会话到 localStorage
  useEffect(() => {
    if (!sessionLoaded) return // 等待会话加载完成
    if (messages.length === 0) return // 空会话不保存

    try {
      ChatStorage.saveSession({
        fileId: fileId || undefined,
        filename: filename || undefined,
        messages,
      })
    } catch (e) {
      console.error('保存会话失败:', e)
    }
  }, [messages, fileId, filename, sessionLoaded])

  const handleSend = async (content: string) => {
    // Add user message
    const userMessage: Message = {
      role: 'user',
      content,
      timestamp: Date.now(),
    }
    setMessages((prev) => [...prev, userMessage])
    setIsLoading(true)
    setError(null)

    try {
      // Prepare conversation history for API
      const conversationHistory = messages.map((msg) => ({
        role: msg.role,
        content: msg.content,
      }))

      // Call chat API using ApiClient
      const data = await ApiClient.chat({
        message: content,
        conversationHistory,
        uploadId: fileId || undefined,
      })

      // Add assistant message
      const assistantMessage: Message = {
        role: 'assistant',
        content: data.reply,
        hintLevel: data.hintLevel,
        timestamp: data.timestamp,
      }
      setMessages((prev) => [...prev, assistantMessage])
    } catch (err) {
      if (err instanceof ApiError) {
        setError(`发送失败 (${err.statusCode}): ${err.message}`)
      } else {
        setError('发送消息失败，请重试')
      }
      console.error('Chat error:', err)
    } finally {
      setIsLoading(false)
    }
  }

  // 清空当前会话
  const handleClearChat = () => {
    if (confirm('确定要清空当前对话吗？此操作不可恢复。')) {
      setMessages([])
      // 删除 localStorage 中的会话
      if (fileId) {
        const session = ChatStorage.getSessionByFileId(fileId)
        if (session) {
          ChatStorage.deleteSession(session.id)
        }
      }
    }
  }

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-4 py-3 shadow-sm flex-shrink-0">
        <div className="max-w-full mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-gray-900">AI 学习助手</h1>
            <p className="text-sm text-gray-600 mt-1">
              智能渐进式提示系统 - 帮助你独立思考
              {messages.length > 0 && (
                <span className="ml-2 text-xs text-gray-500">
                  ({messages.length} 条消息)
                </span>
              )}
            </p>
          </div>
          
          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            {/* Clear Chat Button */}
            {messages.length > 0 && (
              <button
                onClick={handleClearChat}
                className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                title="清空对话"
              >
                <svg
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                  />
                </svg>
              </button>
            )}
            
            {/* Toggle Document Button */}
            {fileUrl && (
              <button
                onClick={() => setShowDocument(!showDocument)}
                className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
              <svg
                className="-ml-1 mr-2 h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                {showDocument ? (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
                  />
                ) : (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                  />
                )}
              </svg>
              {showDocument ? '隐藏文档' : '显示文档'}
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Error message */}
      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 px-4 py-3 mx-4 mt-4 flex-shrink-0">
          <p className="text-red-700 text-sm">{error}</p>
        </div>
      )}

      {/* Main Content - Split View */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel - Document Viewer */}
        {showDocument && fileUrl && (
          <div className="w-1/2 border-r border-gray-200 flex-shrink-0">
            <DocumentViewer fileUrl={fileUrl} filename={filename || undefined} />
          </div>
        )}

        {/* Right Panel - Chat */}
        <div className={`flex flex-col ${showDocument && fileUrl ? 'w-1/2' : 'w-full'}`}>
          {/* Messages */}
          <div className="flex-1 overflow-hidden">
            <MessageList messages={messages} />
          </div>

          {/* Input */}
          <MessageInput onSend={handleSend} disabled={isLoading} />
        </div>
      </div>
    </div>
  )
}
