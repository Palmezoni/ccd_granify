'use client'

import { useRouter } from 'next/navigation'
import { Bell, Moon, Sun, LogOut, User } from 'lucide-react'
import { useTheme } from 'next-themes'
import { getInitials } from '@/lib/utils'

interface TopbarProps {
  user: { name: string | null; email: string }
}

export function Topbar({ user }: TopbarProps) {
  const router = useRouter()
  const { theme, setTheme } = useTheme()

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
    router.refresh()
  }

  return (
    <header className="flex h-14 items-center justify-between border-b border-border bg-card px-4">
      <div className="flex-1" />

      <div className="flex items-center gap-2">
        {/* Notificações */}
        <button className="relative flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-slate-700 dark:hover:text-white">
          <Bell className="h-4 w-4" />
        </button>

        {/* Dark mode */}
        <button
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-slate-700 dark:hover:text-white"
        >
          {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </button>

        {/* Divider */}
        <div className="mx-1 h-5 w-px bg-border" />

        {/* User menu */}
        <div className="group relative">
          <button className="flex items-center gap-2 rounded-lg px-2 py-1 transition hover:bg-slate-100 dark:hover:bg-slate-700">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-500 text-xs font-semibold text-white">
              {user.name ? getInitials(user.name) : <User className="h-3 w-3" />}
            </div>
            <div className="hidden text-left sm:block">
              <p className="text-xs font-medium text-slate-900 dark:text-white">{user.name || 'Usuário'}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">{user.email}</p>
            </div>
          </button>

          {/* Dropdown */}
          <div className="absolute right-0 top-full z-50 mt-1 hidden w-40 rounded-lg border border-border bg-card py-1 shadow-lg group-hover:block">
            <a href="/configuracoes" className="flex items-center gap-2 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700">
              <User className="h-3.5 w-3.5" /> Configurações
            </a>
            <div className="my-1 border-t border-border" />
            <button
              onClick={handleLogout}
              className="flex w-full items-center gap-2 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950"
            >
              <LogOut className="h-3.5 w-3.5" /> Sair
            </button>
          </div>
        </div>
      </div>
    </header>
  )
}
