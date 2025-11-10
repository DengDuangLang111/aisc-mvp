'use client'

import { useEffect, useState, useRef, useMemo } from 'react'
import { useFocusSession } from '@/hooks/useFocusSession'
import { CompleteWorkModal } from '@/components/CompleteWorkModal'

interface FocusModeProps {
  isActive: boolean
  onToggle: () => void
  documentId?: string
  conversationId?: string
}

export function FocusMode({ isActive, onToggle, documentId, conversationId }: FocusModeProps) {
  const {
    createSession,
    logDistraction,
    completeSession,
    updateSession,
    currentSession,
    error,
    loading,
  } = useFocusSession()
  
  const [startTime, setStartTime] = useState<number | null>(null)
  const [elapsedTime, setElapsedTime] = useState(0)
  const [totalElapsedTime, setTotalElapsedTime] = useState(0)
  const [distractions, setDistractions] = useState(0)
  const [isPaused, setIsPaused] = useState(false)
  const [sessionStarted, setSessionStarted] = useState(false)
  const [showCompletionModal, setShowCompletionModal] = useState(false)
  const sessionIdRef = useRef<string | null>(null)
  const lastVisibilityChangeRef = useRef<number>(0)
  const pausedDurationRef = useRef(0)
  const pauseStartedAtRef = useRef<number | null>(null)
  const finalizingRef = useRef(false)

  // 初始化专注会话
  useEffect(() => {
    if (isActive && !sessionStarted) {
      initializeSession()
    }
    if (!isActive && sessionStarted) {
      finalizeSession('abandoned')
    }
  }, [isActive, sessionStarted])

  const initializeSession = async () => {
    try {
      const session = await createSession(documentId, conversationId)
      sessionIdRef.current = session.id
      setSessionStarted(true)
      setStartTime(Date.now())
      setTotalElapsedTime(0)
      pausedDurationRef.current = 0
      pauseStartedAtRef.current = null
    } catch (err) {
      console.error('Failed to create focus session:', err)
    }
  }

  const resetSession = () => {
    setSessionStarted(false)
    setStartTime(null)
    setElapsedTime(0)
    setTotalElapsedTime(0)
    setDistractions(0)
    setIsPaused(false)
    setShowCompletionModal(false)
    sessionIdRef.current = null
    pausedDurationRef.current = 0
    pauseStartedAtRef.current = null
  }

  const getActiveDurationSeconds = () => {
    if (!startTime) return 0
    const now = Date.now()
    const pausedTime =
      pausedDurationRef.current +
      (isPaused && pauseStartedAtRef.current
        ? now - pauseStartedAtRef.current
        : 0)
    return Math.max(0, Math.floor((now - startTime - pausedTime) / 1000))
  }

  const finalizeSession = async (
    status: 'completed' | 'abandoned',
    options?: { completionProofId?: string },
  ) => {
    if (!sessionIdRef.current || finalizingRef.current) return
    finalizingRef.current = true

    try {
      const activeDuration = getActiveDurationSeconds()

      if (status === 'completed') {
        await updateSession(sessionIdRef.current, { activeDuration })
        await completeSession(sessionIdRef.current, options?.completionProofId)
      } else {
        await updateSession(sessionIdRef.current, {
          status: 'abandoned',
          activeDuration,
        })
      }
    } catch (err) {
      console.error('Failed to finalize session:', err)
    } finally {
      finalizingRef.current = false
      resetSession()
    }
  }

  // 页面可见性检测 - 记录干扰
  useEffect(() => {
    if (!isActive || isPaused || !sessionStarted || !sessionIdRef.current) return

    const handleVisibilityChange = async () => {
      const now = Date.now()
      // 防止重复记录（100ms 内）
      if (now - lastVisibilityChangeRef.current < 100) return
      lastVisibilityChangeRef.current = now

      if (document.hidden) {
        // 页面隐藏 - 记录干扰
        setDistractions(prev => prev + 1)
        try {
          await logDistraction(sessionIdRef.current!, 'window_blur')
        } catch (err) {
          console.error('Failed to log distraction:', err)
        }
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [isActive, isPaused, sessionStarted, logDistraction])

  // 更新计时
  useEffect(() => {
    if (!isActive || isPaused || !startTime) return

    const interval = setInterval(() => {
      setElapsedTime(Date.now() - startTime)
    }, 100)

    return () => clearInterval(interval)
  }, [isActive, isPaused, startTime])

  // 总时长（包含暂停）
  useEffect(() => {
    if (!isActive || !startTime) return

    const interval = setInterval(() => {
      setTotalElapsedTime(Date.now() - startTime)
    }, 1000)

    return () => clearInterval(interval)
  }, [isActive, startTime])

  // 防止刷新/离开页面
  useEffect(() => {
    if (!isActive || !sessionStarted) return

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      e.returnValue = 'Focus mode is active. Are you sure you want to leave?'
      return e.returnValue
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [isActive, sessionStarted])

  const formatTime = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000)
    const hours = Math.floor(totalSeconds / 3600)
    const minutes = Math.floor((totalSeconds % 3600) / 60)
    const seconds = totalSeconds % 60
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
  }

  const handlePauseResume = async () => {
    if (sessionIdRef.current) {
      try {
        if (!isPaused) {
          pauseStartedAtRef.current = Date.now()
          await updateSession(sessionIdRef.current, {
            status: 'paused',
            pauseCount: (currentSession?.pauseCount || 0) + 1,
            activeDuration: getActiveDurationSeconds(),
          })
          setIsPaused(true)
        } else {
          if (pauseStartedAtRef.current) {
            pausedDurationRef.current += Date.now() - pauseStartedAtRef.current
            pauseStartedAtRef.current = null
          }
          await updateSession(sessionIdRef.current, {
            status: 'active',
            activeDuration: getActiveDurationSeconds(),
          })
          setIsPaused(false)
        }
      } catch (err) {
        console.error('Failed to pause/resume:', err)
      }
    }
  }

  const handleComplete = () => {
    setShowCompletionModal(true)
  }

  const totalElapsedDisplay = useMemo(() => formatTime(totalElapsedTime), [totalElapsedTime])
  const activeElapsedDisplay = useMemo(() => formatTime(elapsedTime), [elapsedTime])

  if (!isActive) return null

  return (
    <>
      {/* Error Banner */}
      {error && (
        <div className="fixed top-0 left-0 right-0 bg-red-500 text-white text-sm px-4 py-2 z-[60]">
          ⚠️ {error}
        </div>
      )}

      <div className={`fixed left-0 right-0 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 text-white shadow-lg z-50 ${error ? 'top-8' : 'top-0'}`}>
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          {/* Left: Status */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${isPaused ? 'bg-yellow-300 animate-pulse' : 'bg-green-300'}`}></div>
              <span className="text-sm font-semibold">
                {isPaused ? '⏸️ Paused' : '🎯 Focus Mode'}
              </span>
            </div>
            
            <div className="h-4 w-px bg-white opacity-30"></div>
            
            <div className="font-mono text-lg font-bold">
              {activeElapsedDisplay}
            </div>
          </div>

          {/* Center: Stats */}
          <div className="hidden md:flex items-center gap-6 text-sm">
            <div className="flex items-center gap-2">
              <span className="opacity-80">Distractions:</span>
              <span className="font-bold">{distractions}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="opacity-80">Total time:</span>
              <span className="font-bold">{totalElapsedDisplay}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="opacity-80">Session:</span>
              <span className="font-bold">{sessionIdRef.current ? sessionIdRef.current.slice(0, 8) : 'Init...'}</span>
            </div>
          </div>

          {/* Right: Controls */}
          <div className="flex items-center gap-2">
            <button
              onClick={handlePauseResume}
              disabled={loading}
              className="px-3 py-1.5 bg-white bg-opacity-20 hover:bg-opacity-30 disabled:opacity-50 rounded-md text-sm font-medium transition-all"
            >
              {isPaused ? '▶️ Resume' : '⏸️ Pause'}
            </button>
            
            <button
              onClick={handleComplete}
              disabled={loading || !sessionStarted}
              className="px-3 py-1.5 bg-white bg-opacity-20 hover:bg-opacity-30 disabled:opacity-50 rounded-md text-sm font-medium transition-all"
            >
              {loading ? '⏳ Completing...' : '✓ Complete'}
            </button>
          </div>
        </div>

        {/* Mobile Stats */}
        <div className="md:hidden border-t border-white border-opacity-20 px-4 py-2 flex items-center justify-around text-xs">
          <div>
            <span className="opacity-70">Distractions: </span>
            <span className="font-bold">{distractions}</span>
          </div>
          <div>
            <span className="opacity-70">Total: </span>
            <span className="font-bold">{totalElapsedDisplay}</span>
          </div>
          <div>
            <span className="opacity-70">Status: </span>
            <span className="font-bold">{sessionStarted ? 'Active' : 'Init...'}</span>
          </div>
        </div>
      </div>

      <CompleteWorkModal
        isOpen={showCompletionModal}
        sessionId={sessionIdRef.current || ''}
        onClose={() => setShowCompletionModal(false)}
        onSubmit={async ({ completionProofId }) => {
          await finalizeSession('completed', { completionProofId })
          setShowCompletionModal(false)
          onToggle()
        }}
      />
    </>
  )
}
