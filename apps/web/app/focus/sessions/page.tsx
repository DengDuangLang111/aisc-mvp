'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useFocusSession } from '@/hooks/useFocusSession'
import type { FocusSession } from '@/types/focus'

type SortOption = 'date-desc' | 'date-asc' | 'duration-desc' | 'duration-asc' | 'score-desc'
type StatusFilter = 'all' | 'completed' | 'abandoned'

export default function SessionsPage() {
  const { getUserSessions, getSession, error: hookError } = useFocusSession()
  
  const [sessions, setSessions] = useState<FocusSession[]>([])
  const [filteredSessions, setFilteredSessions] = useState<FocusSession[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  const [sortBy, setSortBy] = useState<SortOption>('date-desc')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  
  const itemsPerPage = 10

  // 加载会话列表
  useEffect(() => {
    const loadSessions = async () => {
      try {
        setLoading(true)
        setError(null)
        
        // 获取用户的所有会话（分页）
        const limit = 100 // 一次加载 100 条
        const offset = 0
        const response = await getUserSessions(limit, offset)
        
        // response 是一个对象，包含 { data, total, limit, offset }
        setSessions(response?.data || [])
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to load sessions'
        setError(message)
        console.error('Error loading sessions:', err)
      } finally {
        setLoading(false)
      }
    }

    loadSessions()
  }, [getUserSessions])

  // 应用筛选和排序
  useEffect(() => {
    let result = [...sessions]

    // 状态筛选
    if (statusFilter !== 'all') {
      result = result.filter(session => session.status === statusFilter)
    }

    // 搜索
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase()
      result = result.filter(session =>
        session.id.includes(term) ||
        session.documentId?.includes(term) ||
        session.conversationId?.includes(term)
      )
    }

    // 排序
    result.sort((a, b) => {
      switch (sortBy) {
        case 'date-desc':
          return new Date(b.startTime).getTime() - new Date(a.startTime).getTime()
        case 'date-asc':
          return new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
        case 'duration-desc':
          return (b.totalDuration || 0) - (a.totalDuration || 0)
        case 'duration-asc':
          return (a.totalDuration || 0) - (b.totalDuration || 0)
        case 'score-desc':
          return (b.focusScore || 0) - (a.focusScore || 0)
        default:
          return 0
      }
    })

    setFilteredSessions(result)
    setCurrentPage(1)
  }, [sessions, statusFilter, searchTerm, sortBy])

  // 分页
  const totalPages = Math.ceil(filteredSessions.length / itemsPerPage)
  const paginatedSessions = filteredSessions.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  )

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString)
    return {
      date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      time: date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
    }
  }

  const formatDuration = (seconds?: number | null) => {
    if (!seconds) return '0m'
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    if (hours > 0) return `${hours}h ${minutes}m`
    return `${minutes}m`
  }

  const getScoreGrade = (score?: number | null) => {
    if (score === null || score === undefined) return 'N/A'
    if (score >= 90) return 'A'
    if (score >= 80) return 'B'
    if (score >= 70) return 'C'
    if (score >= 60) return 'D'
    return 'F'
  }

  const getScoreColor = (score?: number | null) => {
    if (score === null || score === undefined) return 'text-gray-400'
    if (score >= 90) return 'text-green-600'
    if (score >= 80) return 'text-blue-600'
    if (score >= 70) return 'text-yellow-600'
    if (score >= 60) return 'text-orange-600'
    return 'text-red-600'
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-8">
      <div className="max-w-6xl mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Focus Sessions</h1>
          <p className="text-gray-600">View and analyze all your focus sessions</p>
        </div>

        {/* Controls */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Search */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
              <input
                type="text"
                placeholder="Session ID or document..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {/* Status Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="all">All Sessions</option>
                <option value="completed">Completed</option>
                <option value="abandoned">Abandoned</option>
              </select>
            </div>

            {/* Sort */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Sort By</label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortOption)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="date-desc">Newest First</option>
                <option value="date-asc">Oldest First</option>
                <option value="duration-desc">Longest Duration</option>
                <option value="duration-asc">Shortest Duration</option>
                <option value="score-desc">Highest Score</option>
              </select>
            </div>

            {/* Stats */}
            <div className="flex items-end">
              <div className="w-full bg-indigo-50 px-3 py-2 rounded-md">
                <p className="text-sm text-gray-600">Total Sessions</p>
                <p className="text-2xl font-bold text-indigo-600">{sessions.length}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Error */}
        {(error || hookError) && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-800">
              <span className="font-semibold">Error:</span> {error || hookError}
            </p>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="text-center py-12">
            <div className="inline-block">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
            </div>
            <p className="text-gray-600 mt-4">Loading sessions...</p>
          </div>
        )}

        {/* Empty State */}
        {!loading && filteredSessions.length === 0 && (
          <div className="text-center py-12 bg-white rounded-lg">
            <div className="text-gray-400 text-5xl mb-4">📭</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No sessions found</h3>
            <p className="text-gray-600 mb-6">Start a focus session to see your progress here.</p>
            <Link
              href="/chat"
              className="inline-block bg-indigo-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-indigo-700 transition-colors"
            >
              Start Focus Session
            </Link>
          </div>
        )}

        {/* Sessions Table */}
        {!loading && filteredSessions.length > 0 && (
          <>
            <div className="bg-white rounded-lg shadow-md overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Date & Time</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Duration</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Distractions</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Focus Score</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Status</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {paginatedSessions.map((session) => {
                      const { date, time } = formatDateTime(session.startTime)
                      const grade = getScoreGrade(session.focusScore)
                      const scoreColor = getScoreColor(session.focusScore)
                      
                      return (
                        <tr key={session.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">{date}</div>
                            <div className="text-xs text-gray-500">{time}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">
                              {formatDuration(session.totalDuration)}
                            </div>
                            <div className="text-xs text-gray-500">
                              {session.activeDuration ? `(${formatDuration(session.activeDuration)} active)` : ''}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">
                              {session.distractionCount || 0}
                            </div>
                            <div className="text-xs text-gray-500">
                              {session.tabSwitchCount ? `${session.tabSwitchCount} tab switch` : ''}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className={`text-lg font-bold ${scoreColor}`}>
                              {session.focusScore !== null && session.focusScore !== undefined
                                ? `${Math.round(session.focusScore)}%`
                                : 'N/A'}
                            </div>
                            <div className="text-xs text-gray-500 font-semibold">Grade: {grade}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span
                              className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${
                                session.status === 'completed'
                                  ? 'bg-green-100 text-green-800'
                                  : 'bg-yellow-100 text-yellow-800'
                              }`}
                            >
                              {session.status === 'completed' ? '✓ Completed' : '◯ Abandoned'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <Link
                              href={`/focus/report/${session.id}`}
                              className="inline-block px-3 py-1 bg-indigo-100 text-indigo-700 rounded font-medium text-xs hover:bg-indigo-200 transition-colors"
                            >
                              View Report
                            </Link>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="mt-6 flex items-center justify-center gap-2">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  ← Previous
                </button>
                <div className="flex items-center gap-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .slice(Math.max(0, currentPage - 2), Math.min(totalPages, currentPage + 1))
                    .map(page => (
                      <button
                        key={page}
                        onClick={() => setCurrentPage(page)}
                        className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                          currentPage === page
                            ? 'bg-indigo-600 text-white'
                            : 'border border-gray-300 text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        {page}
                      </button>
                    ))}
                </div>
                <button
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next →
                </button>
              </div>
            )}
          </>
        )}

        {/* Quick Links */}
        <div className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-6">
          <Link
            href="/chat"
            className="bg-indigo-600 text-white rounded-lg p-6 hover:bg-indigo-700 transition-colors"
          >
            <div className="text-3xl mb-2">🎯</div>
            <h3 className="text-lg font-semibold mb-1">Start New Session</h3>
            <p className="text-sm text-indigo-100">Begin a new focus session with an assignment</p>
          </Link>
          <Link
            href="/dashboard"
            className="bg-purple-600 text-white rounded-lg p-6 hover:bg-purple-700 transition-colors"
          >
            <div className="text-3xl mb-2">📊</div>
            <h3 className="text-lg font-semibold mb-1">View Dashboard</h3>
            <p className="text-sm text-purple-100">Check your overall progress and statistics</p>
          </Link>
        </div>
      </div>
    </div>
  )
}
