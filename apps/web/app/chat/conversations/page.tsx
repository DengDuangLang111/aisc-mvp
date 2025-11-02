'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ChatStorage } from '@/lib/storage'

interface Session {
  id: string
  fileId?: string
  filename?: string
  messages: Array<{
    role: string
    content: string
  }>
  updatedAt: number
}

export default function ConversationsPage() {
  const [sessions, setSessions] = useState<Session[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    try {
      const allSessions = ChatStorage.getAllSessions()
      const sortedSessions = allSessions.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0))
      setSessions(sortedSessions)
    } catch (error) {
      console.error('加载会话失败:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  const handleDelete = (id: string) => {
    if (confirm('确定要删除这个对话吗？')) {
      try {
        ChatStorage.deleteSession(id)
        setSessions(prev => prev.filter(s => s.id !== id))
      } catch (error) {
        console.error('删除会话失败:', error)
      }
    }
  }

  const getPreview = (session: Session) => {
    if (session.messages.length === 0) {
      return '(空对话)'
    }
    const lastMessage = session.messages[session.messages.length - 1]
    return lastMessage.content.substring(0, 50) + (lastMessage.content.length > 50 ? '...' : '')
  }

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp)
    return date.toLocaleDateString('zh-CN', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin mb-4">💬</div>
          <p>加载中...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">对话记录</h1>
              <p className="text-sm text-gray-500 mt-1">
                {sessions.length} 个对话
              </p>
            </div>
            <Link
              href="/chat"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              + 新建对话
            </Link>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        {sessions.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-4xl mb-4">📭</p>
            <p className="text-gray-500">暂无对话记录</p>
            <Link
              href="/chat"
              className="inline-block mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              开始对话
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {sessions.map(session => (
              <div
                key={session.id}
                className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between gap-4">
                  <Link
                    href={
                      session.fileId
                        ? `/chat?fileId=${session.fileId}&filename=${encodeURIComponent(session.filename || '')}`
                        : '/chat'
                    }
                    className="flex-1 hover:text-blue-600 group"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      {session.fileId ? (
                        <>
                          <span className="text-lg">📄</span>
                          <p className="font-medium text-gray-900 group-hover:text-blue-600">
                            {session.filename || '未命名文档'}
                          </p>
                        </>
                      ) : (
                        <>
                          <span className="text-lg">💬</span>
                          <p className="font-medium text-gray-900 group-hover:text-blue-600">
                            一般对话
                          </p>
                        </>
                      )}
                    </div>
                    <p className="text-sm text-gray-600">
                      {getPreview(session)}
                    </p>
                  </Link>

                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-xs text-gray-500">
                        {session.messages.length} 条消息
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        {formatDate(session.updatedAt || Date.now())}
                      </p>
                    </div>

                    <button
                      onClick={() => handleDelete(session.id)}
                      className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                      title="删除"
                    >
                      <svg
                        className="w-5 h-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                        />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
