'use client'

import Link from 'next/link'
import { Key, Zap, User, Bell, Shield } from 'lucide-react'

const CONFIG_ITEMS = [
  {
    icon: <Zap className="h-5 w-5" />,
    color: 'bg-amber-50 text-amber-600 dark:bg-amber-950 dark:text-amber-400',
    title: 'Regras Automáticas',
    description: 'Configure regras para categorizar lançamentos automaticamente com base no texto da descrição.',
    href: '/configuracoes/regras',
    label: 'Configurar regras',
  },
  {
    icon: <Key className="h-5 w-5" />,
    color: 'bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-400',
    title: 'Tokens de API',
    description: 'Gere tokens para integrar o Granify com outros sistemas e aplicações externas.',
    href: '/configuracoes/tokens',
    label: 'Gerenciar tokens',
  },
]

export default function ConfiguracoesPage() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {CONFIG_ITEMS.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="group rounded-xl border border-border bg-card p-5 transition hover:border-emerald-300 hover:shadow-sm dark:hover:border-emerald-700"
          >
            <div className={`mb-4 inline-flex rounded-lg p-2.5 ${item.color}`}>
              {item.icon}
            </div>
            <h3 className="font-semibold text-slate-900 dark:text-white">{item.title}</h3>
            <p className="mt-1 text-sm text-slate-500">{item.description}</p>
            <span className="mt-3 inline-block text-xs font-medium text-emerald-600 group-hover:underline dark:text-emerald-400">
              {item.label} →
            </span>
          </Link>
        ))}
      </div>
    </div>
  )
}
