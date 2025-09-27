'use client'

import { useAuthStore } from '@/stores/authStore'
import { Button } from '@/components/atoms/Button/Button'
import { Avatar } from '@/components/atoms/Avatar/Avatar'
import { SidebarToggle } from '@/components/atoms/ToggleButton/ToggleButton'
import { useSidebarStore } from '@/stores/sidebarStore'
import { UserRepository } from '@/types'

interface HeaderProps {
  profile?: {
    avatar_url?: string | null
    display_name?: string | null
    github_username?: string | null
  } | null
  selectedRepository?: UserRepository | null
}

export const Header = ({ profile, selectedRepository }: HeaderProps) => {
  const signOut = useAuthStore((state) => state.signOut)
  const { isVisible, toggleVisibility } = useSidebarStore()

  return (
    <header className="bg-white shadow-sm border-b">
      <div className="flex items-center h-16 px-4 sm:px-6 lg:px-8">
        {/* Sidebar Toggle Button - 左端 */}
        <SidebarToggle
          isVisible={isVisible}
          onToggle={toggleVisibility}
        />

        {/* Main Content - 中央 */}
        <div className="flex items-center space-x-4 flex-1 ml-4">
          <h1 className="text-xl font-semibold text-gray-900">
            RAG Text Editor
          </h1>
          {selectedRepository && (
            <>
              <div className="text-gray-300">|</div>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-lg font-medium text-gray-700">
                  {selectedRepository.full_name}
                </span>
              </div>
            </>
          )}
        </div>

        {/* Right Side - ユーザー情報 */}
        <div className="flex items-center space-x-4">
          {profile && (
              <div className="flex items-center space-x-3">
                <Avatar
                  src={profile.avatar_url || undefined}
                  alt={profile.display_name || 'User'}
                  size="sm"
                />
                <div className="hidden sm:block">
                  <div className="text-sm font-medium text-gray-900">
                    {profile.display_name}
                  </div>
                  {profile.github_username && (
                    <div className="text-xs text-gray-500">
                      @{profile.github_username}
                    </div>
                  )}
                </div>
              </div>
            )}

          <Button
            variant="outline"
            size="sm"
            onClick={signOut}
          >
            Sign Out
          </Button>
        </div>
      </div>
    </header>
  )
}