'use client'

import { useFocusStore, type FocusStore, type FocusSession, type FocusSessionAnalytics } from '@/stores/focus.store'

export type { FocusSession, FocusSessionAnalytics } from '@/stores/focus.store'
export type UseFocusSessionReturn = FocusStore

export function useFocusSession(): UseFocusSessionReturn {
  return useFocusStore()
}
