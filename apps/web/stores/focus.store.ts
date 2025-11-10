'use client'

import { create } from 'zustand'
import { apiFetch } from '@/lib/api/auth-client'

export interface FocusSession {
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

export interface FocusSessionAnalytics {
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

interface FocusStoreState {
  currentSession: FocusSession | null
  loading: boolean
  error: string | null
}

interface FocusStoreActions {
  clearError: () => void
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
}

export type FocusStore = FocusStoreState & FocusStoreActions

const extractErrorMessage = (err: any) => err?.message || 'An unknown error occurred'

export const useFocusStore = create<FocusStore>((set, get) => ({
  currentSession: null,
  loading: false,
  error: null,

  clearError: () => set({ error: null }),

  createSession: async (documentId?: string, conversationId?: string) => {
    set({ loading: true, error: null })
    try {
      const session = await apiFetch<FocusSession>('/focus/sessions', {
        method: 'POST',
        body: JSON.stringify({ documentId, conversationId }),
      })
      set({ currentSession: session })
      return session
    } catch (err) {
      const message = extractErrorMessage(err)
      set({ error: message })
      console.error('[useFocusSession]', message)
      throw err
    } finally {
      set({ loading: false })
    }
  },

  updateSession: async (sessionId: string, updateData: any) => {
    set({ loading: true, error: null })
    try {
      const session = await apiFetch<FocusSession>(`/focus/sessions/${sessionId}`, {
        method: 'PUT',
        body: JSON.stringify(updateData),
      })
      set({ currentSession: session })
      return session
    } catch (err) {
      const message = extractErrorMessage(err)
      set({ error: message })
      console.error('[useFocusSession]', message)
      throw err
    } finally {
      set({ loading: false })
    }
  },

  logDistraction: async (sessionId: string, type: string, duration?: number) => {
    try {
      await apiFetch(`/focus/sessions/${sessionId}/distractions`, {
        method: 'POST',
        body: JSON.stringify({ type, duration }),
      })
    } catch (err) {
      const message = extractErrorMessage(err)
      set({ error: message })
      console.error('[useFocusSession]', message)
      throw err
    }
  },

  completeSession: async (sessionId: string, completionProofId?: string) => {
    set({ loading: true, error: null })
    try {
      await apiFetch(`/focus/sessions/${sessionId}/complete`, {
        method: 'POST',
        body: JSON.stringify({ completionProofId }),
      })
      set({ currentSession: null })
    } catch (err) {
      const message = extractErrorMessage(err)
      set({ error: message })
      console.error('[useFocusSession]', message)
      throw err
    } finally {
      set({ loading: false })
    }
  },

  getSession: async (sessionId: string) => {
    set({ loading: true, error: null })
    try {
      const session = await apiFetch<FocusSession>(`/focus/sessions/${sessionId}`)
      set({ currentSession: session })
      return session
    } catch (err) {
      const message = extractErrorMessage(err)
      set({ error: message })
      console.error('[useFocusSession]', message)
      throw err
    } finally {
      set({ loading: false })
    }
  },

  getSessionAnalytics: async (sessionId: string) => {
    set({ loading: true, error: null })
    try {
      return await apiFetch<FocusSessionAnalytics>(`/focus/sessions/${sessionId}/analytics`)
    } catch (err) {
      const message = extractErrorMessage(err)
      set({ error: message })
      console.error('[useFocusSession]', message)
      throw err
    } finally {
      set({ loading: false })
    }
  },

  getUserSessions: async (limit?: number, offset?: number, status?: string) => {
    set({ loading: true, error: null })
    try {
      const params = new URLSearchParams()
      if (limit) params.append('limit', limit.toString())
      if (offset) params.append('offset', offset.toString())
      if (status) params.append('status', status)

      return await apiFetch<{
        data: FocusSession[]
        total: number
        limit: number
        offset: number
      }>(`/focus/sessions${params.toString() ? `?${params.toString()}` : ''}`)
    } catch (err) {
      const message = extractErrorMessage(err)
      set({ error: message })
      console.error('[useFocusSession]', message)
      throw err
    } finally {
      set({ loading: false })
    }
  },
}))
