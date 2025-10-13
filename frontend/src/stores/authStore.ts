'use client'

import { create } from 'zustand'
import { createClient } from '@/lib/supabase'
import { User, Session } from '@supabase/supabase-js'

type TokenSetupReason = 'missing' | 'expired' | 'invalid'

interface AuthState {
  user: User | null
  session: Session | null
  loading: boolean
  githubToken: string | null
  needsTokenSetup: boolean
  tokenSetupReason: TokenSetupReason | null

  signInWithGitHub: () => Promise<void>
  signOut: () => Promise<void>
  initialize: () => Promise<void>
  fetchGithubToken: () => Promise<string | null>
  saveGithubToken: (token: string, expiresAt: string | null) => Promise<void>
  saveProfile: () => Promise<void>
  setTokenSetupNeeded: (reason: TokenSetupReason) => void
  clearTokenSetup: () => void
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  session: null,
  loading: true,
  githubToken: null,
  needsTokenSetup: false,
  tokenSetupReason: null,

  signInWithGitHub: async () => {
    const supabase = createClient()

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'github',
      options: {
        redirectTo: `${window.location.origin}/dashboard`,
        scopes: 'repo read:user user:email',
      },
    })

    if (error) {
      throw new Error(`GitHub authentication failed: ${error.message}`)
    }
  },

  signOut: async () => {
    const supabase = createClient()

    // stateクリア
    set({
      user: null,
      session: null,
      githubToken: null,
      needsTokenSetup: false,
      tokenSetupReason: null,
      loading: false,
    })

    // Supabaseサインアウト
    try {
      await supabase.auth.signOut()
    } catch (error) {
      console.error('Sign out error:', error)
    }

    window.location.replace('/login')
  },

  initialize: async () => {
    const supabase = createClient()

    const {
      data: { session },
    } = await supabase.auth.getSession()

    // データベースからGitHubトークンを取得
    let githubToken: string | null = null
    let needsTokenSetup = false
    let tokenSetupReason: TokenSetupReason | null = null

    if (session?.user) {
      githubToken = await get().fetchGithubToken()

      // トークンがない場合は設定が必要
      if (!githubToken) {
        needsTokenSetup = true
        tokenSetupReason = 'missing'
      }
    }

    set({
      session,
      user: session?.user ?? null,
      githubToken,
      needsTokenSetup,
      tokenSetupReason,
      loading: false,
    })

    supabase.auth.onAuthStateChange(async (event, session) => {
      // データベースからGitHubトークンを取得
      let githubToken: string | null = null
      let needsTokenSetup = false
      let tokenSetupReason: TokenSetupReason | null = null

      if (session?.user) {
        githubToken = await get().fetchGithubToken()

        // トークンがない場合は設定が必要
        if (!githubToken) {
          needsTokenSetup = true
          tokenSetupReason = 'missing'
        }
      }

      set({
        session,
        user: session?.user ?? null,
        githubToken,
        needsTokenSetup,
        tokenSetupReason,
      })

      // SIGNED_INイベント時にプロフィールを自動保存
      if (event === 'SIGNED_IN' && session?.user) {
        await get().saveProfile()
      }
    })
  },

  fetchGithubToken: async () => {
    try {
      const response = await fetch('/api/github-token')
      if (!response.ok) {
        if (response.status === 401) return null
        throw new Error('Failed to fetch token')
      }

      const data = await response.json()
      return data.hasToken ? data.token : null
    } catch (error) {
      console.error('Failed to fetch GitHub token:', error)
      return null
    }
  },

  saveGithubToken: async (token: string, expiresAt: string | null) => {
    try {
      const response = await fetch('/api/github-token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token, expiresAt }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to save token')
      }

      set({
        githubToken: token,
        needsTokenSetup: false,
        tokenSetupReason: null,
      })
    } catch (error) {
      console.error('Failed to save GitHub token:', error)
      throw error
    }
  },

  setTokenSetupNeeded: (reason: TokenSetupReason) => {
    set({
      needsTokenSetup: true,
      tokenSetupReason: reason,
      githubToken: null,
    })
  },

  clearTokenSetup: () => {
    set({
      needsTokenSetup: false,
      tokenSetupReason: null,
    })
  },

  saveProfile: async () => {
    const { user } = get()
    if (!user) return

    try {
      const github_username =
        user.user_metadata?.user_name || user.user_metadata?.preferred_username
      const github_id = user.user_metadata?.provider_id
      const display_name =
        user.user_metadata?.full_name ||
        user.user_metadata?.name ||
        github_username
      const avatar_url = user.user_metadata?.avatar_url

      const response = await fetch('/api/profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          github_username,
          github_id,
          display_name,
          avatar_url,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to save profile')
      }
    } catch (error) {
      console.error('Failed to save profile:', error)
      // プロフィール保存失敗はエラーとして扱わない（ログインは継続）
    }
  },
}))
