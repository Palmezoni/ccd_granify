'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, ArrowLeftRight, FileText, CreditCard,
  Target, BarChart3, FolderOpen, Settings, TrendingUp, ChevronDown,
  PiggyBank, Wallet2, Key, Shuffle
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useState } from 'react'

interface NavItem {
  label: string
  href?: string
  icon: React.ReactNode
  children?: { label: string; href: string }[]
}

const NAV: NavItem[] = [
  { label: 'Dashboard', href: '/dashboard', icon: <LayoutDashboard className="h-4 w-4" /> },
  {
    label: 'Movimentações',
    icon: <ArrowLeftRight className="h-4 w-4" />,
    children: [
      { label: 'Lançamentos', href: '/movimentacoes/lancamentos' },
      { label: 'Fluxo de Caixa', href: '/fluxo-de-caixa' },
    ],
  },
  { label: 'Extrato', href: '/extrato', icon: <FileText className="h-4 w-4" /> },
  { label: 'Cartões', href: '/cartoes', icon: <CreditCard className="h-4 w-4" /> },
  {
    label: 'Metas',
    icon: <Target className="h-4 w-4" />,
    children: [
      { label: 'Orçamento', href: '/metas' },
      { label: 'Poupança', href: '/metas?tab=poupanca' },
    ],
  },
  { label: 'Relatórios', href: '/relatorios', icon: <BarChart3 className="h-4 w-4" /> },
  {
    label: 'Cadastros',
    icon: <FolderOpen className="h-4 w-4" />,
    children: [
      { label: 'Contas', href: '/cadastros/contas' },
      { label: 'Categorias', href: '/cadastros/categorias' },
    ],
  },
  {
    label: 'Configurações',
    icon: <Settings className="h-4 w-4" />,
    children: [
      { label: 'Regras Automáticas', href: '/configuracoes/regras' },
      { label: 'Tokens de API', href: '/configuracoes/tokens' },
    ],
  },
]

function NavItemComponent({ item }: { item: NavItem }) {
  const pathname = usePathname()
  const [open, setOpen] = useState(() =>
    item.children?.some((c) => pathname.startsWith(c.href.split('?')[0])) ?? false
  )

  if (item.children) {
    const isAnyChildActive = item.children.some((c) => pathname.startsWith(c.href.split('?')[0]))
    return (
      <div>
        <button
          onClick={() => setOpen(!open)}
          className={cn(
            'flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
            'text-slate-600 hover:bg-slate-100 hover:text-slate-900',
            'dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-white',
            (open || isAnyChildActive) && 'text-slate-900 dark:text-white'
          )}
        >
          {item.icon}
          <span className="flex-1 text-left">{item.label}</span>
          <ChevronDown className={cn('h-3 w-3 transition-transform', open && 'rotate-180')} />
        </button>
        {open && (
          <div className="ml-4 mt-1 space-y-0.5 border-l border-slate-200 pl-4 dark:border-slate-700">
            {item.children.map((child) => (
              <Link
                key={child.href}
                href={child.href}
                className={cn(
                  'block rounded-md px-2 py-1.5 text-sm transition-colors',
                  pathname === child.href.split('?')[0]
                    ? 'font-medium text-emerald-600 dark:text-emerald-400'
                    : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                )}
              >
                {child.label}
              </Link>
            ))}
          </div>
        )}
      </div>
    )
  }

  const active = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href!))

  return (
    <Link
      href={item.href!}
      className={cn(
        'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
        active
          ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400'
          : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-white'
      )}
    >
      {item.icon}
      {item.label}
    </Link>
  )
}

export function Sidebar() {
  return (
    <aside className="flex h-full w-60 flex-col border-r border-sidebar-border bg-sidebar">
      {/* Logo */}
      <div className="flex h-14 items-center gap-2.5 border-b border-sidebar-border px-4">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500 shadow-sm">
          <TrendingUp className="h-4 w-4 text-white" />
        </div>
        <span className="text-base font-bold text-slate-900 dark:text-white">Granify</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-0.5 overflow-y-auto p-3">
        {NAV.map((item) => (
          <NavItemComponent key={item.label} item={item} />
        ))}
      </nav>
    </aside>
  )
}
