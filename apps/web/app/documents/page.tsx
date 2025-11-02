'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ApiClient } from '@/lib/api-client'

interface Document {
  id: string
  filename: string
  uploadedAt: string
  size: number
  ocrStatus: 'pending' | 'processing' | 'completed' | 'failed'
  ocrResult?: string
}

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<Document[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadDocuments()
  }, [])

  const loadDocuments = async () => {
    try {
      setLoading(true)
      setError(null)
      // TODO: Implement API call to fetch documents
      // const response = await ApiClient.getDocuments()
      // setDocuments(response.data)
      setDocuments([]) // Placeholder
    } catch (err) {
      setError('加载文档失败')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (confirm('确定要删除这个文档吗？')) {
      try {
        // TODO: Implement API call to delete document
        // await ApiClient.deleteDocument(id)
        setDocuments(prev => prev.filter(d => d.id !== id))
      } catch (err) {
        setError('删除文档失败')
        console.error(err)
      }
    }
  }

  const handleStartChat = (document: Document) => {
    // Navigate to chat with this document
    const params = new URLSearchParams({
      fileId: document.id,
      filename: document.filename,
    })
    window.location.href = `/chat?${params.toString()}`
  }

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
  }

  const getOCRStatusBadge = (status: string) => {
    const config: Record<string, { text: string; bg: string; text_color: string }> = {
      pending: { text: '等待中', bg: 'bg-gray-100', text_color: 'text-gray-700' },
      processing: { text: '处理中...', bg: 'bg-blue-100', text_color: 'text-blue-700' },
      completed: { text: '已完成', bg: 'bg-green-100', text_color: 'text-green-700' },
      failed: { text: '失败', bg: 'bg-red-100', text_color: 'text-red-700' },
    }
    const style = config[status] || config.pending
    return (
      <span className={`inline-block px-2 py-1 rounded text-sm font-medium ${style.bg} ${style.text_color}`}>
        {style.text}
      </span>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin mb-4 text-3xl">📄</div>
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
              <h1 className="text-2xl font-bold text-gray-900">我的文档</h1>
              <p className="text-sm text-gray-500 mt-1">
                {documents.length} 个文档
              </p>
            </div>
            <Link
              href="/upload"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              + 上传文档
            </Link>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            {error}
          </div>
        )}

        {documents.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
            <p className="text-4xl mb-4">📭</p>
            <p className="text-gray-500">暂无文档</p>
            <Link
              href="/upload"
              className="inline-block mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              上传文档
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {documents.map(doc => (
              <div
                key={doc.id}
                className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-lg">📄</span>
                      <p className="font-medium text-gray-900">{doc.filename}</p>
                    </div>
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <p className="text-gray-500">大小</p>
                        <p className="text-gray-900 font-medium">{formatSize(doc.size)}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">上传时间</p>
                        <p className="text-gray-900 font-medium">
                          {new Date(doc.uploadedAt).toLocaleDateString('zh-CN')}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-500">OCR 状态</p>
                        <p className="font-medium">{getOCRStatusBadge(doc.ocrStatus)}</p>
                      </div>
                    </div>
                    {doc.ocrResult && (
                      <details className="mt-3">
                        <summary className="cursor-pointer text-sm text-blue-600 hover:text-blue-700">
                          查看识别结果
                        </summary>
                        <p className="mt-2 text-sm text-gray-700 bg-gray-50 p-3 rounded max-h-32 overflow-y-auto">
                          {doc.ocrResult}
                        </p>
                      </details>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleStartChat(doc)}
                      className="px-3 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                      disabled={doc.ocrStatus !== 'completed'}
                      title={doc.ocrStatus !== 'completed' ? '请等待 OCR 完成' : '开始对话'}
                    >
                      💬 对话
                    </button>
                    <button
                      onClick={() => handleDelete(doc.id)}
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
