'use client'

import { useAuth } from '@/providers/AuthProvider'
import { Button } from '@/components/atoms/Button/Button'
import { Avatar } from '@/components/atoms/Avatar/Avatar'

export const Header = () => {
  const { user, loading, signInWithGitHub, signOut } = useAuth()

  if (loading) {
    return (
      <div className="h-16 border-b flex items-center justify-between px-6">
        <h1 className="text-xl font-bold">RAG Documentation Search</h1>
        <div className="w-24 h-8 bg-gray-200 animate-pulse rounded" />
      </div>
    )
  }

  return (
    <header className="h-16 border-b flex items-center justify-between px-6">
      <h1 className="text-xl font-bold">RAG Documentation Search</h1>

      {user ? (
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Avatar
              src={user.user_metadata?.avatar_url}
              alt={user.user_metadata?.full_name || 'User'}
            />
            <span className="text-sm font-medium">
              {user.user_metadata?.full_name || user.email}
            </span>
          </div>
          <Button variant="ghost" onClick={signOut}>
            Sign Out
          </Button>
        </div>
      ) : (
        <Button onClick={signInWithGitHub}>
          Sign in with GitHub
        </Button>
      )}
    </header>
  )
}