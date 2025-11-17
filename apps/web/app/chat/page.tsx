"use client"

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

// This page has been disabled: redirect to home
export default function ChatPage() {
  const router = useRouter()
  useEffect(() => {
    router.replace('/')
  }, [router])
  return <div className="min-h-screen flex items-center justify-center">Redirecting…</div>
}

