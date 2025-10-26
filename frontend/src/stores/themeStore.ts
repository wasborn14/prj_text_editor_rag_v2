import { create } from 'zustand'

interface ThemeStore {
  isDarkMode: boolean
  toggleTheme: () => void
  setTheme: (isDark: boolean) => void
  initializeTheme: () => void
}

export const useThemeStore = create<ThemeStore>((set) => ({
  isDarkMode: false,

  toggleTheme: () => set((state) => {
    const newMode = !state.isDarkMode
    if (typeof window !== 'undefined') {
      localStorage.setItem('theme', newMode ? 'dark' : 'light')
      document.documentElement.setAttribute('data-theme', newMode ? 'dark' : 'light')
    }
    return { isDarkMode: newMode }
  }),

  setTheme: (isDark) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('theme', isDark ? 'dark' : 'light')
      document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light')
    }
    set({ isDarkMode: isDark })
  },

  initializeTheme: () => {
    if (typeof window !== 'undefined') {
      const savedTheme = localStorage.getItem('theme')
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
      const isDark = savedTheme === 'dark' || (!savedTheme && prefersDark)

      document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light')
      set({ isDarkMode: isDark })
    }
  }
}))
