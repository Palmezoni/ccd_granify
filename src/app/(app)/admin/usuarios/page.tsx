'use client'

import { useEffect, useState } from 'react'
import { Search, ChevronLeft, ChevronRight, Shield, ShieldOff, CheckCircle2, XCircle } from 'lucide-react'

interface Usuario {
  id: string
  name: string | null
  email: string
  role: string
  planStatus: string
  createdAt: string
  trialEndsAt: string | null
  _count: { lancamentos: number; contas: number }
}

interface ApiResponse {
  usuarios: Usuario[]
  total: number
  page: number
  totalPages: number
}

const STATUS_LABELS: Record<string, string> = {
  TRIAL: 'Trial', ACTIVE: 'Ativo', SUSPENDED: 'Suspenso', CANCELLED: 'Cancelado'
}
const STATUS_COLORS: Record<string, string> = {
  TRIAL: 'bg-blue-500/10 text-blue-500',
  ACTIVE: 'bg-green-500/10 text-green-600',
  SUSPENDED: 'bg-amber-500/10 text-amber-600',
  CANCELLED: 'bg-destructive/10 text-destructive',
}

export default function AdminUsuariosPage() {
  const [data, setData] = useState<ApiResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [updating, setUpdating] = useState<string | null>(null)

  async function load() {
    setLoading(true)
    const params = new URLSearchParams({ page: String(page), limit: '20', search })
    const res = await fetch(`/api/admin/usuarios?${params}`)
    const d = await res.json()
    setData(d)
    setLoading(false)
  }

  useEffect(() => { load() }, [page, search])

  async function toggleRole(id: string, currentRole: string) {
    setUpdating(id)
    const newRole = currentRole === 'ADMIN' ? 'USER' : 'ADMIN'
    await fetch(`/api/admin/usuarios/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role: newRole }),
    })
    await load()
    setUpdating(null)
  }

  async function toggleStatus(id: string, currentStatus: string) {
    setUpdating(id)
    const newStatus = currentStatus === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE'
    await fetch(`/api/admin/usuarios/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ planStatus: newStatus }),
    })
    await load()
    setUpdating(null)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Usuarios</h1>
          <p className="text-sm text-muted-foreground">
            {data ? `${data.total} usuarios cadastrados` : 'Carregando...'}
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(1) }}
          placeholder="Buscar por nome ou e-mail..."
          className="input-field w-full max-w-sm pl-9"
        />
      </div>

      {/* Table */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-secondary/40">
                <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Usuario</th>
                <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Plano</th>
                <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Dados</th>
                <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Cadastro</th>
                <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Acoes</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} className="py-12 text-center text-muted-foreground">Carregando...</td></tr>
              ) : data?.usuarios.length === 0 ? (
                <tr><td colSpan={5} className="py-12 text-center text-muted-foreground">Nenhum usuario encontrado</td></tr>
              ) : data?.usuarios.map(u => (
                <tr key={u.id} className="border-b border-border/50 hover:bg-accent/30 transition-colors">
                  <td className="px-4 py-3">
                    <div>
                      <p className="font-medium text-foreground">{u.name || '—'}</p>
                      <p className="text-xs text-muted-foreground">{u.email}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-col gap-1">
                      <span className={`inline-flex w-fit items-center rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[u.planStatus] || 'bg-secondary text-foreground'}`}>
                        {STATUS_LABELS[u.planStatus] || u.planStatus}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {u.role === 'ADMIN' ? 'Admin' : 'Usuario'}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {u._count.lancamentos} lancamentos &middot; {u._count.contas} contas
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {new Date(u.createdAt).toLocaleDateString('pt-BR')}
                    {u.trialEndsAt && (
                      <p>Trial ate {new Date(u.trialEndsAt).toLocaleDateString('pt-BR')}</p>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => toggleRole(u.id, u.role)}
                        disabled={updating === u.id}
                        title={u.role === 'ADMIN' ? 'Remover admin' : 'Tornar admin'}
                        className="rounded p-1 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors disabled:opacity-50"
                      >
                        {u.role === 'ADMIN' ? <ShieldOff className="h-4 w-4 text-amber-500" /> : <Shield className="h-4 w-4" />}
                      </button>
                      <button
                        onClick={() => toggleStatus(u.id, u.planStatus)}
                        disabled={updating === u.id}
                        title={u.planStatus === 'ACTIVE' ? 'Suspender' : 'Ativar'}
                        className="rounded p-1 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors disabled:opacity-50"
                      >
                        {u.planStatus === 'ACTIVE'
                          ? <XCircle className="h-4 w-4 text-destructive" />
                          : <CheckCircle2 className="h-4 w-4 text-green-500" />
                        }
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {data && data.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Pagina {data.page} de {data.totalPages}
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="flex items-center gap-1 rounded-lg border border-border bg-secondary px-3 py-1.5 text-sm text-foreground transition hover:bg-accent disabled:opacity-40"
            >
              <ChevronLeft className="h-4 w-4" /> Anterior
            </button>
            <button
              onClick={() => setPage(p => Math.min(data.totalPages, p + 1))}
              disabled={page === data.totalPages}
              className="flex items-center gap-1 rounded-lg border border-border bg-secondary px-3 py-1.5 text-sm text-foreground transition hover:bg-accent disabled:opacity-40"
            >
              Proximo <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
