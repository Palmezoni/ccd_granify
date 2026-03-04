'use client'

import { createContext, useContext, useState, useEffect } from 'react'

interface SidebarContextType {
  collapsed: boolean
  toggle: () => void
  setCollapsed: (v: boolean) => void
}

const SidebarContext = createContext<SidebarContextType>({
  collapsed: false,
  toggle: () => {},
  setCollapsed: () => {},
})

export function SidebarProvider({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsedState] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    const stored = localStorage.getItem('granify-sidebar-collapsed')
    if (stored === 'true') setCollapsedState(true)
  }, [])

  const setCollapsed = (v: boolean) => {
    setCollapsedState(v)
    localStorage.setItem('granify-sidebar-collapsed', String(v))
  }

  const toggle = () => setCollapsed(!collapsed)

  if (!mounted) return <>{children}</>

  return (
    <SidebarContext.Provider value={{ collapsed, toggle, setCollapsed }}>
      {children}
    </SidebarContext.Provider>
  )
}

export const useSidebar = () => useContext(SidebarContext)
