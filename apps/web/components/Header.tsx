'use client'
import Link from 'next/link'
import { useAuth } from '@/lib/auth/AuthProvider'

export function Header() {
  const { loading } = useAuth()

  if (loading) {
    return (
      <header className="flex items-center justify-between py-2">
        <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
          {/* site title removed intentionally */}
          <div style={{width: 1, height: 1}} />
        </Link>
        <div className="flex items-center gap-3">
          <div className="w-16 h-9 bg-gray-200 rounded animate-pulse"></div>
          <div className="w-24 h-9 bg-gray-200 rounded animate-pulse"></div>
        </div>
      </header>
    )
  }

  return (
    <header className="flex items-center justify-between py-2">
      {/* Site title removed */}
      <div />
      {/* Navigation */}
      <nav className="flex items-center gap-6">
        {/* Auth controls moved to sidebar `UserBadge`. No header actions here. */}
      </nav>
    </header>
  )
}
