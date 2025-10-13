'use client'

import { useEffect, useState } from 'react'
import { useAuthStore } from '@/stores/authStore'

export function AuthInitializer({ children }: { children: React.ReactNode }) {
  const initialize = useAuthStore((state) => state.initialize)
  const [isInitialized, setIsInitialized] = useState(false)

  useEffect(() => {
    initialize().then(() => setIsInitialized(true))
  }, [initialize])

  // SSRとクライアントの不一致を防ぐため、初期化完了までレンダリングしない
  if (!isInitialized) {
    return null
  }

  return <>{children}</>
}
