'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { User, Session } from '@supabase/supabase-js'

interface AuthContextType {
  user: User | null
  session: Session | null
  loading: boolean
  signInWithGitHub: () => Promise<void>
  signOut: () => Promise<void>
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
  const [loading, setLoading] = useState(true)
  const [githubToken, setGithubToken] = useState<string | null>(null)

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
        await createProfile(session.user)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const createProfile = async (user: User) => {
    try {
      const supabase = createClient()

      const profile = {
        id: user.id,
        github_username: user.user_metadata?.user_name || null,
        display_name: user.user_metadata?.full_name || user.email || 'Unknown User',
        avatar_url: user.user_metadata?.avatar_url || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }

      const { error } = await supabase
        .from('profiles')
        .upsert(profile, { onConflict: 'id' })

      if (error) {
        console.error('Profile creation error:', error)
      }
    } catch (error) {
      console.error('Unexpected error in createProfile:', error)
    }
  }

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
      loading,
      signInWithGitHub,
      signOut,
      githubToken,
    }}>
      {children}
    </AuthContext.Provider>
  )
}