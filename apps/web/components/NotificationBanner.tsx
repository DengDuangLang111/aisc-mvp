'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/lib/auth/AuthProvider'
import { apiFetch } from '@/lib/api/auth'

interface Banner {
  id: string
  title: string
  message: string
  actionLabel: string
  actionUrl: string
  severity: 'info' | 'warning' | 'critical'
}

export function NotificationBanner() {
  const { user, loading } = useAuth()
  const [banners, setBanners] = useState<Banner[]>([])
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (!user || loading) return

    let cancelled = false
    setIsLoading(true)
    setError(null)

    apiFetch<Banner[]>('/notifications/banners')
      .then((data) => {
        if (!cancelled) {
          setBanners(data)
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : '无法加载提醒')
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoading(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [user, loading])

  if (!user) return null
  if (!banners.length && !error) return null

  return (
    <div className="fixed inset-x-0 top-16 z-40 flex flex-col gap-3 px-4">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-md text-sm shadow-sm">
          {error}
        </div>
      )}
      {isLoading && (
        <div className="bg-white border border-gray-200 text-gray-800 px-4 py-3 rounded-md text-sm shadow-sm">
          Loading reminders…
        </div>
      )}
      {banners.map((banner) => (
        <div
          key={banner.id}
          className={`border-l-4 px-4 py-3 rounded-md shadow-sm bg-white ${
            banner.severity === 'critical'
              ? 'border-red-500'
              : banner.severity === 'warning'
                ? 'border-amber-400'
                : 'border-blue-500'
          }`}
        >
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-gray-900">{banner.title}</p>
              <p className="text-xs text-gray-600">{banner.message}</p>
            </div>
            <a
              href={banner.actionUrl}
              className="text-xs font-medium text-blue-600 hover:underline"
            >
              {banner.actionLabel}
            </a>
          </div>
        </div>
      ))}
    </div>
  )
}
