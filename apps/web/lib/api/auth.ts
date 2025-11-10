import { createClient as createBrowserSupabaseClient } from '@/lib/supabase/client'

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4001'

let browserSupabase: ReturnType<
  typeof createBrowserSupabaseClient
> | null = null

const isBrowser = typeof window !== 'undefined'

async function getBrowserAuthToken(): Promise<string | null> {
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

async function getServerAuthToken(): Promise<string | null> {
  try {
    const { createClient } = await import('@/lib/supabase/server')
    const supabase = await createClient()
    const {
      data: { session },
      error,
    } = await supabase.auth.getSession()

    if (error || !session) {
      console.warn('Server session unavailable:', error?.message)
      return null
    }

    return session.access_token
  } catch (err) {
    console.error('Failed to get server auth token:', err)
    return null
  }
}

/**
 * 获取当前用户的认证 token（JWT）
 * 用于 API 请求中的 Authorization header
 */
export async function getAuthToken(): Promise<string | null> {
  return isBrowser ? getBrowserAuthToken() : getServerAuthToken()
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
