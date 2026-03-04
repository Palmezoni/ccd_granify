'use client'

import { createContext, useContext, useEffect, useState } from 'react'

export type Theme = 'light' | 'dark' | 'lilac' | 'sunrise'

interface ThemeContextType {
  theme: Theme
  setTheme: (t: Theme) => void
}

const ThemeContext = createContext<ThemeContextType>({ theme: 'light', setTheme: () => {} })

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>('dark')
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    const stored = localStorage.getItem('granify-theme') as Theme | null
    const valid: Theme[] = ['light', 'dark', 'lilac', 'sunrise']
    const initial = stored && valid.includes(stored) ? stored : 'dark'
    setThemeState(initial)
    document.documentElement.setAttribute('data-theme', initial)
  }, [])

  const setTheme = (t: Theme) => {
    setThemeState(t)
    localStorage.setItem('granify-theme', t)
    document.documentElement.setAttribute('data-theme', t)
  }

  if (!mounted) {
    return (
      <ThemeContext.Provider value={{ theme, setTheme }}>
        <div style={{ visibility: 'hidden' }}>{children}</div>
      </ThemeContext.Provider>
    )
  }

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export const useTheme = () => useContext(ThemeContext)
