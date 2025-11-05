export interface FocusSession {
  id: string
  userId: string
  documentId?: string
  conversationId?: string
  startTime: string
  endTime?: string
  totalDuration?: number // seconds
  activeDuration?: number // seconds (excluding pauses)
  pauseCount?: number
  distractionCount?: number
  tabSwitchCount?: number
  questionsAsked?: number
  hintLevelsUsed?: number
  focusScore?: number // 0-100
  status: 'active' | 'paused' | 'completed' | 'abandoned'
  completionProofId?: string
  createdAt: string
  updatedAt: string
}

export interface FocusDistraction {
  id: string
  sessionId: string
  distractionType: 'tab_switch' | 'window_blur' | 'mouse_leave'
  timestamp: string
  duration?: number // seconds
}

export interface SessionAnalytics {
  focusScore: number
  distractionCount: number
  tabSwitchCount: number
  questionsAsked: number
  hintLevelsUsed: number
  totalDuration: number
  activeDuration: number
}
