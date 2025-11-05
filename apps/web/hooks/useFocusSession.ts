'use client'

import { useState, useCallback, useRef } from 'react'
import { apiFetch } from '@/lib/api/auth'

interface FocusSession {
  id: string
  userId: string
  documentId?: string
  conversationId?: string
  startTime: string
  endTime?: string
  totalDuration?: number
  activeDuration?: number
  pauseCount: number
  distractionCount: number
  tabSwitchCount: number
  questionsAsked: number
  focusScore?: number
  status: 'active' | 'paused' | 'completed' | 'abandoned'
  completionProofId?: string
  createdAt: string
  updatedAt: string
}

interface FocusSessionAnalytics {
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

interface UseFocusSessionReturn {
  // State
  currentSession: FocusSession | null
  loading: boolean
  error: string | null

  // Actions
  createSession: (documentId?: string, conversationId?: string) => Promise<FocusSession>
  updateSession: (sessionId: string, updateData: any) => Promise<FocusSession>
  logDistraction: (sessionId: string, type: string, duration?: number) => Promise<void>
  completeSession: (sessionId: string, completionProofId?: string) => Promise<void>
  getSession: (sessionId: string) => Promise<FocusSession>
  getSessionAnalytics: (sessionId: string) => Promise<FocusSessionAnalytics>
  getUserSessions: (
    limit?: number,
    offset?: number,
    status?: string,
  ) => Promise<{ data: FocusSession[]; total: number; limit: number; offset: number }>

  // Utils
  clearError: () => void
}

/**
 * Hook for managing focus sessions
 * Automatically handles authentication and API calls
 *
 * @example
 * const { currentSession, createSession, logDistraction } = useFocusSession()
 *
 * const session = await createSession()
 * await logDistraction(session.id, 'tab_switch', 5)
 * await completeSession(session.id)
 */
export function useFocusSession(): UseFocusSessionReturn {
  const [currentSession, setCurrentSession] = useState<FocusSession | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const sessionTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const clearError = useCallback(() => setError(null), [])

  const handleError = useCallback((err: any) => {
    const message = err?.message || 'An unknown error occurred'
    setError(message)
    console.error('[useFocusSession]', message)
  }, [])

  const createSession = useCallback(
    async (documentId?: string, conversationId?: string): Promise<FocusSession> => {
      setLoading(true)
      clearError()
      try {
        const session = await apiFetch<FocusSession>('/focus/sessions', {
          method: 'POST',
          body: JSON.stringify({
            documentId,
            conversationId,
          }),
        })
        setCurrentSession(session)
        return session
      } catch (err) {
        handleError(err)
        throw err
      } finally {
        setLoading(false)
      }
    },
    [clearError, handleError],
  )

  const updateSession = useCallback(
    async (sessionId: string, updateData: any): Promise<FocusSession> => {
      setLoading(true)
      clearError()
      try {
        const session = await apiFetch<FocusSession>(`/focus/sessions/${sessionId}`, {
          method: 'PUT',
          body: JSON.stringify(updateData),
        })
        setCurrentSession(session)
        return session
      } catch (err) {
        handleError(err)
        throw err
      } finally {
        setLoading(false)
      }
    },
    [clearError, handleError],
  )

  const logDistraction = useCallback(
    async (sessionId: string, type: string, duration?: number): Promise<void> => {
      try {
        await apiFetch('/focus/sessions/' + sessionId + '/distractions', {
          method: 'POST',
          body: JSON.stringify({
            type,
            duration,
          }),
        })
      } catch (err) {
        handleError(err)
        throw err
      }
    },
    [handleError],
  )

  const completeSession = useCallback(
    async (sessionId: string, completionProofId?: string): Promise<void> => {
      setLoading(true)
      clearError()
      try {
        await apiFetch(`/focus/sessions/${sessionId}/complete`, {
          method: 'POST',
          body: JSON.stringify({ completionProofId }),
        })
        setCurrentSession(null)
      } catch (err) {
        handleError(err)
        throw err
      } finally {
        setLoading(false)
      }
    },
    [clearError, handleError],
  )

  const getSession = useCallback(
    async (sessionId: string): Promise<FocusSession> => {
      setLoading(true)
      clearError()
      try {
        const session = await apiFetch<FocusSession>(`/focus/sessions/${sessionId}`)
        setCurrentSession(session)
        return session
      } catch (err) {
        handleError(err)
        throw err
      } finally {
        setLoading(false)
      }
    },
    [clearError, handleError],
  )

  const getSessionAnalytics = useCallback(
    async (sessionId: string): Promise<FocusSessionAnalytics> => {
      setLoading(true)
      clearError()
      try {
        return await apiFetch<FocusSessionAnalytics>(
          `/focus/sessions/${sessionId}/analytics`,
        )
      } catch (err) {
        handleError(err)
        throw err
      } finally {
        setLoading(false)
      }
    },
    [clearError, handleError],
  )

  const getUserSessions = useCallback(
    async (limit?: number, offset?: number, status?: string) => {
      setLoading(true)
      clearError()
      try {
        const params = new URLSearchParams()
        if (limit) params.append('limit', limit.toString())
        if (offset) params.append('offset', offset.toString())
        if (status) params.append('status', status)

        return await apiFetch(
          `/focus/sessions${params.toString() ? '?' + params.toString() : ''}`,
        )
      } catch (err) {
        handleError(err)
        throw err
      } finally {
        setLoading(false)
      }
    },
    [clearError, handleError],
  )

  return {
    currentSession,
    loading,
    error,
    createSession,
    updateSession,
    logDistraction,
    completeSession,
    getSession,
    getSessionAnalytics,
    getUserSessions,
    clearError,
  }
}
