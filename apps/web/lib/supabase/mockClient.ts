/* eslint-disable @typescript-eslint/no-explicit-any */
// Lightweight dev mock for Supabase client used when env vars are missing.
// Provides minimal auth methods the frontend expects so UI can be developed
// without a real Supabase project.

type Session = null | { user: { id: string; email?: string; [k: string]: any } }

function makeSubscription() {
  return {
    unsubscribe: () => {
      /* no-op */
    },
  }
}

export function createMockClient() {
  // Default to a dev user so the UI behaves as signed-in during local frontend work
  let currentSession: Session = { user: { id: 'dev-user', email: 'dev@example.com' } }

  return {
    auth: {
      async getSession() {
        return Promise.resolve({ data: { session: currentSession } })
      },
      async getUser() {
        return Promise.resolve({ data: { user: currentSession?.user ?? null } })
      },
      onAuthStateChange(_cb: (event: string, session: any) => void) {
        // Immediately return a fake subscription; no events will be emitted.
        return { data: { subscription: makeSubscription() } }
      },
      async signOut() {
        currentSession = null
        return Promise.resolve({ error: null })
      },
      // Simulate password sign-in for local dev
      async signInWithPassword({ email, password }: { email: string; password: string }) {
        // very naive check for dev convenience
        // Accept the explicit test credentials or any non-empty email/password
        if ((email === 'test@oasis.local' && password === 'password123') || (email && password)) {
          currentSession = { user: { id: 'dev-user', email } }
          return Promise.resolve({ data: { user: currentSession.user }, error: null })
        }
        return Promise.resolve({ data: null, error: { message: 'Invalid credentials' } })
      },
      // Simulate signUp for local dev
      async signUp({ email, password, options }: { email: string; password: string; options?: any }) {
        if (email && password) {
          currentSession = { user: { id: 'dev-user', email, created_at: new Date().toISOString() } }
          return Promise.resolve({ data: { user: currentSession.user }, error: null })
        }
        return Promise.resolve({ data: null, error: { message: 'Invalid input' } })
      },
      // Simulate OAuth sign-in (Google) for local dev
      async signInWithOAuth({ provider, options }: any) {
        // In a real flow this would redirect; for dev we set a session and return
        currentSession = { user: { id: 'dev-user', email: 'dev+google@example.com', provider } }
        return Promise.resolve({ data: { user: currentSession.user }, error: null })
      },
      async exchangeCodeForSession(_code: string) {
        // In dev mock, pretend exchange succeeded and set a fake session.
        currentSession = { user: { id: 'dev-user', email: 'dev@example.com' } }
        return Promise.resolve({ error: null })
      },
    },
  }
}

export default createMockClient
