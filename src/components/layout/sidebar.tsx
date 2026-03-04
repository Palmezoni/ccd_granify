'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, ArrowLeftRight, FileText, CreditCard,
  Target, BarChart3, FolderOpen, Settings, TrendingUp, ChevronDown,
  ChevronLeft, ChevronRight, ShieldCheck
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useState } from 'react'
import { useSidebar } from '@/components/providers/sidebar-provider'

interface NavItem {
  label: string
  href?: string
  icon: React.ReactNode
  children?: { label: string; href: string }[]
  adminOnly?: boolean
}

const NAV: NavItem[] = [
  { label: 'Dashboard', href: '/dashboard', icon: <LayoutDashboard className="h-4 w-4 flex-shrink-0" /> },
  {
    label: 'Movimentações',
    icon: <ArrowLeftRight className="h-4 w-4 flex-shrink-0" />,
    children: [
      { label: 'Lançamentos', href: '/movimentacoes/lancamentos' },
      { label: 'Fluxo de Caixa', href: '/fluxo-de-caixa' },
    ],
  },
  { label: 'Extrato', href: '/extrato', icon: <FileText className="h-4 w-4 flex-shrink-0" /> },
  { label: 'Cartões', href: '/cartoes', icon: <CreditCard className="h-4 w-4 flex-shrink-0" /> },
  {
    label: 'Metas',
    icon: <Target className="h-4 w-4 flex-shrink-0" />,
    children: [
      { label: 'Orçamento', href: '/metas' },
      { label: 'Poupança', href: '/metas?tab=poupanca' },
    ],
  },
  { label: 'Relatórios', href: '/relatorios', icon: <BarChart3 className="h-4 w-4 flex-shrink-0" /> },
  {
    label: 'Cadastros',
    icon: <FolderOpen className="h-4 w-4 flex-shrink-0" />,
    children: [
      { label: 'Contas', href: '/cadastros/contas' },
      { label: 'Categorias', href: '/cadastros/categorias' },
    ],
  },
  {
    label: 'Configurações',
    icon: <Settings className="h-4 w-4 flex-shrink-0" />,
    children: [
      { label: 'Regras Automáticas', href: '/configuracoes/regras' },
      { label: 'Tokens de API', href: '/configuracoes/tokens' },
    ],
  },
]

const ADMIN_NAV: NavItem = {
  label: 'Admin',
  href: '/admin',
  icon: <ShieldCheck className="h-4 w-4 flex-shrink-0" />,
  adminOnly: true,
}

function NavItemComponent({ item, collapsed }: { item: NavItem; collapsed: boolean }) {
  const pathname = usePathname()
  const [open, setOpen] = useState(() =>
    item.children?.some((c) => pathname.startsWith(c.href.split('?')[0])) ?? false
  )

  if (item.children) {
    const isAnyChildActive = item.children.some((c) => pathname.startsWith(c.href.split('?')[0]))

    if (collapsed) {
      return (
        <div title={item.label}>
          <button
            className={cn(
              'flex w-full items-center justify-center rounded-lg p-2 transition-colors',
              isAnyChildActive
                ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
            )}
          >
            {item.icon}
          </button>
        </div>
      )
    }

    return (
      <div>
        <button
          onClick={() => setOpen(!open)}
          className={cn(
            'flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
            isAnyChildActive
              ? 'text-foreground'
              : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
          )}
        >
          {item.icon}
          <span className="flex-1 text-left">{item.label}</span>
          <ChevronDown className={cn('h-3 w-3 transition-transform', open && 'rotate-180')} />
        </button>
        {open && (
          <div className="ml-4 mt-1 space-y-0.5 border-l border-border pl-4">
            {item.children.map((child) => (
              <Link
                key={child.href}
                href={child.href}
                className={cn(
                  'block rounded-md px-2 py-1.5 text-sm transition-colors',
                  pathname === child.href.split('?')[0]
                    ? 'font-medium text-primary'
                    : 'text-muted-foreground hover:text-foreground'
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

  if (collapsed) {
    return (
      <Link
        href={item.href!}
        title={item.label}
        className={cn(
          'flex items-center justify-center rounded-lg p-2 transition-colors',
          active
            ? 'bg-sidebar-accent text-sidebar-accent-foreground'
            : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
        )}
      >
        {item.icon}
      </Link>
    )
  }

  return (
    <Link
      href={item.href!}
      className={cn(
        'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
        active
          ? 'bg-sidebar-accent text-sidebar-accent-foreground'
          : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
      )}
    >
      {item.icon}
      {item.label}
    </Link>
  )
}

export function Sidebar({ isAdmin = false }: { isAdmin?: boolean }) {
  const { collapsed, toggle } = useSidebar()

  const allNav = isAdmin ? [...NAV, ADMIN_NAV] : NAV

  return (
    <aside
      className={cn(
        'relative flex h-full flex-col border-r border-sidebar-border bg-sidebar transition-all duration-300',
        collapsed ? 'w-16' : 'w-60'
      )}
    >
      {/* Logo */}
      <div className={cn(
        'flex h-14 items-center border-b border-sidebar-border',
        collapsed ? 'justify-center px-2' : 'gap-2.5 px-4'
      )}>
        <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-primary shadow-sm">
          <TrendingUp className="h-4 w-4 text-primary-foreground" />
        </div>
        {!collapsed && (
          <span className="text-base font-bold text-foreground">Granify</span>
        )}
      </div>

      {/* Nav */}
      <nav className={cn('flex-1 space-y-0.5 overflow-y-auto p-3', collapsed && 'flex flex-col items-center')}>
        {allNav.map((item) => (
          <NavItemComponent key={item.label} item={item} collapsed={collapsed} />
        ))}
      </nav>

      {/* Collapse toggle */}
      <div className={cn('border-t border-sidebar-border p-2', collapsed ? 'flex justify-center' : 'flex justify-end')}>
        <button
          onClick={toggle}
          className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground transition hover:bg-accent hover:text-accent-foreground"
          title={collapsed ? 'Expandir menu' : 'Recolher menu'}
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>
      </div>
    </aside>
  )
}
