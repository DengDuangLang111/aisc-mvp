import type { Metadata } from 'next'
import React from 'react'

export const metadata: Metadata = {
  title: 'Session - Study Oasis',
}

export default function SessionLayout({ children }: { children: React.ReactNode }) {
  // This layout intentionally omits the SidebarDashboard so focus/session pages are full-bleed
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="px-4 sm:px-6 lg:px-8 py-6">
        {children}
      </div>
    </div>
  )
}
