'use client'

import { useRouter } from 'next/navigation'
import { Bell, LogOut, User, CheckCheck, X, Info, AlertTriangle, Target, CreditCard } from 'lucide-react'
import { ThemeToggle } from './theme-toggle'
import { getInitials } from '@/lib/utils'
import { useState, useEffect, useRef } from 'react'

interface TopbarProps {
  user: { name: string | null; email: string; role?: string }
}

interface Notificacao {
  id: string
  titulo: string
  mensagem: string
  tipo: string
  lida: boolean
  link?: string | null
  createdAt: string
}

function NotifIcon({ tipo }: { tipo: string }) {
  if (tipo === 'VENCIMENTO') return <CreditCard className="h-3.5 w-3.5 text-amber-500" />
  if (tipo === 'META') return <Target className="h-3.5 w-3.5 text-emerald-500" />
  if (tipo === 'FATURA') return <CreditCard className="h-3.5 w-3.5 text-blue-500" />
  return <Info className="h-3.5 w-3.5 text-primary" />
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'agora'
  if (mins < 60) return `${mins}min`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h`
  return `${Math.floor(hrs / 24)}d`
}

export function Topbar({ user }: TopbarProps) {
  const router = useRouter()
  const [notifOpen, setNotifOpen] = useState(false)
  const [userOpen, setUserOpen] = useState(false)
  const [notifs, setNotifs] = useState<Notificacao[]>([])
  const [totalNaoLidas, setTotalNaoLidas] = useState(0)
  const notifRef = useRef<HTMLDivElement>(null)
  const userRef = useRef<HTMLDivElement>(null)

  async function fetchNotifs() {
    try {
      const res = await fetch('/api/notificacoes?limite=15')
      if (res.ok) {
        const data = await res.json()
        setNotifs(data.notificacoes)
        setTotalNaoLidas(data.totalNaoLidas)
      }
    } catch {}
  }

  useEffect(() => {
    fetchNotifs()
    const interval = setInterval(fetchNotifs, 30000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setNotifOpen(false)
      if (userRef.current && !userRef.current.contains(e.target as Node)) setUserOpen(false)
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  async function markRead(id: string) {
    await fetch(`/api/notificacoes/${id}`, { method: 'PATCH' })
    setNotifs(prev => prev.map(n => n.id === id ? { ...n, lida: true } : n))
    setTotalNaoLidas(prev => Math.max(0, prev - 1))
  }

  async function markAllRead() {
    await fetch('/api/notificacoes/marcar-todas', { method: 'POST' })
    setNotifs(prev => prev.map(n => ({ ...n, lida: true })))
    setTotalNaoLidas(0)
  }

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
    router.refresh()
  }

  return (
    <header className="flex h-14 items-center justify-between border-b border-border bg-card px-4">
      <div className="flex-1" />

      <div className="flex items-center gap-2">
        {/* Theme toggle */}
        <ThemeToggle />

        {/* Divider */}
        <div className="mx-1 h-5 w-px bg-border" />

        {/* Notificacoes */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={() => { setNotifOpen(!notifOpen); setUserOpen(false) }}
            className="relative flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition hover:bg-accent hover:text-accent-foreground"
          >
            <Bell className="h-4 w-4" />
            {totalNaoLidas > 0 && (
              <span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[9px] font-bold text-primary-foreground">
                {totalNaoLidas > 9 ? '9+' : totalNaoLidas}
              </span>
            )}
          </button>

          {notifOpen && (
            <div className="absolute right-0 top-full z-50 mt-2 w-80 rounded-xl border border-border bg-card shadow-xl">
              {/* Header */}
              <div className="flex items-center justify-between border-b border-border px-4 py-3">
                <span className="text-sm font-semibold text-foreground">Notificacoes</span>
                <div className="flex items-center gap-2">
                  {totalNaoLidas > 0 && (
                    <button
                      onClick={markAllRead}
                      className="flex items-center gap-1 rounded px-2 py-1 text-xs text-primary hover:bg-accent"
                      title="Marcar todas como lidas"
                    >
                      <CheckCheck className="h-3 w-3" /> Ler todas
                    </button>
                  )}
                  <button onClick={() => setNotifOpen(false)} className="rounded p-1 text-muted-foreground hover:bg-accent">
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              {/* List */}
              <div className="max-h-80 overflow-y-auto">
                {notifs.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-10 text-center">
                    <Bell className="mb-2 h-8 w-8 text-muted-foreground/40" />
                    <p className="text-sm text-muted-foreground">Nenhuma notificacao</p>
                  </div>
                ) : (
                  notifs.map((n) => (
                    <div
                      key={n.id}
                      onClick={() => { markRead(n.id); if (n.link) router.push(n.link) }}
                      className={`flex cursor-pointer gap-3 border-b border-border px-4 py-3 transition hover:bg-accent ${!n.lida ? 'bg-primary/5' : ''}`}
                    >
                      <div className="mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-secondary">
                        <NotifIcon tipo={n.tipo} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-xs font-medium leading-tight text-foreground ${!n.lida ? 'font-semibold' : ''}`}>
                          {n.titulo}
                        </p>
                        <p className="mt-0.5 truncate text-xs text-muted-foreground">{n.mensagem}</p>
                        <p className="mt-1 text-[10px] text-muted-foreground/60">{timeAgo(n.createdAt)}</p>
                      </div>
                      {!n.lida && (
                        <div className="mt-1.5 h-2 w-2 flex-shrink-0 rounded-full bg-primary" />
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Divider */}
        <div className="mx-1 h-5 w-px bg-border" />

        {/* User menu */}
        <div className="relative" ref={userRef}>
          <button
            onClick={() => { setUserOpen(!userOpen); setNotifOpen(false) }}
            className="flex items-center gap-2 rounded-lg px-2 py-1 transition hover:bg-accent"
          >
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
              {user.name ? getInitials(user.name) : <User className="h-3 w-3" />}
            </div>
            <div className="hidden text-left sm:block">
              <p className="text-xs font-medium text-foreground">{user.name || 'Usuario'}</p>
              <p className="text-xs text-muted-foreground">{user.email}</p>
            </div>
          </button>

          {userOpen && (
            <div className="absolute right-0 top-full z-50 mt-1 w-44 rounded-lg border border-border bg-card py-1 shadow-lg">
              <a href="/configuracoes" className="flex items-center gap-2 px-3 py-1.5 text-sm text-foreground hover:bg-accent">
                <User className="h-3.5 w-3.5" /> Configuracoes
              </a>
              {user.role === 'ADMIN' && (
                <a href="/admin" className="flex items-center gap-2 px-3 py-1.5 text-sm text-primary hover:bg-accent">
                  <AlertTriangle className="h-3.5 w-3.5" /> Painel Admin
                </a>
              )}
              <div className="my-1 border-t border-border" />
              <button
                onClick={handleLogout}
                className="flex w-full items-center gap-2 px-3 py-1.5 text-sm text-destructive hover:bg-accent"
              >
                <LogOut className="h-3.5 w-3.5" /> Sair
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
