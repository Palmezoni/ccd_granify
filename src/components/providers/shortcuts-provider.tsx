'use client'

import { createContext, useContext, useEffect, useState } from 'react'

export interface Shortcut {
  id: string
  labelKey: string
  icon: string
  href: string
}

export const ALL_SHORTCUTS: Shortcut[] = [
  { id: 'nova-conta',       labelKey: 'shortcut.nova-conta',       icon: 'Wallet',      href: '/cadastros/contas' },
  { id: 'novo-lancamento',  labelKey: 'shortcut.novo-lancamento',  icon: 'PlusCircle',  href: '/movimentacoes/lancamentos' },
  { id: 'extrato',          labelKey: 'shortcut.extrato',          icon: 'FileText',    href: '/extrato' },
  { id: 'cartoes',          labelKey: 'shortcut.cartoes',          icon: 'CreditCard',  href: '/cartoes' },
  { id: 'metas',            labelKey: 'shortcut.metas',            icon: 'Target',      href: '/metas' },
  { id: 'relatorios',       labelKey: 'shortcut.relatorios',       icon: 'BarChart3',   href: '/relatorios' },
]

const DEFAULT_SHORTCUTS = ['novo-lancamento', 'extrato', 'cartoes', 'metas', 'relatorios']

interface ShortcutsContextType {
  enabled: string[]
  setEnabled: (ids: string[]) => void
  activeShortcuts: Shortcut[]
}

const ShortcutsContext = createContext<ShortcutsContextType>({
  enabled: DEFAULT_SHORTCUTS,
  setEnabled: () => {},
  activeShortcuts: [],
})

export function ShortcutsProvider({ children }: { children: React.ReactNode }) {
  const [enabled, setEnabledState] = useState<string[]>(DEFAULT_SHORTCUTS)

  useEffect(() => {
    try {
      const stored = localStorage.getItem('granify-shortcuts')
      if (stored) {
        const parsed = JSON.parse(stored)
        if (Array.isArray(parsed)) setEnabledState(parsed)
      }
    } catch {}
  }, [])

  const setEnabled = (ids: string[]) => {
    const limited = ids.slice(0, 5)
    setEnabledState(limited)
    localStorage.setItem('granify-shortcuts', JSON.stringify(limited))
  }

  const activeShortcuts = ALL_SHORTCUTS.filter((s) => enabled.includes(s.id))

  return (
    <ShortcutsContext.Provider value={{ enabled, setEnabled, activeShortcuts }}>
      {children}
    </ShortcutsContext.Provider>
  )
}

export const useShortcuts = () => useContext(ShortcutsContext)
