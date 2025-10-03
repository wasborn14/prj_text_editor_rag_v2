'use client'

import { create } from 'zustand'
import { createClient } from '@/lib/supabase'
import { User, Session } from '@supabase/supabase-js'
import { Profile, UserRepository } from '@/types'

interface AuthState {
  user: User | null
  session: Session | null
  profile: Profile | null
  loading: boolean
  githubToken: string | null
  selectedRepository: UserRepository | null
  repositorySetupCompleted: boolean

  setUser: (user: User | null) => void
  setSession: (session: Session | null) => void
  setProfile: (profile: Profile | null) => void
  setLoading: (loading: boolean) => void
  setGithubToken: (token: string | null) => void
  setSelectedRepository: (repo: UserRepository | null) => void
  setRepositorySetupCompleted: (completed: boolean) => void

  startLoading: () => void
  stopLoading: () => void

  signInWithGitHub: () => Promise<void>
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
  ensureProfile: (user: User) => Promise<void>
  checkRepositorySelection: () => Promise<void>
  initialize: () => Promise<void>
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  session: null,
  profile: null,
  loading: true,
  githubToken: null,
  selectedRepository: null,
  repositorySetupCompleted: false,

  setUser: (user) => set({ user }),
  setSession: (session) => set({ session }),
  setProfile: (profile) => set({ profile }),
  setLoading: (loading) => set({ loading }),
  setGithubToken: (githubToken) => set({ githubToken }),
  setSelectedRepository: (selectedRepository) => set({ selectedRepository }),
  setRepositorySetupCompleted: (repositorySetupCompleted) => set({ repositorySetupCompleted }),

  startLoading: () => set({ loading: true }),
  stopLoading: () => set({ loading: false }),

  refreshProfile: async () => {
    const { user } = get()
    if (!user) return

    try {
      const response = await fetch('/api/profile')
      if (response.ok) {
        const result = await response.json()
        set({ profile: result.data })
      } else {
        console.error('Profile fetch failed:', await response.text())
        set({ profile: null })
      }
    } catch (error) {
      console.error('Unexpected error in refreshProfile:', error)
      set({ profile: null })
    }
  },

  ensureProfile: async (user: User) => {
    try {
      // GitHubから最新のプロフィール情報を構築
      const profileData = {
        github_username: user.user_metadata?.user_name || null,
        github_id: parseInt(user.user_metadata?.provider_id || '0'),
        display_name: user.user_metadata?.full_name || user.email || 'Unknown User',
        avatar_url: user.user_metadata?.avatar_url || null,
      }

      // 既存プロフィールの更新を試行
      const putResponse = await fetch('/api/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(profileData),
      })

      if (putResponse.ok) {
        // 更新成功
        const result = await putResponse.json()
        set({ profile: result.data })
        return
      }

      // プロフィールが存在しない場合は新規作成
      if (putResponse.status === 404) {
        const postResponse = await fetch('/api/profile', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(profileData),
        })

        if (postResponse.ok) {
          const result = await postResponse.json()
          set({ profile: result.data })
        } else {
          console.error('Profile creation failed:', await postResponse.text())
        }
      } else {
        console.error('Profile update failed:', await putResponse.text())
      }
    } catch (error) {
      console.error('Unexpected error in ensureProfile:', error)
    }
  },

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
  },

  signOut: async () => {
    const supabase = createClient()

    // stateクリア
    set({
      user: null,
      session: null,
      profile: null,
      githubToken: null,
      selectedRepository: null,
      repositorySetupCompleted: false,
    })
    get().stopLoading()

    // Supabaseサインアウト
    try {
      await supabase.auth.signOut()
    } catch (error) {
      console.error('Sign out error:', error)
    }

    window.location.replace('/')
  },

  checkRepositorySelection: async () => {
    const { user } = get()
    if (!user) return

    try {
      const response = await fetch('/api/repositories/selected')

      if (response.ok) {
        const result = await response.json()
        if (result.data?.selected_repository) {
          set({
            selectedRepository: result.data.selected_repository,
            repositorySetupCompleted: true
          })
        } else {
          set({ repositorySetupCompleted: false })
        }
      } else {
        set({ repositorySetupCompleted: false })
      }
    } catch (error) {
      console.error('Repository selection check failed:', error)
      set({ repositorySetupCompleted: false })
    }
  },

  initialize: async () => {
    const supabase = createClient()

    const { data: { session } } = await supabase.auth.getSession()
    set({
      session,
      user: session?.user ?? null,
      githubToken: session?.provider_token || null,
    })

    const { ensureProfile, checkRepositorySelection, startLoading, stopLoading } = get()

    if (session?.user) {
      startLoading() // プロファイルとリポジトリ選択状態の確認中
      await ensureProfile(session.user)
      await checkRepositorySelection()
      stopLoading() // 全ての初期化処理が完了
    } else {
      stopLoading()
    }

    supabase.auth.onAuthStateChange(async (event, session) => {
      const { ensureProfile, refreshProfile, checkRepositorySelection, startLoading, stopLoading } = get()

      // 基本的なセッション情報を更新
      set({
        session,
        user: session?.user ?? null,
        githubToken: session?.provider_token || null,
      })

      if (event === 'SIGNED_IN' && session?.user) {
        // サインイン時: プロファイルとリポジトリ選択状態を確認
        startLoading()
        await ensureProfile(session.user)
        await checkRepositorySelection()
        stopLoading()
      } else if (event === 'SIGNED_OUT') {
        // サインアウト時: 全てのユーザー関連データをクリア
        set({
          profile: null,
          selectedRepository: null,
          repositorySetupCompleted: false,
        })
        stopLoading()
      } else if (session?.user && !get().profile) {
        // その他（既存セッション等）: プロファイルがない場合のみ取得
        startLoading()
        await refreshProfile()
        await checkRepositorySelection()
        stopLoading()
      } else {
        // それ以外: ローディング解除のみ
        stopLoading()
      }
    })
  },
}))