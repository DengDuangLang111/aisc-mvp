import { createClient as createBrowserSupabaseClient } from '@/lib/supabase/client'

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4001'

let browserSupabase: ReturnType<
  typeof createBrowserSupabaseClient
> | null = null

/**
 * 获取浏览器端的认证 token（JWT）
 * 仅用于客户端组件
 */
export async function getAuthToken(): Promise<string | null> {
  try {
    if (!browserSupabase) {
      browserSupabase = createBrowserSupabaseClient()
    }

    const {
      data: { session },
      error,
    } = await browserSupabase.auth.getSession()

    if (error || !session) {
      console.warn('No active session or session error:', error?.message)
      return null
    }

    return session.access_token
  } catch (err) {
    console.error('Failed to get browser auth token:', err)
    return null
  }
}

/**
 * 使用认证 token 调用后端 API
 * 仅用于客户端组件
 */
export async function apiFetch<T = any>(
  url: string,
  options: RequestInit = {},
): Promise<T> {
  const token = await getAuthToken()

  if (!token) {
    throw new Error('Not authenticated')
  }

  const headers = new Headers(options.headers || {})
  const isFormData =
    typeof FormData !== 'undefined' && options.body instanceof FormData

  if (!headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`)
  }
  if (!isFormData && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }

  const response = await fetch(`${API_BASE_URL}${url}`, {
    ...options,
    headers,
  })

  if (!response.ok) {
    const errorPayload = await response
      .json()
      .catch(async () => ({ message: await response.text() }))
    throw new Error(errorPayload.message || `API error: ${response.status}`)
  }

  if (response.status === 204) {
    return undefined as T
  }

  const contentType = response.headers.get('content-type') || ''
  if (contentType.includes('application/json')) {
    return response.json() as Promise<T>
  }

  const text = await response.text()
  return text as unknown as T
}
