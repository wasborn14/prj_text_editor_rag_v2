'use client'

import { create } from 'zustand'
import { createClient } from '@/lib/supabase'
import { User, Session } from '@supabase/supabase-js'
import { Profile } from '@/types'

interface AuthState {
  user: User | null
  session: Session | null
  profile: Profile | null
  loading: boolean
  githubToken: string | null

  setUser: (user: User | null) => void
  setSession: (session: Session | null) => void
  setProfile: (profile: Profile | null) => void
  setLoading: (loading: boolean) => void
  setGithubToken: (token: string | null) => void

  signInWithGitHub: () => Promise<void>
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
  createOrUpdateProfile: (user: User) => Promise<void>
  initialize: () => Promise<void>
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  session: null,
  profile: null,
  loading: true,
  githubToken: null,

  setUser: (user) => set({ user }),
  setSession: (session) => set({ session }),
  setProfile: (profile) => set({ profile }),
  setLoading: (loading) => set({ loading }),
  setGithubToken: (githubToken) => set({ githubToken }),

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

  createOrUpdateProfile: async (user: User) => {
    try {
      const getResponse = await fetch('/api/profile')

      if (getResponse.ok) {
        const result = await getResponse.json()
        set({ profile: result.data })
        return
      }

      if (getResponse.status === 404) {
        const profileData = {
          github_username: user.user_metadata?.user_name || null,
          github_id: parseInt(user.user_metadata?.provider_id || '0'),
          display_name: user.user_metadata?.full_name || user.email || 'Unknown User',
          avatar_url: user.user_metadata?.avatar_url || null,
        }

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
        console.error('Unexpected error checking profile:', await getResponse.text())
      }
    } catch (error) {
      console.error('Unexpected error in createOrUpdateProfile:', error)
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

    set({
      user: null,
      session: null,
      profile: null,
      githubToken: null,
    })

    const { error } = await supabase.auth.signOut()
    if (error) {
      console.error('Sign out error:', error)
    }
  },

  initialize: async () => {
    const supabase = createClient()

    const { data: { session } } = await supabase.auth.getSession()
    set({
      session,
      user: session?.user ?? null,
      githubToken: session?.provider_token || null,
      loading: false,
    })

    const { createOrUpdateProfile, refreshProfile } = get()

    if (session?.user) {
      await createOrUpdateProfile(session.user)
    }

    supabase.auth.onAuthStateChange(async (event, session) => {
      set({
        session,
        user: session?.user ?? null,
        githubToken: session?.provider_token || null,
        loading: false,
      })

      if (event === 'SIGNED_IN' && session?.user) {
        await createOrUpdateProfile(session.user)
      } else if (event === 'SIGNED_OUT') {
        set({ profile: null })
      } else if (session?.user && !get().profile) {
        await refreshProfile()
      }
    })
  },
}))