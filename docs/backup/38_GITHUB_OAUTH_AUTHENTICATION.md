# GitHub OAuth Authentication Guide

## Overview

This document explains the GitHub OAuth authentication flow implementation using Supabase Auth in the RAG Text Editor application.

## Architecture

### Authentication Flow

```
1. User clicks "Continue with GitHub" button
   ↓
2. signInWithGitHub() executes in authStore
   ↓
3. Supabase validates redirectTo URL against allowed list
   ↓
4. If valid: Redirect to GitHub OAuth page
   If invalid: Block redirect (nothing happens)
   ↓
5. User authorizes on GitHub
   ↓
6. GitHub redirects to: https://your-app.vercel.app/?code=xxx&state=yyy
   ↓
7. Middleware detects 'code' parameter and allows request through
   ↓
8. Supabase automatically exchanges code for session
   ↓
9. authStore.onAuthStateChange fires
   ↓
10. User redirected to /workspace
```

## Key Components

### 1. Auth Store (`frontend/src/stores/authStore.ts`)

```typescript
signInWithGitHub: async () => {
  const supabase = createClient()

  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'github',
    options: {
      redirectTo: `${window.location.origin}/`,
      scopes: 'repo read:user user:email',
    },
  })

  if (error) {
    throw new Error(`GitHub authentication failed: ${error.message}`)
  }
  // Supabase automatically redirects to GitHub in browser environment
}
```

**Why no manual redirect?**

In Client Components (`'use client'`), Supabase JS SDK automatically executes `window.location.href` internally. Manual redirect (`window.location.href = data.url`) is only needed in SSR environments where `window` is not available.

### 2. Middleware (`frontend/src/middleware.ts`)

```typescript
const path = request.nextUrl.pathname

// OAuth callback (with 'code' parameter) bypasses auth check
const hasAuthCode = request.nextUrl.searchParams.has('code')
if (hasAuthCode) {
  return response
}

// ... rest of authentication logic
```

**Purpose**: When GitHub redirects back with `/?code=xxx`, the middleware allows the request through without redirecting to `/workspace`, giving Supabase time to establish the session.

### 3. Session Initialization (`authStore.initialize`)

```typescript
initialize: async () => {
  const supabase = createClient()
  const { data: { session } } = await supabase.auth.getSession()

  // ... set initial state

  supabase.auth.onAuthStateChange(async (event, session) => {
    if (event === 'SIGNED_IN' && session?.user) {
      await ensureProfile(session.user)
      await checkRepositorySelection()
      // User will be redirected to /workspace by useRedirectIfAuthenticated
    }
  })
}
```

## Supabase Configuration

### Required Settings

**Supabase Dashboard → Authentication → URL Configuration**

1. **Site URL**
   ```
   https://prj-text-editor-rag-v1.vercel.app
   ```

2. **Redirect URLs** (Add all deployment URLs)
   ```
   http://localhost:3000/
   https://prj-text-editor-rag-v1.vercel.app/
   https://prj-text-editor-rag-v1-*.vercel.app/*  (for preview deployments)
   ```

**Supabase Dashboard → Authentication → Providers → GitHub**

- **Enabled**: ✅ Yes
- **Client ID**: (from GitHub OAuth App)
- **Client Secret**: (from GitHub OAuth App)

### GitHub OAuth App Settings

**GitHub → Settings → Developer settings → OAuth Apps**

- **Authorization callback URL**:
  ```
  https://ymolsaawfqqsusohuyym.supabase.co/auth/v1/callback
  ```
  (Replace with your Supabase project URL)

## Security

### Redirect URL Validation

Supabase validates the `redirectTo` URL **before** redirecting to GitHub:

```javascript
// Supabase internal logic (pseudo-code)
function signInWithOAuth(options) {
  // Check redirect URL against allowed list
  if (!isAllowedRedirectUrl(options.redirectTo)) {
    // Block redirect - nothing happens
    return
  }

  // If allowed, redirect to GitHub
  window.location.href = buildGitHubAuthUrl(options)
}
```

**Why this prevents attacks:**

Without this check, an attacker could do:

```javascript
signInWithOAuth({
  redirectTo: "https://evil-hacker.com/"
})

// Without validation:
// 1. User logs in via GitHub
// 2. Redirects to evil-hacker.com with auth code
// 3. Attacker steals the code and hijacks session
```

By validating `redirectTo` upfront, Supabase ensures users can only be redirected to pre-approved URLs.

## Environment Variables

### Vercel Dashboard → Settings → Environment Variables

```bash
NEXT_PUBLIC_SUPABASE_URL=https://ymolsaawfqqsusohuyym.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

## Common Issues

### Issue 1: "Nothing happens" when clicking sign-in button

**Cause**: The deployment URL is not in Supabase's Redirect URLs list.

**Solution**: Add the current deployment URL to Supabase → Authentication → URL Configuration → Redirect URLs.

**For Vercel preview deployments**: Each preview has a unique URL like `https://app-abc123.vercel.app/`. Either:
- Add each preview URL manually, or
- Use wildcard: `https://app-*.vercel.app/*`, or
- Only test auth on production URL

### Issue 2: Redirect loop after GitHub authentication

**Cause**: Middleware is redirecting authenticated users before session is established.

**Solution**: Ensure middleware has the code parameter bypass:

```typescript
const hasAuthCode = request.nextUrl.searchParams.has('code')
if (hasAuthCode) {
  return response
}
```

### Issue 3: "No API key found" error

**Cause**: Trying to access Supabase auth URL directly in browser.

**Solution**: This is expected. Supabase auth endpoints require API keys in headers, which are automatically added by the Supabase JS SDK.

## OAuth Scopes

The application requests the following GitHub scopes:

```typescript
scopes: 'repo read:user user:email'
```

- `repo`: Full control of private repositories (required for editing files)
- `read:user`: Read user profile data
- `user:email`: Access user email addresses

## Testing

### Local Development

1. Ensure `http://localhost:3000/` is in Supabase Redirect URLs
2. Run: `npm run dev`
3. Click "Continue with GitHub"
4. Authorize on GitHub
5. Should redirect back to `http://localhost:3000/?code=...`
6. Session established, redirected to `/workspace`

### Production

1. Ensure production URL is in Supabase Redirect URLs
2. Deploy to Vercel
3. Test same flow as local

## Related Files

- `frontend/src/stores/authStore.ts` - Authentication state management
- `frontend/src/middleware.ts` - OAuth callback handling
- `frontend/src/app/page.tsx` - Sign-in button UI
- `frontend/src/hooks/useRedirectIfAuthenticated.ts` - Post-auth redirect logic
- `frontend/src/lib/supabase.ts` - Supabase client initialization

## References

- [Supabase Auth Documentation](https://supabase.com/docs/guides/auth)
- [GitHub OAuth Documentation](https://docs.github.com/en/developers/apps/building-oauth-apps)
- [Next.js Middleware](https://nextjs.org/docs/app/building-your-application/routing/middleware)
