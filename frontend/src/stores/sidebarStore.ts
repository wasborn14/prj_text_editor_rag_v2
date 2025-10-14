import { create } from 'zustand'

interface SidebarState {
  isOpen: boolean
  toggle: () => void
  open: () => void
  close: () => void
}

// 初期状態: デスクトップ(768px以上)ならtrue、モバイルならfalse
const getInitialState = () => {
  if (typeof window === 'undefined') return true // SSR時はデスクトップとして扱う
  return window.innerWidth >= 768
}

export const useSidebarStore = create<SidebarState>((set) => ({
  isOpen: getInitialState(),
  toggle: () => set((state) => ({ isOpen: !state.isOpen })),
  open: () => set({ isOpen: true }),
  close: () => set({ isOpen: false }),
}))
