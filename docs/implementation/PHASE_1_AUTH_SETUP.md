# Phase 1 Authentication Setup Guide

## ✅ What We've Implemented

### 1. Supabase Authentication Integration
- ✅ Installed `@supabase/ssr`, `@supabase/supabase-js`, `@supabase/auth-ui-react`
- ✅ Created Supabase client configurations (browser, server, middleware)
- ✅ Created login page (`/auth/login`)
- ✅ Created registration page (`/auth/register`)
- ✅ Created OAuth callback handler (`/auth/callback`)
- ✅ Created AuthProvider context for global auth state
- ✅ Added middleware for session management
- ✅ Updated homepage with Sign In / Get Started buttons

### 2. Authentication Features
- Email/Password authentication
- Google OAuth sign-in
- Session management with cookies
- Auto-redirect after login/register
- Protected routes middleware
- Global auth state context

---

## 🚀 Setup Instructions

### Step 1: Create Supabase Project

1. Go to [https://supabase.com](https://supabase.com)
2. Sign up or log in
3. Click "New Project"
4. Fill in:
   - **Project name:** study-oasis
   - **Database password:** (generate a strong password - save it!)
   - **Region:** Choose closest to you (e.g., US East)
5. Click "Create new project" (wait 2-3 minutes for setup)

### Step 2: Get API Credentials

1. In your Supabase project dashboard, go to **Settings** → **API**
2. Find these values:
   - **Project URL** (looks like: `https://xxxxx.supabase.co`)
   - **anon public** key (long string starting with `eyJ...`)

### Step 3: Configure Environment Variables

Update your `/apps/web/.env.local` file:

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

Replace with your actual values from Step 2.

### Step 4: Enable Google OAuth (Optional)

1. In Supabase dashboard, go to **Authentication** → **Providers**
2. Find "Google" and click "Enable"
3. You'll need:
   - **Google Client ID**
   - **Google Client Secret**

To get these:
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Go to **APIs & Services** → **Credentials**
4. Click **Create Credentials** → **OAuth 2.0 Client IDs**
5. Set:
   - Application type: **Web application**
   - Authorized redirect URIs: 
     - `https://your-project-id.supabase.co/auth/v1/callback`
     - `http://localhost:3000/auth/callback` (for local dev)
6. Copy Client ID and Client Secret to Supabase

### Step 5: Configure Auth Settings

In Supabase dashboard, go to **Authentication** → **URL Configuration**:

1. **Site URL:** `http://localhost:3000` (for development)
2. **Redirect URLs:** Add:
   - `http://localhost:3000/auth/callback`
   - `http://localhost:3000/dashboard`

### Step 6: Enable Email Auth

In Supabase dashboard, **Authentication** → **Providers**:
- Make sure **Email** is enabled
- You can disable "Confirm email" for development (enable in production)

### Step 7: Test the Setup

1. Start your development server:
   ```bash
   cd /Users/knight/study_oasis_simple/apps/web
   pnpm run dev
   ```

2. Visit `http://localhost:3000`

3. Click "Get Started" to register a new account

4. Try logging in with email/password

5. Try "Sign in with Google" (if you configured OAuth)

---

## 📁 Files Created

```
apps/web/
├── lib/
│   ├── supabase/
│   │   ├── client.ts          # Browser client
│   │   ├── server.ts          # Server component client
│   │   └── middleware.ts      # Session refresh logic
│   └── auth/
│       └── AuthProvider.tsx   # React context for auth
├── app/
│   ├── auth/
│   │   ├── login/
│   │   │   └── page.tsx       # Login page
│   │   ├── register/
│   │   │   └── page.tsx       # Registration page
│   │   └── callback/
│   │       └── route.ts       # OAuth callback
│   ├── layout.tsx             # Updated with AuthProvider
│   └── page.tsx               # Updated with auth buttons
└── middleware.ts              # Route protection
```

---

## 🎯 Next Steps

Now that authentication is set up, you can:

### 1. Create Protected Routes

Add this to any page that requires authentication:

```typescript
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function ProtectedPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  return <div>Protected content</div>
}
```

### 2. Use Auth in Client Components

```typescript
'use client'
import { useAuth } from '@/lib/auth/AuthProvider'

export default function MyComponent() {
  const { user, loading, signOut } = useAuth()

  if (loading) return <div>Loading...</div>
  if (!user) return <div>Please sign in</div>

  return (
    <div>
      <p>Hello {user.email}</p>
      <button onClick={signOut}>Sign Out</button>
    </div>
  )
}
```

### 3. Update Database Schema

You'll need to link documents and conversations to users:

```sql
-- In Supabase SQL Editor
ALTER TABLE documents ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);

CREATE INDEX IF NOT EXISTS idx_documents_user ON documents(user_id);
CREATE INDEX IF NOT EXISTS idx_conversations_user ON conversations(user_id);
```

### 4. Continue with Phase 1 Tasks

- [ ] Create user profile page
- [ ] Implement Focus Mode
- [ ] Work completion flow
- [ ] Session report generation

---

## 🐛 Troubleshooting

### "Invalid API Key"
- Double-check your `.env.local` file has the correct values
- Restart dev server after changing env variables

### "Email not confirmed"
- In Supabase: Authentication → Settings → Disable "Confirm email" for dev
- Or check your email for confirmation link

### Google OAuth not working
- Make sure redirect URIs are correctly configured in Google Console
- Check Supabase logs: Authentication → Logs

### Session not persisting
- Check browser cookies are enabled
- Make sure middleware.ts is correctly configured

---

## 📚 Resources

- [Supabase Auth Docs](https://supabase.com/docs/guides/auth)
- [Next.js + Supabase Guide](https://supabase.com/docs/guides/auth/server-side/nextjs)
- [Google OAuth Setup](https://support.google.com/cloud/answer/6158849)

---

## ✨ What's Working Now

After setup, users can:
- ✅ Register with email/password
- ✅ Sign in with email/password
- ✅ Sign in with Google
- ✅ Stay logged in across sessions
- ✅ Sign out
- ✅ Access protected routes

---

Need help? Check the troubleshooting section or review the Supabase logs in your dashboard!
