'use client'

import { createClient } from '@/lib/supabase/client'

/**
 * 获取当前用户的认证 token（JWT）
 * 用于 API 请求中的 Authorization header
 */
export async function getAuthToken(): Promise<string | null> {
  try {
    const supabase = createClient()
    const {
      data: { session },
      error,
    } = await supabase.auth.getSession()

    if (error || !session) {
      console.warn('No active session or session error:', error?.message)
      return null
    }

    return session.access_token
  } catch (err) {
    console.error('Failed to get auth token:', err)
    return null
  }
}

/**
 * 使用认证 token 调用后端 API
 */
export async function apiFetch<T = any>(
  url: string,
  options: RequestInit = {},
): Promise<T> {
  const token = await getAuthToken()

  if (!token) {
    throw new Error('Not authenticated')
  }

  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
    Authorization: `Bearer ${token}`,
  }

  const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4001'}${url}`, {
    ...options,
    headers,
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({}))
    throw new Error(error.message || `API error: ${response.status}`)
  }

  return response.json() as Promise<T>
}
