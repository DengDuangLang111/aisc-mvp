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
          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center">
            <span className="text-2xl">📚</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Study Oasis</h1>
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
      {/* Logo and Title */}
      <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-md">
          <span className="text-2xl">📚</span>
        </div>
        <h1 className="text-2xl font-bold text-gray-900">Study Oasis</h1>
      </Link>
      
      {/* Navigation */}
      <nav className="flex items-center gap-6">
        {user ? (
          <>
            {/* Quick Links */}
            <Link
              href="/chat"
              className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
            >
              Chat
            </Link>
            <Link
              href="/upload"
              className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
            >
              Upload
            </Link>
            
            {/* Divider */}
            <div className="h-6 w-px bg-gray-300"></div>
            
            {/* User Menu */}
            <Link
              href="/profile"
              className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors group"
            >
              {user.user_metadata?.avatar_url ? (
                <img
                  src={user.user_metadata.avatar_url}
                  alt="Profile"
                  className="w-7 h-7 rounded-full object-cover ring-2 ring-gray-200 group-hover:ring-blue-500 transition-all"
                />
              ) : (
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-xs font-bold ring-2 ring-gray-200 group-hover:ring-blue-500 transition-all">
                  {user.email?.[0].toUpperCase() || 'U'}
                </div>
              )}
              <span className="max-w-[100px] truncate">
                {user.user_metadata?.full_name || user.email?.split('@')[0]}
              </span>
            </Link>
          </>
        ) : (
          <>
            {/* Public Links */}
            <Link
              href="/#features"
              className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
            >
              Features
            </Link>
            
            {/* Divider */}
            <div className="h-6 w-px bg-gray-300"></div>
            
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
