'use client'

import { useEffect, useState } from 'react'
import { Users, TrendingUp, CreditCard, Activity, Shield, Database, UserPlus } from 'lucide-react'

interface Stats {
  totalUsuarios: number
  usuariosAtivos: number
  usuariosAdmin: number
  totalLancamentos: number
  totalContas: number
  totalCartoes: number
  novosUltimos30dias: number
}

function StatCard({ icon: Icon, label, value, color }: {
  icon: React.ElementType; label: string; value: number | string; color: string
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="mt-1 text-2xl font-bold text-foreground">{value}</p>
        </div>
        <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${color}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  )
}

export default function AdminPage() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/admin/stats')
      .then(r => r.json())
      .then(d => { setStats(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  if (loading) return (
    <div className="flex h-64 items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
    </div>
  )

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Painel Administrativo</h1>
        <p className="text-sm text-muted-foreground">Visao geral da plataforma Granify</p>
      </div>

      {stats && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard icon={Users} label="Total de usuarios" value={stats.totalUsuarios} color="bg-primary/10 text-primary" />
            <StatCard icon={Activity} label="Usuarios ativos" value={stats.usuariosAtivos} color="bg-green-500/10 text-green-500" />
            <StatCard icon={UserPlus} label="Novos (30 dias)" value={stats.novosUltimos30dias} color="bg-blue-500/10 text-blue-500" />
            <StatCard icon={Shield} label="Admins" value={stats.usuariosAdmin} color="bg-amber-500/10 text-amber-500" />
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <StatCard icon={TrendingUp} label="Total lancamentos" value={stats.totalLancamentos.toLocaleString('pt-BR')} color="bg-primary/10 text-primary" />
            <StatCard icon={Database} label="Total contas" value={stats.totalContas} color="bg-cyan-500/10 text-cyan-500" />
            <StatCard icon={CreditCard} label="Total cartoes" value={stats.totalCartoes} color="bg-purple-500/10 text-purple-500" />
          </div>

          <div className="rounded-xl border border-border bg-card p-5">
            <h2 className="mb-4 text-base font-semibold text-foreground">Acoes rapidas</h2>
            <div className="flex flex-wrap gap-3">
              <a href="/admin/usuarios" className="rounded-lg border border-border bg-secondary px-4 py-2 text-sm text-foreground transition hover:bg-accent">
                Gerenciar Usuarios
              </a>
              <a href="/admin/licencas" className="rounded-lg border border-border bg-secondary px-4 py-2 text-sm text-foreground transition hover:bg-accent">
                Licencas e Planos
              </a>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
