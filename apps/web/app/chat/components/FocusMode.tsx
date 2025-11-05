'use client'

import { useEffect, useState, useRef } from 'react'
import { useFocusSession } from '@/hooks/useFocusSession'

interface FocusModeProps {
  isActive: boolean
  onToggle: () => void
  documentId?: string
  conversationId?: string
}

export function FocusMode({ isActive, onToggle, documentId, conversationId }: FocusModeProps) {
  const { createSession, logDistraction, completeSession, currentSession, error, loading } = useFocusSession()
  
  const [startTime, setStartTime] = useState<number | null>(null)
  const [elapsedTime, setElapsedTime] = useState(0)
  const [distractions, setDistractions] = useState(0)
  const [isPaused, setIsPaused] = useState(false)
  const [sessionStarted, setSessionStarted] = useState(false)
  const sessionIdRef = useRef<string | null>(null)
  const lastVisibilityChangeRef = useRef<number>(0)

  // 初始化专注会话
  useEffect(() => {
    if (isActive && !sessionStarted) {
      initializeSession()
    }
    if (!isActive && sessionStarted) {
      handleSessionEnd()
    }
  }, [isActive, sessionStarted])

  const initializeSession = async () => {
    try {
      const session = await createSession(documentId, conversationId)
      sessionIdRef.current = session.id
      setSessionStarted(true)
      setStartTime(Date.now())
    } catch (err) {
      console.error('Failed to create focus session:', err)
    }
  }

  const handleSessionEnd = async () => {
    if (sessionIdRef.current) {
      try {
        await completeSession(sessionIdRef.current)
      } catch (err) {
        console.error('Failed to complete session:', err)
      }
    }
    resetSession()
  }

  const resetSession = () => {
    setSessionStarted(false)
    setStartTime(null)
    setElapsedTime(0)
    setDistractions(0)
    setIsPaused(false)
    sessionIdRef.current = null
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
        setIsPaused(!isPaused)
        // 可选：同步暂停状态到后端
        // await updateSession(sessionIdRef.current, { status: isPaused ? 'active' : 'paused' })
      } catch (err) {
        console.error('Failed to pause/resume:', err)
      }
    }
  }

  const handleComplete = async () => {
    if (confirm('Are you sure you want to complete this focus session?')) {
      try {
        await handleSessionEnd()
        onToggle()
      } catch (err) {
        console.error('Failed to complete session:', err)
      }
    }
  }

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
              {formatTime(elapsedTime)}
            </div>
          </div>

          {/* Center: Stats */}
          <div className="hidden md:flex items-center gap-6 text-sm">
            <div className="flex items-center gap-2">
              <span className="opacity-80">Distractions:</span>
              <span className="font-bold">{distractions}</span>
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
            <span className="opacity-70">Status: </span>
            <span className="font-bold">{sessionStarted ? 'Active' : 'Init...'}</span>
          </div>
        </div>
      </div>
    </>
  )
}
