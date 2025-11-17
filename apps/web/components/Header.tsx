'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useAuth } from '@/lib/auth/AuthProvider'

export function Header() {
  const { user, loading } = useAuth()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted || loading) {
    return (
      <header className="flex items-center justify-between mb-8 pb-6 border-b border-gray-200">
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
    <header className="flex items-center justify-between mb-8 pb-6 border-b border-gray-200">
      {/* Site title removed */}
      <div />
      {/* Navigation */}
      <nav className="flex items-center gap-6">
        {user ? (
          <>
            <div className="text-sm text-gray-700">{user.email ?? 'Signed in'}</div>
            <button
              onClick={async () => {
                try {
                  await (window as any).__supabase_sign_out__?.() // fallback for some dev setups
                } catch {}
                // fallback to calling signOut from provider via a custom event
                const ev = new CustomEvent('oasis-signout')
                window.dispatchEvent(ev)
              }}
              className="px-3 py-1 text-sm text-gray-700 hover:text-gray-900 border border-gray-200 rounded"
            >
              Sign out
            </button>
          </>
        ) : (
          <>
            <div className="h-6 w-px bg-gray-300" />

            {/* Auth Buttons */}
            <Link
              href="/auth/login"
              className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors"
            >
              Sign In
            </Link>
            <Link
              href="/auth/register"
              className="px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 rounded-lg transition-all shadow-md hover:shadow-lg"
            >
              Get Started
            </Link>
          </>
        )}
      </nav>
    </header>
  )
}
