'use client'

import { create } from 'zustand'
import { createClient } from '@/lib/supabase'
import { User, Session } from '@supabase/supabase-js'

interface AuthState {
  user: User | null
  session: Session | null
  loading: boolean
  githubToken: string | null
  refreshIntervalId: NodeJS.Timeout | null

  setUser: (user: User | null) => void
  setSession: (session: Session | null) => void
  setLoading: (loading: boolean) => void
  setGithubToken: (token: string | null) => void

  startLoading: () => void
  stopLoading: () => void

  signInWithGitHub: () => Promise<void>
  signOut: () => Promise<void>
  initialize: () => Promise<void>
  startSessionRefresh: () => void
  stopSessionRefresh: () => void
  fetchGithubToken: () => Promise<string | null>
  saveGithubToken: (token: string, expiresAt: string | null) => Promise<void>
  saveProfile: () => Promise<void>
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  session: null,
  loading: true,
  githubToken: null,
  refreshIntervalId: null,

  setUser: (user) => set({ user }),
  setSession: (session) => set({ session }),
  setLoading: (loading) => set({ loading }),
  setGithubToken: (githubToken) => set({ githubToken }),

  startLoading: () => set({ loading: true }),
  stopLoading: () => set({ loading: false }),

  startSessionRefresh: () => {
    const { refreshIntervalId } = get()

    // 既にタイマーが動いていれば何もしない
    if (refreshIntervalId) return

    const supabase = createClient()

    const intervalId = setInterval(async () => {
      console.log('⏰ Auto-refresh interval triggered at:', new Date().toISOString())

      // 現在のセッションを取得してチェック
      const { data: currentSession } = await supabase.auth.getSession()

      if (currentSession?.session) {
        const expiresAt = currentSession.session.expires_at! * 1000
        const now = Date.now()
        const remainingMs = expiresAt - now
        const remainingMinutes = Math.floor(remainingMs / 1000 / 60)

        console.log(`   Current token expires at: ${new Date(expiresAt).toISOString()}`)
        console.log(`   Time remaining: ${remainingMinutes} minutes (${Math.floor(remainingMs / 1000)} seconds)`)

        // 期限切れまたは5分以内の場合、リフレッシュを実行
        if (remainingMs <= 5 * 60 * 1000) {
          console.log('   🔄 Token is expiring soon or expired, refreshing...')

          const { data, error } = await supabase.auth.refreshSession()
          if (data?.session) {
            const newGithubToken = data.session.provider_token || null
            set({
              session: data.session,
              user: data.session.user,
              githubToken: newGithubToken,
            })
            console.log('   ✅ Session refreshed successfully!')
            console.log('   📅 New token expires at:', new Date(data.session.expires_at! * 1000).toISOString())
            console.log('   🔑 GitHub token updated:', newGithubToken ? `${newGithubToken.substring(0, 10)}...` : 'null')
          } else if (error) {
            console.error('   ❌ Session refresh failed:', error)
            get().stopSessionRefresh()
          }
        } else {
          console.log('   ⏭️  Token is still valid, skipping refresh')
        }
      }
    }, 10 * 1000) // 10秒ごとにチェック（開発用）

    set({ refreshIntervalId: intervalId })
    console.log('🚀 Session auto-refresh started (checking every 10 seconds for testing)')
  },

  stopSessionRefresh: () => {
    const { refreshIntervalId } = get()
    if (refreshIntervalId) {
      clearInterval(refreshIntervalId)
      set({ refreshIntervalId: null })
      console.log('Session auto-refresh stopped')
    }
  },

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

    // タイマーを停止
    get().stopSessionRefresh()

    // stateクリア
    set({
      user: null,
      session: null,
      githubToken: null,
    })
    get().stopLoading()

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

    console.log('🔍 Initialize - Session info:')
    console.log('   Has session:', !!session)
    console.log('   User:', session?.user?.email)

    // データベースからGitHubトークンを取得
    let githubToken: string | null = null
    if (session?.user) {
      githubToken = await get().fetchGithubToken()
      console.log('   🔑 GitHub token from database:', githubToken ? `${githubToken.substring(0, 10)}...` : '❌ Not configured')
    }

    set({
      session,
      user: session?.user ?? null,
      githubToken: githubToken,
    })

    const { startLoading, stopLoading, startSessionRefresh } = get()

    if (session?.user) {
      startLoading()
      stopLoading()

      // ログイン中はセッション自動リフレッシュを開始
      startSessionRefresh()
    } else {
      stopLoading()
    }

    supabase.auth.onAuthStateChange(async (event, session) => {
      const {
        startLoading,
        stopLoading,
        startSessionRefresh,
        stopSessionRefresh,
      } = get()

      console.log('Auth state changed:', event)

      // データベースからGitHubトークンを取得
      let githubToken: string | null = null
      if (session?.user) {
        githubToken = await get().fetchGithubToken()
      }

      set({
        session,
        user: session?.user ?? null,
        githubToken: githubToken,
      })

      if (event === 'SIGNED_IN' && session?.user) {
        startLoading()

        // プロフィールを自動保存（初回ログイン時）
        await get().saveProfile()

        stopLoading()

        // 自動リフレッシュ開始
        startSessionRefresh()
      } else if (event === 'SIGNED_OUT') {
        // サインアウト時: 全てのユーザー関連データをクリアし、タイマーを停止
        stopSessionRefresh()
        stopLoading()
      } else {
        // それ以外: ローディング解除のみ
        stopLoading()
      }
    })
  },

  fetchGithubToken: async () => {
    try {
      const response = await fetch('/api/github-token')
      if (!response.ok) {
        if (response.status === 401) {
          console.log('   ⚠️  Not authenticated')
          return null
        }
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
        throw new Error('Failed to save token')
      }

      // トークンをstateに反映
      set({ githubToken: token })
      console.log('✅ GitHub token saved successfully')
    } catch (error) {
      console.error('Failed to save GitHub token:', error)
      throw error
    }
  },

  saveProfile: async () => {
    const { user } = get()
    if (!user) {
      console.log('⚠️  No user found, skipping profile save')
      return
    }

    try {
      console.log('💾 Saving GitHub profile...')

      const github_username = user.user_metadata?.user_name || user.user_metadata?.preferred_username
      const github_id = user.user_metadata?.provider_id
      const display_name = user.user_metadata?.full_name || user.user_metadata?.name || github_username
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

      console.log('✅ GitHub profile saved successfully')
    } catch (error) {
      console.error('Failed to save profile:', error)
      // プロフィール保存失敗はエラーとして扱わない（ログインは継続）
    }
  },
}))
