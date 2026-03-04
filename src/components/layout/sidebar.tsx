'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, ArrowLeftRight, FileText, CreditCard,
  Target, BarChart3, FolderOpen, Settings, ChevronDown,
  ChevronLeft, ChevronRight, ShieldCheck, PlusCircle, Wallet
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useState } from 'react'
import { useSidebar } from '@/components/providers/sidebar-provider'
import { useLanguage } from '@/components/providers/language-provider'

function GranifyLogo({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="32" height="32" rx="8" fill="var(--primary)" />
      <path
        d="M22 11C20.3 9.4 18.3 8.5 16 8.5C11.3 8.5 7.5 12.3 7.5 17C7.5 21.7 11.3 25.5 16 25.5C19.6 25.5 22.7 23.2 23.8 20H17V17H24.5V20"
        stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"
      />
      <polyline
        points="17.5,19 20,16.5 22,18 24.5,14.5"
        stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
      />
    </svg>
  )
}

function SectionHeader({ label }: { label: string }) {
  if (!label) return null
  return (
    <div className="mb-1 mt-4 px-2.5">
      <span className="text-[9px] font-bold tracking-[0.12em] uppercase text-muted-foreground/50">
        {label}
      </span>
    </div>
  )
}

interface NavItem {
  label: string
  href?: string
  icon: React.ReactNode
  children?: { label: string; href: string }[]
  section?: string
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
        <button
          title={item.label}
          className={cn(
            'flex w-full items-center justify-center rounded-lg p-2 transition-colors',
            isAnyChildActive
              ? 'bg-sidebar-accent text-sidebar-accent-foreground'
              : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
          )}
        >
          {item.icon}
        </button>
      )
    }

    return (
      <div>
        <button
          onClick={() => setOpen(!open)}
          className={cn(
            'flex w-full items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-sm font-medium transition-colors',
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
          <div className="ml-3.5 mt-0.5 space-y-0.5 border-l border-border pl-3.5">
            {item.children.map((child) => (
              <Link
                key={child.href}
                href={child.href}
                className={cn(
                  'block rounded-md px-2 py-1.5 text-sm transition-colors',
                  pathname === child.href.split('?')[0]
                    ? 'font-semibold text-primary'
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

  const active =
    pathname === item.href ||
    (item.href !== '/dashboard' && pathname.startsWith(item.href!))

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
        'flex items-center gap-2.5 rounded-lg transition-colors text-sm font-medium',
        active
          ? 'border-l-2 border-sidebar-primary bg-sidebar-accent pl-[9px] pr-2.5 py-1.5 text-sidebar-accent-foreground'
          : 'px-2.5 py-1.5 text-muted-foreground hover:bg-accent hover:text-accent-foreground'
      )}
    >
      {item.icon}
      {item.label}
    </Link>
  )
}

export function Sidebar({ isAdmin = false }: { isAdmin?: boolean }) {
  const { collapsed, toggle } = useSidebar()
  const { t } = useLanguage()

  const iconClass = 'h-[15px] w-[15px] flex-shrink-0'

  const sections: { sectionKey: string; items: NavItem[] }[] = [
    {
      sectionKey: 'section.main',
      items: [
        { label: t('nav.dashboard'), href: '/dashboard', icon: <LayoutDashboard className={iconClass} /> },
      ],
    },
    {
      sectionKey: 'section.movimentacoes',
      items: [
        {
          label: t('nav.movimentacoes'),
          icon: <ArrowLeftRight className={iconClass} />,
          children: [
            { label: t('nav.lancamentos'), href: '/movimentacoes/lancamentos' },
            { label: t('nav.fluxo'), href: '/fluxo-de-caixa' },
          ],
        },
        { label: t('nav.extrato'), href: '/extrato', icon: <FileText className={iconClass} /> },
      ],
    },
    {
      sectionKey: 'section.financeiro',
      items: [
        { label: t('nav.cartoes'), href: '/cartoes', icon: <CreditCard className={iconClass} /> },
        {
          label: t('nav.metas'),
          icon: <Target className={iconClass} />,
          children: [
            { label: t('nav.orcamento'), href: '/metas' },
            { label: t('nav.poupanca'), href: '/metas?tab=poupanca' },
          ],
        },
      ],
    },
    {
      sectionKey: 'section.relatorios',
      items: [
        { label: t('nav.relatorios'), href: '/relatorios', icon: <BarChart3 className={iconClass} /> },
      ],
    },
    {
      sectionKey: 'section.gerenciar',
      items: [
        {
          label: t('nav.cadastros'),
          icon: <FolderOpen className={iconClass} />,
          children: [
            { label: t('nav.contas'), href: '/cadastros/contas' },
            { label: t('nav.categorias'), href: '/cadastros/categorias' },
          ],
        },
        {
          label: t('nav.configuracoes'),
          icon: <Settings className={iconClass} />,
          children: [
            { label: t('nav.regras'), href: '/configuracoes/regras' },
            { label: t('nav.tokens'), href: '/configuracoes/tokens' },
            { label: t('nav.atalhos'), href: '/configuracoes/atalhos' },
          ],
        },
        ...(isAdmin ? [{ label: t('nav.admin'), href: '/admin', icon: <ShieldCheck className={iconClass} /> }] : []),
      ],
    },
  ]

  return (
    <aside
      className={cn(
        'relative flex h-full flex-col border-r border-sidebar-border bg-sidebar transition-all duration-200',
        collapsed ? 'w-16' : 'w-[234px]'
      )}
    >
      <div
        className={cn(
          'flex h-14 flex-shrink-0 items-center border-b border-sidebar-border',
          collapsed ? 'justify-center px-2' : 'gap-2.5 px-4'
        )}
      >
        <GranifyLogo size={28} />
        {!collapsed && (
          <span className="text-[15px] font-bold tracking-tight text-foreground font-heading">
            Granify
          </span>
        )}
      </div>

      <nav className={cn('flex-1 overflow-y-auto py-3', collapsed ? 'px-2' : 'px-2.5')}>
        {sections.map(({ sectionKey, items }) => (
          <div key={sectionKey}>
            {!collapsed && <SectionHeader label={t(sectionKey as any)} />}
            <div className="space-y-0.5">
              {items.map((item) => (
                <NavItemComponent key={item.label} item={item} collapsed={collapsed} />
              ))}
            </div>
          </div>
        ))}
      </nav>

      <div
        className={cn(
          'flex flex-shrink-0 border-t border-sidebar-border p-2',
          collapsed ? 'justify-center' : 'justify-end'
        )}
      >
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
