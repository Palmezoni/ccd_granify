'use client'

import { useEffect, useState, useCallback } from 'react'
import {
  Plus, Pencil, Trash2, Loader2, X, Search, ChevronLeft, ChevronRight,
  TrendingUp, TrendingDown, ArrowLeftRight, Receipt,
} from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Categoria {
  id: string
  nome: string
  tipo: string
  cor: string | null
  icone: string | null
  filhos?: Categoria[]
}

interface Conta {
  id: string
  nome: string
  cor: string | null
}

interface Lancamento {
  id: string
  tipo: 'RECEITA' | 'DESPESA' | 'TRANSFERENCIA'
  descricao: string
  valor: number
  data: string
  status: 'CONFIRMADO' | 'PROJETADO' | 'CANCELADO'
  parcelas: number
  parcelaAtual: number
  observacao: string | null
  categoriaId: string | null
  contaId: string | null
  contaDestinoId: string | null
  categoria: { id: string; nome: string; cor: string | null; icone: string | null } | null
  conta: { id: string; nome: string; cor: string | null } | null
  contaDestino: { id: string; nome: string; cor: string | null } | null
}

interface Meta {
  total: number
  page: number
  limit: number
  pages: number
}

// ─── Constants ────────────────────────────────────────────────────────────────

const TIPO_LABELS = { RECEITA: 'Receita', DESPESA: 'Despesa', TRANSFERENCIA: 'Transferência' }
const STATUS_LABELS = { CONFIRMADO: 'Confirmado', PROJETADO: 'Projetado', CANCELADO: 'Cancelado' }

const TIPO_VALUE_COLORS = {
  RECEITA: 'text-emerald-600 dark:text-emerald-400',
  DESPESA: 'text-red-500 dark:text-red-400',
  TRANSFERENCIA: 'text-blue-600 dark:text-blue-400',
}

const TIPO_BADGE_COLORS = {
  RECEITA: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400',
  DESPESA: 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400',
  TRANSFERENCIA: 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-400',
}

const STATUS_BADGE_COLORS = {
  CONFIRMADO: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400',
  PROJETADO: 'bg-amber-50 text-amber-600 dark:bg-amber-950/50 dark:text-amber-400',
  CANCELADO: 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400',
}

const TIPO_ICONS = {
  RECEITA: <TrendingUp className="h-3.5 w-3.5" />,
  DESPESA: <TrendingDown className="h-3.5 w-3.5" />,
  TRANSFERENCIA: <ArrowLeftRight className="h-3.5 w-3.5" />,
}

const EMPTY_FORM = {
  tipo: 'DESPESA' as 'RECEITA' | 'DESPESA' | 'TRANSFERENCIA',
  descricao: '',
  valor: '',
  data: format(new Date(), 'yyyy-MM-dd'),
  categoriaId: '',
  contaId: '',
  contaDestinoId: '',
  status: 'CONFIRMADO' as 'CONFIRMADO' | 'PROJETADO' | 'CANCELADO',
  parcelas: '1',
  observacao: '',
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
}

function formatDateBR(dateStr: string) {
  const d = new Date(dateStr)
  // Adjust for timezone offset to avoid off-by-one day issues
  const adjusted = new Date(d.getTime() + d.getTimezoneOffset() * 60000)
  return format(adjusted, 'dd/MM/yyyy', { locale: ptBR })
}

function getMesAno() {
  const now = new Date()
  return { mes: String(now.getMonth() + 1), ano: String(now.getFullYear()) }
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function LancamentosPage() {
  const [lancamentos, setLancamentos] = useState<Lancamento[]>([])
  const [meta, setMeta] = useState<Meta>({ total: 0, page: 1, limit: 50, pages: 1 })
  const [categorias, setCategorias] = useState<Categoria[]>([])
  const [contas, setContas] = useState<Conta[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Lancamento | null>(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [deleting, setDeleting] = useState<string | null>(null)

  // Filters
  const { mes: defaultMes, ano: defaultAno } = getMesAno()
  const [filterTipo, setFilterTipo] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [filterMes, setFilterMes] = useState(defaultMes)
  const [filterAno, setFilterAno] = useState(defaultAno)
  const [filterSearch, setFilterSearch] = useState('')
  const [page, setPage] = useState(1)

  // ── Fetch data ──────────────────────────────────────────────────────────────

  const loadLancamentos = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams({ page: String(page), limit: '20' })
    if (filterTipo) params.set('tipo', filterTipo)
    if (filterStatus) params.set('status', filterStatus)
    if (filterMes) params.set('mes', filterMes)
    if (filterAno) params.set('ano', filterAno)
    if (filterSearch) params.set('search', filterSearch)

    const res = await fetch(`/api/lancamentos?${params}`)
    const json = await res.json()
    setLancamentos(json.data || [])
    setMeta(json.meta || { total: 0, page: 1, limit: 20, pages: 1 })
    setLoading(false)
  }, [page, filterTipo, filterStatus, filterMes, filterAno, filterSearch])

  useEffect(() => {
    loadLancamentos()
  }, [loadLancamentos])

  useEffect(() => {
    async function loadSelects() {
      const [catRes, contaRes] = await Promise.all([
        fetch('/api/categorias'),
        fetch('/api/contas'),
      ])
      const catJson = await catRes.json()
      const contaJson = await contaRes.json()
      setCategorias(catJson.data || [])
      setContas(contaJson.data || [])
    }
    loadSelects()
  }, [])

  // ── Form handlers ───────────────────────────────────────────────────────────

  function openCreate() {
    setEditing(null)
    setForm({ ...EMPTY_FORM, data: format(new Date(), 'yyyy-MM-dd') })
    setError('')
    setShowForm(true)
  }

  function openEdit(l: Lancamento) {
    setEditing(l)
    const d = new Date(l.data)
    const adjusted = new Date(d.getTime() + d.getTimezoneOffset() * 60000)
    setForm({
      tipo: l.tipo,
      descricao: l.descricao,
      valor: String(Number(l.valor)),
      data: format(adjusted, 'yyyy-MM-dd'),
      categoriaId: l.categoriaId || '',
      contaId: l.contaId || '',
      contaDestinoId: l.contaDestinoId || '',
      status: l.status,
      parcelas: String(l.parcelas),
      observacao: l.observacao || '',
    })
    setError('')
    setShowForm(true)
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')

    const payload = {
      tipo: form.tipo,
      descricao: form.descricao,
      valor: parseFloat(form.valor),
      data: form.data,
      categoriaId: form.categoriaId || null,
      contaId: form.contaId || null,
      contaDestinoId: form.contaDestinoId || null,
      status: form.status,
      parcelas: parseInt(form.parcelas, 10) || 1,
      observacao: form.observacao || null,
    }

    const url = editing ? `/api/lancamentos/${editing.id}` : '/api/lancamentos'
    const method = editing ? 'PUT' : 'POST'

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    const data = await res.json()

    if (!res.ok) {
      setError(data.error || 'Erro ao salvar')
      setSaving(false)
      return
    }

    await loadLancamentos()
    setShowForm(false)
    setSaving(false)
  }

  async function handleDelete(l: Lancamento) {
    const hasParcelas = l.parcelas > 1

    let deleteAll = false
    if (hasParcelas) {
      const choice = confirm(
        `Este lançamento tem ${l.parcelas} parcelas.\n\nClique OK para excluir TODAS as parcelas, ou Cancelar para excluir apenas esta.`
      )
      deleteAll = choice
    } else {
      if (!confirm('Excluir este lançamento?')) return
    }

    setDeleting(l.id)
    const params = deleteAll ? '?deleteAll=true' : ''
    await fetch(`/api/lancamentos/${l.id}${params}`, { method: 'DELETE' })
    await loadLancamentos()
    setDeleting(null)
  }

  // ── Derived state ───────────────────────────────────────────────────────────

  // Categorias filtered by tipo for the form
  const categoriasFiltradas = categorias.flatMap((c) => {
    const tipoForm = form.tipo === 'TRANSFERENCIA' ? null : form.tipo
    const matches = (t: string) => !tipoForm || t === tipoForm || t === 'AMBOS'
    const paiMatch = matches(c.tipo)
    const filhosMatch = (c.filhos || []).filter((f) => matches(f.tipo))
    if (!paiMatch && filhosMatch.length === 0) return []
    return [c, ...filhosMatch]
  })

  // Years for filter (current year ± 3)
  const currentYear = new Date().getFullYear()
  const anos = Array.from({ length: 7 }, (_, i) => currentYear - 3 + i)
  const meses = [
    { value: '1', label: 'Jan' }, { value: '2', label: 'Fev' },
    { value: '3', label: 'Mar' }, { value: '4', label: 'Abr' },
    { value: '5', label: 'Mai' }, { value: '6', label: 'Jun' },
    { value: '7', label: 'Jul' }, { value: '8', label: 'Ago' },
    { value: '9', label: 'Set' }, { value: '10', label: 'Out' },
    { value: '11', label: 'Nov' }, { value: '12', label: 'Dez' },
  ]

  const valorParcela = form.parcelas && parseInt(form.parcelas) > 1 && form.valor
    ? parseFloat(form.valor) / parseInt(form.parcelas)
    : null

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">Lançamentos</h1>
          <p className="mt-0.5 text-sm text-slate-500">
            {meta.total > 0 ? `${meta.total} lançamento${meta.total !== 1 ? 's' : ''}` : 'Nenhum lançamento'}
          </p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-white shadow-sm shadow-emerald-500/30 transition hover:bg-emerald-600"
        >
          <Plus className="h-4 w-4" /> Novo
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        {/* Search */}
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar..."
            value={filterSearch}
            onChange={(e) => { setFilterSearch(e.target.value); setPage(1) }}
            className="input-field pl-9"
          />
        </div>

        {/* Tipo */}
        <select
          value={filterTipo}
          onChange={(e) => { setFilterTipo(e.target.value); setPage(1) }}
          className="input-field w-auto"
        >
          <option value="">Todos os tipos</option>
          <option value="RECEITA">Receita</option>
          <option value="DESPESA">Despesa</option>
          <option value="TRANSFERENCIA">Transferência</option>
        </select>

        {/* Status */}
        <select
          value={filterStatus}
          onChange={(e) => { setFilterStatus(e.target.value); setPage(1) }}
          className="input-field w-auto"
        >
          <option value="">Todos os status</option>
          <option value="CONFIRMADO">Confirmado</option>
          <option value="PROJETADO">Projetado</option>
          <option value="CANCELADO">Cancelado</option>
        </select>

        {/* Mes */}
        <select
          value={filterMes}
          onChange={(e) => { setFilterMes(e.target.value); setPage(1) }}
          className="input-field w-auto"
        >
          <option value="">Todos os meses</option>
          {meses.map((m) => (
            <option key={m.value} value={m.value}>{m.label}</option>
          ))}
        </select>

        {/* Ano */}
        <select
          value={filterAno}
          onChange={(e) => { setFilterAno(e.target.value); setPage(1) }}
          className="input-field w-auto"
        >
          <option value="">Todos os anos</option>
          {anos.map((a) => (
            <option key={a} value={String(a)}>{a}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
        </div>
      ) : lancamentos.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-14 text-center dark:border-slate-700 dark:bg-slate-800">
          <Receipt className="mx-auto mb-3 h-10 w-10 text-slate-300 dark:text-slate-600" />
          <p className="text-sm font-medium text-slate-500">Nenhum lançamento encontrado</p>
          <button
            onClick={openCreate}
            className="mt-3 text-xs font-medium text-emerald-600 hover:underline dark:text-emerald-400"
          >
            Adicionar lançamento
          </button>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border bg-card">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-slate-50 dark:bg-slate-800/50">
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Data</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Descrição</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Categoria</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Conta</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Tipo</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">Valor</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Status</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {lancamentos.map((l) => (
                  <tr
                    key={l.id}
                    className="group cursor-pointer transition hover:bg-slate-50 dark:hover:bg-slate-800/40"
                    onClick={() => openEdit(l)}
                  >
                    <td className="whitespace-nowrap px-4 py-3 text-slate-500">
                      {formatDateBR(l.data)}
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-800 dark:text-slate-200">{l.descricao}</p>
                      {l.parcelas > 1 && (
                        <p className="text-xs text-slate-400">{l.parcelaAtual}/{l.parcelas} parcela{l.parcelas !== 1 ? 's' : ''}</p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {l.categoria ? (
                        <div className="flex items-center gap-1.5">
                          <div
                            className="h-2 w-2 shrink-0 rounded-full"
                            style={{ backgroundColor: l.categoria.cor || '#64748b' }}
                          />
                          <span className="text-slate-600 dark:text-slate-400">{l.categoria.nome}</span>
                        </div>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {l.tipo === 'TRANSFERENCIA' ? (
                        <span className="text-xs text-slate-500">
                          {l.conta?.nome ?? '—'} → {l.contaDestino?.nome ?? '—'}
                        </span>
                      ) : (
                        <span className="text-slate-600 dark:text-slate-400">{l.conta?.nome ?? '—'}</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${TIPO_BADGE_COLORS[l.tipo]}`}>
                        {TIPO_ICONS[l.tipo]}
                        {TIPO_LABELS[l.tipo]}
                      </span>
                    </td>
                    <td className={`whitespace-nowrap px-4 py-3 text-right font-semibold tabular-nums ${TIPO_VALUE_COLORS[l.tipo]}`}>
                      {l.tipo === 'DESPESA' ? '-' : l.tipo === 'RECEITA' ? '+' : ''}
                      {formatCurrency(Number(l.valor))}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_BADGE_COLORS[l.status]}`}>
                        {STATUS_LABELS[l.status]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div
                        className="flex items-center justify-end gap-1 opacity-0 transition group-hover:opacity-100"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          onClick={() => openEdit(l)}
                          className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-700"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(l)}
                          disabled={deleting === l.id}
                          className="rounded-md p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950 disabled:opacity-50"
                        >
                          {deleting === l.id
                            ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            : <Trash2 className="h-3.5 w-3.5" />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {meta.pages > 1 && (
            <div className="flex items-center justify-between border-t border-border px-4 py-3">
              <p className="text-xs text-slate-500">
                Página {meta.page} de {meta.pages} · {meta.total} registros
              </p>
              <div className="flex items-center gap-1">
                <button
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                  className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40 dark:hover:bg-slate-700"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  disabled={page >= meta.pages}
                  onClick={() => setPage((p) => p + 1)}
                  className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40 dark:hover:bg-slate-700"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modal Form */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4 pt-10">
          <div className="w-full max-w-lg rounded-2xl border border-border bg-card p-6 shadow-2xl">
            {/* Modal Header */}
            <div className="mb-5 flex items-center justify-between">
              <h2 className="font-semibold text-slate-900 dark:text-white">
                {editing ? 'Editar lançamento' : 'Novo lançamento'}
              </h2>
              <button
                onClick={() => setShowForm(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {error && (
              <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600 dark:border-red-800 dark:bg-red-950 dark:text-red-400">
                {error}
              </div>
            )}

            <form onSubmit={handleSave} className="space-y-4">
              {/* Tipo selector */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">Tipo *</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['RECEITA', 'DESPESA', 'TRANSFERENCIA'] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setForm({ ...form, tipo: t, categoriaId: '', contaDestinoId: '' })}
                      className={`flex items-center justify-center gap-1.5 rounded-lg border py-2 text-xs font-semibold transition ${
                        form.tipo === t
                          ? t === 'RECEITA'
                            ? 'border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400'
                            : t === 'DESPESA'
                            ? 'border-red-500 bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-400'
                            : 'border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-400'
                          : 'border-border text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-700'
                      }`}
                    >
                      {TIPO_ICONS[t]}
                      {TIPO_LABELS[t]}
                    </button>
                  ))}
                </div>
              </div>

              {/* Descrição */}
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Descrição *</label>
                <input
                  type="text"
                  value={form.descricao}
                  onChange={(e) => setForm({ ...form, descricao: e.target.value })}
                  required
                  placeholder="Ex: Supermercado, Salário..."
                  className="input-field"
                />
              </div>

              {/* Valor + Data */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Valor (R$) *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={form.valor}
                    onChange={(e) => setForm({ ...form, valor: e.target.value })}
                    required
                    placeholder="0,00"
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Data *</label>
                  <input
                    type="date"
                    value={form.data}
                    onChange={(e) => setForm({ ...form, data: e.target.value })}
                    required
                    className="input-field"
                  />
                </div>
              </div>

              {/* Parcelas (only for DESPESA, not editing) */}
              {form.tipo === 'DESPESA' && !editing && (
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
                    Parcelas
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="48"
                    value={form.parcelas}
                    onChange={(e) => setForm({ ...form, parcelas: e.target.value })}
                    className="input-field"
                  />
                  {valorParcela && valorParcela > 0 && parseInt(form.parcelas) > 1 && (
                    <p className="mt-1 text-xs text-slate-500">
                      {form.parcelas}x de {formatCurrency(valorParcela)}
                    </p>
                  )}
                </div>
              )}

              {/* Categoria (not for TRANSFERENCIA) */}
              {form.tipo !== 'TRANSFERENCIA' && (
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Categoria</label>
                  <select
                    value={form.categoriaId}
                    onChange={(e) => setForm({ ...form, categoriaId: e.target.value })}
                    className="input-field"
                  >
                    <option value="">Sem categoria</option>
                    {categoriasFiltradas.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.icone ? `${c.icone} ` : ''}{c.nome}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Conta origem */}
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
                  {form.tipo === 'TRANSFERENCIA' ? 'Conta origem *' : 'Conta'}
                </label>
                <select
                  value={form.contaId}
                  onChange={(e) => setForm({ ...form, contaId: e.target.value })}
                  required={form.tipo === 'TRANSFERENCIA'}
                  className="input-field"
                >
                  <option value="">Selecionar conta</option>
                  {contas.map((c) => (
                    <option key={c.id} value={c.id}>{c.nome}</option>
                  ))}
                </select>
              </div>

              {/* Conta destino (only for TRANSFERENCIA) */}
              {form.tipo === 'TRANSFERENCIA' && (
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Conta destino *</label>
                  <select
                    value={form.contaDestinoId}
                    onChange={(e) => setForm({ ...form, contaDestinoId: e.target.value })}
                    required
                    className="input-field"
                  >
                    <option value="">Selecionar conta destino</option>
                    {contas
                      .filter((c) => c.id !== form.contaId)
                      .map((c) => (
                        <option key={c.id} value={c.id}>{c.nome}</option>
                      ))}
                  </select>
                </div>
              )}

              {/* Status */}
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Status</label>
                <select
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value as 'CONFIRMADO' | 'PROJETADO' | 'CANCELADO' })}
                  className="input-field"
                >
                  <option value="CONFIRMADO">Confirmado</option>
                  <option value="PROJETADO">Projetado</option>
                  <option value="CANCELADO">Cancelado</option>
                </select>
              </div>

              {/* Observação */}
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Observação</label>
                <textarea
                  value={form.observacao}
                  onChange={(e) => setForm({ ...form, observacao: e.target.value })}
                  rows={2}
                  placeholder="Opcional..."
                  className="input-field resize-none"
                />
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="flex-1 rounded-lg border border-border py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-700"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-emerald-500 py-2 text-sm font-semibold text-white transition hover:bg-emerald-600 disabled:opacity-60"
                >
                  {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                  {saving ? 'Salvando...' : 'Salvar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
