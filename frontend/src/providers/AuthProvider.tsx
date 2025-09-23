'use client'

import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase'
import { User, Session } from '@supabase/supabase-js'
import { Profile } from '@/types'

interface AuthContextType {
  user: User | null
  session: Session | null
  profile: Profile | null
  loading: boolean
  signInWithGitHub: () => Promise<void>
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
  githubToken: string | null
}

const AuthContext = createContext<AuthContextType | null>(null)

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [githubToken, setGithubToken] = useState<string | null>(null)

  const refreshProfile = useCallback(async () => {
    if (!user) return

    try {
      const response = await fetch('/api/profile')
      if (response.ok) {
        const result = await response.json()
        setProfile(result.data)
      } else {
        console.error('Profile fetch failed:', await response.text())
        setProfile(null)
      }
    } catch (error) {
      console.error('Unexpected error in refreshProfile:', error)
      setProfile(null)
    }
  }, [user])

  const createOrUpdateProfile = async (user: User) => {
    try {
      // まず既存プロフィールを確認
      const getResponse = await fetch('/api/profile')

      if (getResponse.ok) {
        // 既存プロフィールが見つかった場合
        const result = await getResponse.json()
        setProfile(result.data)
        return
      }

      // プロフィールが存在しない場合のみ作成
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
          setProfile(result.data)
        } else {
          console.error('Profile creation failed:', await postResponse.text())
        }
      } else {
        console.error('Unexpected error checking profile:', await getResponse.text())
      }
    } catch (error) {
      console.error('Unexpected error in createOrUpdateProfile:', error)
    }
  }

  useEffect(() => {
    const supabase = createClient()

    const getInitialSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      setSession(session)
      setUser(session?.user ?? null)

      if (session) {
        const token = session.provider_token || null
        setGithubToken(token)
      }

      setLoading(false)
    }

    getInitialSession()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      setSession(session)
      setUser(session?.user ?? null)

      const token = session?.provider_token || null
      setGithubToken(token)

      setLoading(false)

      if (event === 'SIGNED_IN' && session?.user) {
        await createOrUpdateProfile(session.user)
      }

      if (event === 'SIGNED_OUT') {
        setProfile(null)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  // プロフィール取得のための別のuseEffect
  useEffect(() => {
    if (user && !profile) {
      refreshProfile()
    }
  }, [user, profile, refreshProfile])

  const signInWithGitHub = async () => {
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
  }

  const signOut = async () => {
    const supabase = createClient()

    setUser(null)
    setSession(null)
    setProfile(null)
    setGithubToken(null)

    const { error } = await supabase.auth.signOut()
    if (error) {
      console.error('Sign out error:', error)
    }
  }

  return (
    <AuthContext.Provider value={{
      user,
      session,
      profile,
      loading,
      signInWithGitHub,
      signOut,
      refreshProfile,
      githubToken,
    }}>
      {children}
    </AuthContext.Provider>
  )
}