'use client'

import { useEffect, useState } from 'react'
import { Clock, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react'

interface UsuarioLicenca {
  id: string
  name: string | null
  email: string
  planStatus: string
  trialEndsAt: string | null
}

export default function AdminLicencasPage() {
  const [usuarios, setUsuarios] = useState<UsuarioLicenca[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/admin/usuarios?limit=100')
      .then(r => r.json())
      .then(d => { setUsuarios(d.usuarios || []); setLoading(false) })
  }, [])

  const porStatus = {
    TRIAL: usuarios.filter(u => u.planStatus === 'TRIAL'),
    ACTIVE: usuarios.filter(u => u.planStatus === 'ACTIVE'),
    SUSPENDED: usuarios.filter(u => u.planStatus === 'SUSPENDED'),
    CANCELLED: usuarios.filter(u => u.planStatus === 'CANCELLED'),
  }

  const cards = [
    { label: 'Trial', count: porStatus.TRIAL.length, icon: Clock, color: 'bg-blue-500/10 text-blue-500', items: porStatus.TRIAL },
    { label: 'Ativos', count: porStatus.ACTIVE.length, icon: CheckCircle2, color: 'bg-green-500/10 text-green-600', items: porStatus.ACTIVE },
    { label: 'Suspensos', count: porStatus.SUSPENDED.length, icon: AlertTriangle, color: 'bg-amber-500/10 text-amber-600', items: porStatus.SUSPENDED },
    { label: 'Cancelados', count: porStatus.CANCELLED.length, icon: XCircle, color: 'bg-destructive/10 text-destructive', items: porStatus.CANCELLED },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Licencas e Planos</h1>
        <p className="text-sm text-muted-foreground">Status das licencas de todos os usuarios</p>
      </div>

      {loading ? (
        <div className="flex h-32 items-center justify-center">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          {cards.map(({ label, count, icon: Icon, color, items }) => (
            <div key={label} className="rounded-xl border border-border bg-card p-5">
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${color}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">{label}</p>
                    <p className="text-xs text-muted-foreground">{count} usuarios</p>
                  </div>
                </div>
              </div>
              {items.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhum usuario nesta categoria</p>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {items.map((u) => (
                    <div key={u.id} className="flex items-center justify-between rounded-lg bg-secondary/50 px-3 py-2">
                      <div>
                        <p className="text-xs font-medium text-foreground">{u.name || u.email}</p>
                        <p className="text-xs text-muted-foreground">{u.email}</p>
                      </div>
                      {u.trialEndsAt && label === 'Trial' && (
                        <span className="text-xs text-muted-foreground">
                          ate {new Date(u.trialEndsAt).toLocaleDateString('pt-BR')}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
