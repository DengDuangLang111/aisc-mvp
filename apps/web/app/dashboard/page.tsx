'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

interface DashboardStats {
  totalMessages: number
  totalDocuments: number
  totalTokensUsed: number
  estimatedCost: number
  averageTokensPerMessage: number
}

interface ChartData {
  label: string
  value: number
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats>({
    totalMessages: 0,
    totalDocuments: 0,
    totalTokensUsed: 0,
    estimatedCost: 0,
    averageTokensPerMessage: 0,
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadStats()
  }, [])

  const loadStats = async () => {
    try {
      // TODO: Implement API call to fetch statistics
      // const response = await ApiClient.getStats()
      // setStats(response.data)
      setStats({
        totalMessages: 0,
        totalDocuments: 0,
        totalTokensUsed: 0,
        estimatedCost: 0,
        averageTokensPerMessage: 0,
      })
    } finally {
      setLoading(false)
    }
  }

  const StatCard = ({ title, value, unit, icon }: {
    title: string
    value: number | string
    unit?: string
    icon: string
  }) => (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-gray-600 text-sm font-medium">{title}</p>
          <p className="text-3xl font-bold text-gray-900 mt-2">
            {value}
            {unit && <span className="text-lg text-gray-500 ml-1">{unit}</span>}
          </p>
        </div>
        <div className="text-4xl">{icon}</div>
      </div>
    </div>
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin mb-4 text-3xl">📊</div>
          <p>加载中...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 py-6">
          <h1 className="text-2xl font-bold text-gray-900">学习仪表盘</h1>
          <p className="text-sm text-gray-500 mt-1">
            查看你的学习统计和使用情况
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          <StatCard
            title="总消息数"
            value={stats.totalMessages}
            unit="条"
            icon="💬"
          />
          <StatCard
            title="上传文档"
            value={stats.totalDocuments}
            unit="个"
            icon="📄"
          />
          <StatCard
            title="使用 Tokens"
            value={stats.totalTokensUsed.toLocaleString()}
            unit=""
            icon="🔑"
          />
          <StatCard
            title="平均每条消息 Tokens"
            value={Math.round(stats.averageTokensPerMessage)}
            unit=""
            icon="📈"
          />
          <StatCard
            title="预估成本"
            value={stats.estimatedCost.toFixed(4)}
            unit="元"
            icon="💰"
          />
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg border border-blue-200 p-6 flex items-center justify-center">
            <div className="text-center">
              <p className="text-4xl">✨</p>
              <p className="text-gray-700 font-medium mt-2">
                {stats.totalMessages > 0 ? '保持学习动力！' : '开始你的学习之旅'}
              </p>
            </div>
          </div>
        </div>

        {/* Quick Links */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">快速访问</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Link
              href="/chat"
              className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg border border-blue-200 hover:shadow-md transition-shadow"
            >
              <p className="text-2xl mb-2">💬</p>
              <p className="font-medium text-gray-900">开始对话</p>
              <p className="text-sm text-gray-600 mt-1">与 AI 助手交流</p>
            </Link>

            <Link
              href="/documents"
              className="p-4 bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg border border-purple-200 hover:shadow-md transition-shadow"
            >
              <p className="text-2xl mb-2">📄</p>
              <p className="font-medium text-gray-900">我的文档</p>
              <p className="text-sm text-gray-600 mt-1">管理上传的文档</p>
            </Link>

            <Link
              href="/chat/conversations"
              className="p-4 bg-gradient-to-br from-green-50 to-green-100 rounded-lg border border-green-200 hover:shadow-md transition-shadow"
            >
              <p className="text-2xl mb-2">📋</p>
              <p className="font-medium text-gray-900">对话记录</p>
              <p className="text-sm text-gray-600 mt-1">查看历史对话</p>
            </Link>
          </div>
        </div>

        {/* Usage Tips */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <div className="flex gap-4">
            <div className="text-2xl">💡</div>
            <div>
              <h3 className="font-bold text-blue-900">使用建议</h3>
              <ul className="mt-2 text-sm text-blue-800 space-y-1 list-disc list-inside">
                <li>在对话中保持连贯的问题，AI 会记住之前的内容</li>
                <li>上传相关文档可以让 AI 提供更准确的解答</li>
                <li>使用不同的对话来处理不同主题，保持对话整洁</li>
                <li>定期查看对话记录，复习重要内容</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
