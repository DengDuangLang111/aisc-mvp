'use client'

import { useEffect, useState } from 'react'

interface FocusModeProps {
  isActive: boolean
  onToggle: () => void
}

export function FocusMode({ isActive, onToggle }: FocusModeProps) {
  const [startTime, setStartTime] = useState<number | null>(null)
  const [elapsedTime, setElapsedTime] = useState(0)
  const [distractions, setDistractions] = useState(0)
  const [isPaused, setIsPaused] = useState(false)

  // 启动计时器
  useEffect(() => {
    if (isActive && !startTime) {
      setStartTime(Date.now())
    }
    if (!isActive) {
      setStartTime(null)
      setElapsedTime(0)
      setDistractions(0)
      setIsPaused(false)
    }
  }, [isActive, startTime])

  // 更新计时
  useEffect(() => {
    if (!isActive || isPaused || !startTime) return

    const interval = setInterval(() => {
      setElapsedTime(Date.now() - startTime)
    }, 100)

    return () => clearInterval(interval)
  }, [isActive, isPaused, startTime])

  // 页面可见性检测
  useEffect(() => {
    if (!isActive || isPaused) return

    const handleVisibilityChange = () => {
      if (document.hidden) {
        setDistractions(prev => prev + 1)
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [isActive, isPaused])

  // 防止刷新
  useEffect(() => {
    if (!isActive) return

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      e.returnValue = 'Focus mode is active. Are you sure you want to leave?'
      return e.returnValue
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [isActive])

  const formatTime = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000)
    const hours = Math.floor(totalSeconds / 3600)
    const minutes = Math.floor((totalSeconds % 3600) / 60)
    const seconds = totalSeconds % 60
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
  }

  if (!isActive) return null

  return (
    <div className="fixed top-0 left-0 right-0 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 text-white shadow-lg z-50">
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
            <span className="opacity-80">Focus Score:</span>
            <span className="font-bold">{Math.max(0, 100 - distractions * 5)}</span>
          </div>
        </div>

        {/* Right: Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsPaused(!isPaused)}
            className="px-3 py-1.5 bg-white bg-opacity-20 hover:bg-opacity-30 rounded-md text-sm font-medium transition-all"
          >
            {isPaused ? '▶️ Resume' : '⏸️ Pause'}
          </button>
          
          <button
            onClick={onToggle}
            className="px-3 py-1.5 bg-white bg-opacity-20 hover:bg-opacity-30 rounded-md text-sm font-medium transition-all"
          >
            Exit
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
          <span className="opacity-70">Score: </span>
          <span className="font-bold">{Math.max(0, 100 - distractions * 5)}</span>
        </div>
      </div>
    </div>
  )
}
