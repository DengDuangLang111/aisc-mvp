'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useFocusSession } from '@/hooks/useFocusSession'
import type { FocusSession } from '@/types/focus'

// 禁用静态生成，使用动态路由
export const dynamic = 'force-dynamic'

interface SessionAnalytics {
  sessionId: string
  userId: string
  startTime: string
  endTime?: string
  totalDuration: number
  activeDuration: number
  distractionTime: number
  focusScore: number
  status: string
  metrics: {
    totalDistractions: number
    tabSwitches: number
    pauses: number
    questionsAsked: number
    distractionsByType: Record<string, number>
  }
  grade: string
  insights: string[]
}

export default function SessionReportPage() {
  const params = useParams()
  const sessionId = params.id as string
  
  const { getSession, getSessionAnalytics, error: hookError } = useFocusSession()
  
  const [session, setSession] = useState<FocusSession | null>(null)
  const [analytics, setAnalytics] = useState<SessionAnalytics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadSessionData = async () => {
      try {
        setLoading(true)
        setError(null)

        // 加载会话详情和分析
        const [sessionData, analyticsData] = await Promise.all([
          getSession(sessionId),
          getSessionAnalytics(sessionId)
        ])

        setSession(sessionData)
        setAnalytics(analyticsData)
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to load session'
        setError(message)
        console.error('Error loading session:', err)
      } finally {
        setLoading(false)
      }
    }

    if (sessionId) {
      loadSessionData()
    }
  }, [sessionId, getSession, getSessionAnalytics])

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center py-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="text-gray-600 mt-4">Loading session report...</p>
        </div>
      </div>
    )
  }

  if (error || hookError || !session) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-8">
        <div className="max-w-2xl mx-auto px-4">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
            <h2 className="text-2xl font-bold text-red-900 mb-2">Session Not Found</h2>
            <p className="text-red-700 mb-6">{error || hookError || 'The requested session could not be found.'}</p>
            <Link
              href="/focus/sessions"
              className="inline-block bg-red-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-red-700 transition-colors"
            >
              Back to Sessions
            </Link>
          </div>
        </div>
      </div>
    )
  }

  const grade = getSessionGrade(session.focusScore)
  const focusQuality = getFocusQuality(session.focusScore)
  const { date, time } = formatDateTime(session.startTime)

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <Link href="/focus/sessions" className="text-indigo-600 hover:text-indigo-700 font-medium mb-4 inline-block">
            ← Back to Sessions
          </Link>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Session Report</h1>
          <p className="text-gray-600">{date} at {time}</p>
        </div>

        {/* Main Score Card */}
        <div className={`rounded-lg shadow-lg p-8 mb-8 text-white ${getGradeColor(grade).bg}`}>
          <div className="text-center mb-8">
            <div className="inline-block">
              <div className="text-7xl font-bold mb-2">{grade}</div>
              <div className="text-xl">{focusQuality}</div>
            </div>
          </div>
          
          <div className="grid grid-cols-3 gap-6 text-center">
            <div>
              <div className="text-3xl font-bold">{session.focusScore ? Math.round(session.focusScore) : 0}%</div>
              <div className="text-sm opacity-90">Focus Score</div>
            </div>
            <div>
              <div className="text-3xl font-bold">{formatDuration(session.totalDuration)}</div>
              <div className="text-sm opacity-90">Total Duration</div>
            </div>
            <div>
              <div className="text-3xl font-bold">{session.distractionCount || 0}</div>
              <div className="text-sm opacity-90">Distractions</div>
            </div>
          </div>

          {/* Celebration or Encouragement Message */}
          <div className="mt-6 pt-6 border-t border-white border-opacity-30 text-center">
            <p className="text-lg">{getMotivationalMessage(session.focusScore)}</p>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* Session Duration */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">⏱️ Duration Breakdown</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Total Duration</span>
                <span className="font-semibold text-gray-900">{formatDuration(session.totalDuration)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Active Time</span>
                <span className="font-semibold text-gray-900">{formatDuration(session.activeDuration)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Paused Time</span>
                <span className="font-semibold text-gray-900">
                  {formatDuration((session.totalDuration || 0) - (session.activeDuration || 0))}
                </span>
              </div>
              <div className="flex justify-between items-center pt-3 border-t border-gray-200">
                <span className="text-gray-600">Pause Count</span>
                <span className="font-semibold text-gray-900">{session.pauseCount || 0}x</span>
              </div>
            </div>
          </div>

          {/* Distraction Analysis */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">😴 Distraction Analysis</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Total Distractions</span>
                <span className="font-semibold text-gray-900">{session.distractionCount || 0}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Tab Switches</span>
                <span className="font-semibold text-gray-900">{session.tabSwitchCount || 0}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Window Blurs</span>
                <span className="font-semibold text-gray-900">
                  {(session.distractionCount || 0) - (session.tabSwitchCount || 0)}
                </span>
              </div>
              <div className="flex justify-between items-center pt-3 border-t border-gray-200">
                <span className="text-gray-600">Distraction Rate</span>
                <span className="font-semibold text-gray-900">
                  {session.totalDuration ? 
                    ((session.distractionCount || 0) / (session.totalDuration / 60)).toFixed(1) 
                    : '0'} per min
                </span>
              </div>
            </div>
          </div>

          {/* AI Interaction */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">🤖 AI Interaction</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Questions Asked</span>
                <span className="font-semibold text-gray-900">{session.questionsAsked || 0}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Hint Levels Used</span>
                <span className="font-semibold text-gray-900">{session.hintLevelsUsed || 0}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Avg Questions/Hour</span>
                <span className="font-semibold text-gray-900">
                  {session.totalDuration && session.questionsAsked
                    ? ((session.questionsAsked / session.totalDuration) * 3600).toFixed(1)
                    : '0'}
                </span>
              </div>
              <div className="flex justify-between items-center pt-3 border-t border-gray-200">
                <span className="text-gray-600">Session Status</span>
                <span className={`font-semibold px-3 py-1 rounded-full text-xs ${
                  session.status === 'completed' 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-yellow-100 text-yellow-800'
                }`}>
                  {session.status === 'completed' ? '✓ Completed' : '◯ Abandoned'}
                </span>
              </div>
            </div>
          </div>

          {/* Progress Comparison */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">📈 This Session</h3>
            <div className="space-y-4">
              {/* Focus Score Progress Bar */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-gray-600">Focus Score</span>
                  <span className="text-sm font-semibold text-gray-900">{Math.round(session.focusScore || 0)}/100</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-gradient-to-r from-indigo-500 to-purple-600 h-2 rounded-full transition-all"
                    style={{ width: `${session.focusScore || 0}%` }}
                  ></div>
                </div>
              </div>

              {/* Achievement Badge */}
              <div className="pt-2 border-t border-gray-200">
                <p className="text-sm text-gray-600 mb-2">🏆 Achievement Earned</p>
                <div className="bg-amber-50 border border-amber-200 rounded px-3 py-2">
                  <p className="text-sm font-semibold text-amber-900">
                    {getAchievementTitle(session.totalDuration)}
                  </p>
                  <p className="text-xs text-amber-700">
                    {getAchievementDescription(session.totalDuration)}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Insights */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-8">
          <h3 className="text-lg font-semibold text-blue-900 mb-4">💡 Insights & Suggestions</h3>
          <ul className="space-y-2">
            {getInsights(session).map((insight, idx) => (
              <li key={idx} className="flex items-start gap-3">
                <span className="text-blue-600 mt-1">→</span>
                <span className="text-blue-900">{insight}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link
            href="/focus/sessions"
            className="bg-gray-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-gray-700 transition-colors text-center"
          >
            ← Back to Sessions
          </Link>
          <button
            onClick={() => window.print()}
            className="bg-indigo-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-indigo-700 transition-colors"
          >
            🖨️ Print Report
          </button>
          <Link
            href="/chat"
            className="bg-purple-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-purple-700 transition-colors text-center"
          >
            ↻ Start New Session
          </Link>
        </div>
      </div>
    </div>
  )
}

// Utility Functions

function getSessionGrade(score?: number | null): string {
  if (score === null || score === undefined) return 'N/A'
  if (score >= 90) return 'A'
  if (score >= 80) return 'B'
  if (score >= 70) return 'C'
  if (score >= 60) return 'D'
  return 'F'
}

function getGradeColor(grade: string) {
  const colors: Record<string, { bg: string; text: string }> = {
    'A': { bg: 'bg-gradient-to-br from-green-500 to-green-600', text: 'text-green-600' },
    'B': { bg: 'bg-gradient-to-br from-blue-500 to-blue-600', text: 'text-blue-600' },
    'C': { bg: 'bg-gradient-to-br from-yellow-500 to-yellow-600', text: 'text-yellow-600' },
    'D': { bg: 'bg-gradient-to-br from-orange-500 to-orange-600', text: 'text-orange-600' },
    'F': { bg: 'bg-gradient-to-br from-red-500 to-red-600', text: 'text-red-600' },
    'N/A': { bg: 'bg-gradient-to-br from-gray-500 to-gray-600', text: 'text-gray-600' }
  }
  return colors[grade] || colors['N/A']
}

function getFocusQuality(score?: number | null): string {
  if (score === null || score === undefined) return 'No Data'
  if (score >= 90) return 'Excellent Focus'
  if (score >= 80) return 'Great Focus'
  if (score >= 70) return 'Good Focus'
  if (score >= 60) return 'Fair Focus'
  return 'Needs Improvement'
}

function getMotivationalMessage(score?: number | null): string {
  if (score === null || score === undefined) return 'Keep practicing to build your focus strength!'
  if (score >= 90) return '🎉 Exceptional focus! You were unstoppable!'
  if (score >= 80) return '✨ Great work! You maintained excellent focus!'
  if (score >= 70) return '👍 Nice session! Keep up the momentum!'
  if (score >= 60) return '💪 Good effort! Try reducing distractions next time.'
  return '📚 Learning experience! Focus takes practice. You\'ve got this!'
}

function formatDuration(seconds?: number | null): string {
  if (!seconds) return '0m'
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = seconds % 60
  
  if (hours > 0) return `${hours}h ${minutes}m`
  if (minutes > 0) return `${minutes}m ${secs}s`
  return `${secs}s`
}

function formatDateTime(dateString: string) {
  const date = new Date(dateString)
  return {
    date: date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }),
    time: date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
  }
}

function getAchievementTitle(duration?: number | null): string {
  if (!duration) return 'Quick Session'
  if (duration >= 3600) return '🏆 Marathon Session'
  if (duration >= 1800) return '⭐ Extended Focus'
  if (duration >= 900) return '✨ Solid Session'
  return '🎯 Getting Started'
}

function getAchievementDescription(duration?: number | null): string {
  if (!duration) return 'First step towards focused learning'
  if (duration >= 3600) return 'You focused for over an hour! Amazing dedication.'
  if (duration >= 1800) return 'You maintained focus for 30+ minutes. Excellent!'
  if (duration >= 900) return 'You completed a 15-minute focused session.'
  return 'You started your focus journey today.'
}

function getInsights(session: FocusSession): string[] {
  const insights: string[] = []

  // Focus quality insights
  if (session.focusScore && session.focusScore >= 90) {
    insights.push('Outstanding focus quality! Your ability to stay on task is exceptional.')
  } else if (session.focusScore && session.focusScore >= 80) {
    insights.push('Strong focus! You minimized distractions effectively.')
  } else if (session.focusScore && session.focusScore < 60) {
    insights.push('Consider identifying and eliminating common distractions during your next session.')
  }

  // Distraction patterns
  if (session.distractionCount && session.totalDuration) {
    const distractionRate = session.distractionCount / (session.totalDuration / 60)
    if (distractionRate > 1) {
      insights.push(`You had ${distractionRate.toFixed(1)} distractions per minute. Try silencing notifications.`)
    }
  }

  // Duration insights
  if (session.totalDuration && session.totalDuration >= 3600) {
    insights.push('Impressive session length! Consider taking breaks to maintain peak performance.')
  } else if (session.totalDuration && session.totalDuration < 900) {
    insights.push('Aim for longer focus sessions (15-25 minutes) to build sustainable studying habits.')
  }

  // AI engagement
  if (session.questionsAsked && session.questionsAsked > 10) {
    insights.push('You asked many questions! Active engagement with AI helps deepen understanding.')
  }

  if (insights.length === 0) {
    insights.push('Good session! Review the stats above and track patterns over time.')
  }

  return insights
}
