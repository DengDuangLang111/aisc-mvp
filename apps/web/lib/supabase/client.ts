import { createBrowserClient } from '@supabase/ssr'
import { createMockClient } from './mockClient'

export function createClient() {
  const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
  const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    // Return a lightweight mock client for local UI development
    return createMockClient()
  }

  return createBrowserClient(SUPABASE_URL, SUPABASE_ANON_KEY)
}
