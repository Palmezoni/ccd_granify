'use client'

import { useState, useEffect, useCallback } from 'react'
import { Plus, Pencil, Trash2, X, Target, PiggyBank, ChevronLeft, ChevronRight } from 'lucide-react'
import { cn, formatCurrency } from '@/lib/utils'

// ─── Types ────────────────────────────────────────────────────────────────────

type TipoMeta = 'DESPESA' | 'RECEITA'
type StatusMetaEco = 'EM_ANDAMENTO' | 'CONCLUIDA' | 'CANCELADA'

interface Categoria {
  id: string
  nome: string
  cor: string | null
  icone: string | null
  tipo: string
}

interface MetaOrcamento {
  id: string
  categoriaId: string | null
  categoria: Categoria | null
  tipo: TipoMeta
  valor: number
  mes: number
  ano: number
  realizado: number
  percentual: number
}

interface MetaEconomia {
  id: string
  nome: string
  valorAlvo: number
  valorAtual: number
  dataAlvo: string | null
  cor: string | null
  icone: string | null
  status: StatusMetaEco
  percentual: number
  totalAportes: number
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const MESES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
]

const EMOJIS_SUGERIDOS = ['🎯', '🏠', '✈️', '🚗', '📚', '💻', '🎮', '💍', '🏋️', '🌴', '💰', '🎓', '🏥', '🛍️', '🎨']
const CORES_SUGERIDAS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#6366f1']

function statusLabel(status: StatusMetaEco) {
  if (status === 'CONCLUIDA') return 'Concluída'
  if (status === 'CANCELADA') return 'Cancelada'
  return 'Em andamento'
}

function statusColor(status: StatusMetaEco) {
  if (status === 'CONCLUIDA') return 'text-emerald-600 dark:text-emerald-400'
  if (status === 'CANCELADA') return 'text-red-500'
  return 'text-slate-500 dark:text-slate-400'
}

// ─── Modal base ───────────────────────────────────────────────────────────────

function Modal({ open, onClose, title, children }: {
  open: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
}) {
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-base font-semibold text-slate-900 dark:text-white">{title}</h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-slate-600 dark:text-slate-400">{label}</label>
      {children}
    </div>
  )
}

const inputClass =
  'w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:text-white'

const btnPrimary =
  'flex items-center gap-1.5 rounded-lg bg-emerald-500 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-600 disabled:opacity-50'

const btnSecondary =
  'rounded-lg border border-border px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-800'

// ─── Tab: Orçamento ───────────────────────────────────────────────────────────

function TabOrcamento() {
  const now = new Date()
  const [mes, setMes] = useState(now.getMonth() + 1)
  const [ano, setAno] = useState(now.getFullYear())
  const [metas, setMetas] = useState<MetaOrcamento[]>([])
  const [categorias, setCategorias] = useState<Categoria[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<MetaOrcamento | null>(null)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)

  // Form state
  const [form, setForm] = useState({
    categoriaId: '',
    tipo: 'DESPESA' as TipoMeta,
    valor: '',
  })

  const fetchMetas = useCallback(async () => {
    setLoading(true)
    const res = await fetch(`/api/metas?mes=${mes}&ano=${ano}`)
    const json = await res.json()
    setMetas(json.data ?? [])
    setLoading(false)
  }, [mes, ano])

  const fetchCategorias = useCallback(async () => {
    const res = await fetch('/api/categorias')
    const json = await res.json()
    // Flatten cats and filhos into flat list
    const flat: Categoria[] = []
    for (const c of json.data ?? []) {
      flat.push(c)
      for (const f of c.filhos ?? []) flat.push(f)
    }
    setCategorias(flat)
  }, [])

  useEffect(() => { fetchMetas() }, [fetchMetas])
  useEffect(() => { fetchCategorias() }, [fetchCategorias])

  function openCreate() {
    setEditing(null)
    setForm({ categoriaId: '', tipo: 'DESPESA', valor: '' })
    setModalOpen(true)
  }

  function openEdit(m: MetaOrcamento) {
    setEditing(m)
    setForm({
      categoriaId: m.categoriaId ?? '',
      tipo: m.tipo,
      valor: String(m.valor),
    })
    setModalOpen(true)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      const body = {
        categoriaId: form.categoriaId || null,
        tipo: form.tipo,
        valor: parseFloat(form.valor),
        mes,
        ano,
      }

      if (editing) {
        await fetch(`/api/metas/${editing.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
      } else {
        await fetch('/api/metas', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
      }
      setModalOpen(false)
      fetchMetas()
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    setDeleting(id)
    await fetch(`/api/metas/${id}`, { method: 'DELETE' })
    setDeleting(null)
    fetchMetas()
  }

  function prevMes() {
    if (mes === 1) { setMes(12); setAno(ano - 1) }
    else setMes(mes - 1)
  }
  function nextMes() {
    if (mes === 12) { setMes(1); setAno(ano + 1) }
    else setMes(mes + 1)
  }

  const despesas = metas.filter((m) => m.tipo === 'DESPESA')
  const receitas = metas.filter((m) => m.tipo === 'RECEITA')
  const totalOrcadoDespesa = despesas.reduce((s, m) => s + m.valor, 0)
  const totalRealizadoDespesa = despesas.reduce((s, m) => s + m.realizado, 0)
  const pctGeral = totalOrcadoDespesa > 0 ? Math.round((totalRealizadoDespesa / totalOrcadoDespesa) * 100) : 0

  const filteredCats = categorias.filter((c) => {
    if (form.tipo === 'DESPESA') return c.tipo === 'DESPESA' || c.tipo === 'AMBOS'
    return c.tipo === 'RECEITA' || c.tipo === 'AMBOS'
  })

  return (
    <>
      {/* Header controls */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            onClick={prevMes}
            className="rounded-lg border border-border p-1.5 hover:bg-slate-50 dark:hover:bg-slate-800"
          >
            <ChevronLeft className="h-4 w-4 text-slate-500" />
          </button>
          <span className="min-w-[140px] text-center text-sm font-semibold text-slate-900 dark:text-white">
            {MESES[mes - 1]} {ano}
          </span>
          <button
            onClick={nextMes}
            className="rounded-lg border border-border p-1.5 hover:bg-slate-50 dark:hover:bg-slate-800"
          >
            <ChevronRight className="h-4 w-4 text-slate-500" />
          </button>
        </div>
        <button onClick={openCreate} className={btnPrimary}>
          <Plus className="h-4 w-4" /> Nova Meta
        </button>
      </div>

      {/* Summary card */}
      {metas.length > 0 && (
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex flex-wrap gap-6">
            <div>
              <p className="text-xs text-slate-500">Total Orçado (Despesas)</p>
              <p className="mt-0.5 text-lg font-bold text-slate-900 dark:text-white">
                {formatCurrency(totalOrcadoDespesa)}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Total Realizado</p>
              <p className={cn('mt-0.5 text-lg font-bold', totalRealizadoDespesa > totalOrcadoDespesa ? 'text-red-500' : 'text-emerald-600 dark:text-emerald-400')}>
                {formatCurrency(totalRealizadoDespesa)}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Situação Geral</p>
              <p className={cn('mt-0.5 text-lg font-bold', pctGeral > 100 ? 'text-red-500' : 'text-emerald-600 dark:text-emerald-400')}>
                {pctGeral}%
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Metas list */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800" />
          ))}
        </div>
      ) : metas.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-16 text-center">
          <Target className="mb-3 h-10 w-10 text-slate-300 dark:text-slate-600" />
          <p className="font-medium text-slate-500">Nenhuma meta de orçamento</p>
          <p className="mt-1 text-sm text-slate-400">Crie metas para controlar seus gastos por categoria</p>
          <button onClick={openCreate} className={cn(btnPrimary, 'mt-4')}>
            <Plus className="h-4 w-4" /> Nova Meta
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {receitas.length > 0 && (
            <div>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">Receitas</h3>
              <div className="space-y-3">
                {receitas.map((m) => <MetaOrcamentoCard key={m.id} meta={m} onEdit={openEdit} onDelete={handleDelete} deleting={deleting} />)}
              </div>
            </div>
          )}
          {despesas.length > 0 && (
            <div>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">Despesas</h3>
              <div className="space-y-3">
                {despesas.map((m) => <MetaOrcamentoCard key={m.id} meta={m} onEdit={openEdit} onDelete={handleDelete} deleting={deleting} />)}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modal criar/editar meta orçamento */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Editar Meta' : 'Nova Meta de Orçamento'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Field label="Tipo">
            <select
              className={inputClass}
              value={form.tipo}
              onChange={(e) => setForm({ ...form, tipo: e.target.value as TipoMeta, categoriaId: '' })}
            >
              <option value="DESPESA">Despesa</option>
              <option value="RECEITA">Receita</option>
            </select>
          </Field>

          <Field label="Categoria (opcional)">
            <select
              className={inputClass}
              value={form.categoriaId}
              onChange={(e) => setForm({ ...form, categoriaId: e.target.value })}
            >
              <option value="">Todas as categorias</option>
              {filteredCats.map((c) => (
                <option key={c.id} value={c.id}>{c.nome}</option>
              ))}
            </select>
          </Field>

          <Field label="Valor">
            <input
              type="number"
              step="0.01"
              min="0.01"
              placeholder="0,00"
              className={inputClass}
              value={form.valor}
              onChange={(e) => setForm({ ...form, valor: e.target.value })}
              required
            />
          </Field>

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" className={btnSecondary} onClick={() => setModalOpen(false)}>
              Cancelar
            </button>
            <button type="submit" className={btnPrimary} disabled={saving}>
              {saving ? 'Salvando...' : editing ? 'Salvar' : 'Criar'}
            </button>
          </div>
        </form>
      </Modal>
    </>
  )
}

function MetaOrcamentoCard({ meta, onEdit, onDelete, deleting }: {
  meta: MetaOrcamento
  onEdit: (m: MetaOrcamento) => void
  onDelete: (id: string) => void
  deleting: string | null
}) {
  const over = meta.realizado > meta.valor
  const pct = Math.min(meta.percentual, 100)

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          {meta.categoria?.cor && (
            <div
              className="h-8 w-8 shrink-0 rounded-lg flex items-center justify-center text-base"
              style={{ backgroundColor: meta.categoria.cor + '22', color: meta.categoria.cor }}
            >
              {meta.categoria.icone || meta.categoria.nome[0].toUpperCase()}
            </div>
          )}
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">
              {meta.categoria?.nome ?? 'Geral'}
            </p>
            <p className="text-xs text-slate-400">{meta.tipo === 'DESPESA' ? 'Despesa' : 'Receita'}</p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <span className={cn(
            'rounded-full px-2 py-0.5 text-xs font-semibold',
            over
              ? 'bg-red-100 text-red-600 dark:bg-red-950 dark:text-red-400'
              : 'bg-emerald-100 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400'
          )}>
            {meta.percentual}%
          </span>
          <button
            onClick={() => onEdit(meta)}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => onDelete(meta.id)}
            disabled={deleting === meta.id}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-500 disabled:opacity-40"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Progress bar */}
      <div className="mb-1.5 h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
        <div
          className={cn('h-full rounded-full transition-all', over ? 'bg-red-500' : 'bg-emerald-500')}
          style={{ width: `${pct}%` }}
        />
      </div>

      <div className="flex justify-between">
        <span className="text-xs text-slate-500">
          {formatCurrency(meta.realizado)} realizados
        </span>
        <span className="text-xs text-slate-500">
          meta: {formatCurrency(meta.valor)}
        </span>
      </div>
    </div>
  )
}

// ─── Tab: Poupança ────────────────────────────────────────────────────────────

function TabPoupanca() {
  const [metas, setMetas] = useState<MetaEconomia[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [aporteModal, setAporteModal] = useState<MetaEconomia | null>(null)
  const [editModal, setEditModal] = useState<MetaEconomia | null>(null)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)

  // Create form
  const [form, setForm] = useState({
    nome: '',
    valorAlvo: '',
    dataAlvo: '',
    cor: '#10b981',
    icone: '🎯',
  })

  // Edit form
  const [editForm, setEditForm] = useState({
    nome: '',
    valorAlvo: '',
    dataAlvo: '',
    cor: '',
    icone: '',
    status: 'EM_ANDAMENTO' as StatusMetaEco,
  })

  // Aporte form
  const [aporteForm, setAporteForm] = useState({
    valor: '',
    data: new Date().toISOString().split('T')[0],
    descricao: '',
  })

  const fetchMetas = useCallback(async () => {
    setLoading(true)
    const res = await fetch('/api/metas-economia')
    const json = await res.json()
    setMetas(json.data ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { fetchMetas() }, [fetchMetas])

  function openCreate() {
    setForm({ nome: '', valorAlvo: '', dataAlvo: '', cor: '#10b981', icone: '🎯' })
    setModalOpen(true)
  }

  function openEdit(m: MetaEconomia) {
    setEditForm({
      nome: m.nome,
      valorAlvo: String(m.valorAlvo),
      dataAlvo: m.dataAlvo ? new Date(m.dataAlvo).toISOString().split('T')[0] : '',
      cor: m.cor ?? '#10b981',
      icone: m.icone ?? '🎯',
      status: m.status,
    })
    setEditModal(m)
  }

  function openAporte(m: MetaEconomia) {
    setAporteForm({ valor: '', data: new Date().toISOString().split('T')[0], descricao: '' })
    setAporteModal(m)
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      await fetch('/api/metas-economia', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nome: form.nome,
          valorAlvo: parseFloat(form.valorAlvo),
          dataAlvo: form.dataAlvo || null,
          cor: form.cor,
          icone: form.icone,
        }),
      })
      setModalOpen(false)
      fetchMetas()
    } finally {
      setSaving(false)
    }
  }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault()
    if (!editModal) return
    setSaving(true)
    try {
      await fetch(`/api/metas-economia/${editModal.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nome: editForm.nome,
          valorAlvo: parseFloat(editForm.valorAlvo),
          dataAlvo: editForm.dataAlvo || null,
          cor: editForm.cor,
          icone: editForm.icone,
          status: editForm.status,
        }),
      })
      setEditModal(null)
      fetchMetas()
    } finally {
      setSaving(false)
    }
  }

  async function handleAporte(e: React.FormEvent) {
    e.preventDefault()
    if (!aporteModal) return
    setSaving(true)
    try {
      await fetch(`/api/metas-economia/${aporteModal.id}/aportes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          valor: parseFloat(aporteForm.valor),
          data: aporteForm.data,
          descricao: aporteForm.descricao || null,
        }),
      })
      setAporteModal(null)
      fetchMetas()
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    setDeleting(id)
    await fetch(`/api/metas-economia/${id}`, { method: 'DELETE' })
    setDeleting(null)
    fetchMetas()
  }

  const emAndamento = metas.filter((m) => m.status === 'EM_ANDAMENTO')
  const concluidas = metas.filter((m) => m.status === 'CONCLUIDA')
  const canceladas = metas.filter((m) => m.status === 'CANCELADA')

  return (
    <>
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">
          {emAndamento.length} meta{emAndamento.length !== 1 ? 's' : ''} ativa{emAndamento.length !== 1 ? 's' : ''}
        </p>
        <button onClick={openCreate} className={btnPrimary}>
          <Plus className="h-4 w-4" /> Nova Meta
        </button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-48 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800" />
          ))}
        </div>
      ) : metas.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-16 text-center">
          <PiggyBank className="mb-3 h-10 w-10 text-slate-300 dark:text-slate-600" />
          <p className="font-medium text-slate-500">Nenhuma meta de poupança</p>
          <p className="mt-1 text-sm text-slate-400">Crie metas para guardar dinheiro para objetivos específicos</p>
          <button onClick={openCreate} className={cn(btnPrimary, 'mt-4')}>
            <Plus className="h-4 w-4" /> Nova Meta
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {emAndamento.length > 0 && (
            <div>
              <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">Em andamento</h3>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {emAndamento.map((m) => (
                  <MetaEconomiaCard
                    key={m.id}
                    meta={m}
                    onAporte={openAporte}
                    onEdit={openEdit}
                    onDelete={handleDelete}
                    deleting={deleting}
                  />
                ))}
              </div>
            </div>
          )}
          {concluidas.length > 0 && (
            <div>
              <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">Concluídas</h3>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {concluidas.map((m) => (
                  <MetaEconomiaCard
                    key={m.id}
                    meta={m}
                    onAporte={openAporte}
                    onEdit={openEdit}
                    onDelete={handleDelete}
                    deleting={deleting}
                  />
                ))}
              </div>
            </div>
          )}
          {canceladas.length > 0 && (
            <div>
              <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">Canceladas</h3>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {canceladas.map((m) => (
                  <MetaEconomiaCard
                    key={m.id}
                    meta={m}
                    onAporte={openAporte}
                    onEdit={openEdit}
                    onDelete={handleDelete}
                    deleting={deleting}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modal criar */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Nova Meta de Poupança">
        <form onSubmit={handleCreate} className="space-y-4">
          <Field label="Nome">
            <input
              type="text"
              placeholder="Ex: Viagem, Reserva de emergência..."
              className={inputClass}
              value={form.nome}
              onChange={(e) => setForm({ ...form, nome: e.target.value })}
              required
            />
          </Field>

          <Field label="Valor Alvo">
            <input
              type="number"
              step="0.01"
              min="0.01"
              placeholder="0,00"
              className={inputClass}
              value={form.valorAlvo}
              onChange={(e) => setForm({ ...form, valorAlvo: e.target.value })}
              required
            />
          </Field>

          <Field label="Data Alvo (opcional)">
            <input
              type="date"
              className={inputClass}
              value={form.dataAlvo}
              onChange={(e) => setForm({ ...form, dataAlvo: e.target.value })}
            />
          </Field>

          <Field label="Ícone">
            <div className="flex flex-wrap gap-1.5">
              {EMOJIS_SUGERIDOS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => setForm({ ...form, icone: emoji })}
                  className={cn(
                    'rounded-lg p-1.5 text-lg transition-colors',
                    form.icone === emoji
                      ? 'bg-emerald-100 ring-2 ring-emerald-500 dark:bg-emerald-900'
                      : 'hover:bg-slate-100 dark:hover:bg-slate-800'
                  )}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </Field>

          <Field label="Cor">
            <div className="flex flex-wrap gap-1.5">
              {CORES_SUGERIDAS.map((cor) => (
                <button
                  key={cor}
                  type="button"
                  onClick={() => setForm({ ...form, cor })}
                  className={cn(
                    'h-7 w-7 rounded-full transition-transform',
                    form.cor === cor ? 'scale-125 ring-2 ring-offset-2 ring-slate-400' : 'hover:scale-110'
                  )}
                  style={{ backgroundColor: cor }}
                />
              ))}
            </div>
          </Field>

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" className={btnSecondary} onClick={() => setModalOpen(false)}>
              Cancelar
            </button>
            <button type="submit" className={btnPrimary} disabled={saving}>
              {saving ? 'Salvando...' : 'Criar'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal editar */}
      <Modal open={!!editModal} onClose={() => setEditModal(null)} title="Editar Meta">
        <form onSubmit={handleEdit} className="space-y-4">
          <Field label="Nome">
            <input
              type="text"
              className={inputClass}
              value={editForm.nome}
              onChange={(e) => setEditForm({ ...editForm, nome: e.target.value })}
              required
            />
          </Field>

          <Field label="Valor Alvo">
            <input
              type="number"
              step="0.01"
              min="0.01"
              className={inputClass}
              value={editForm.valorAlvo}
              onChange={(e) => setEditForm({ ...editForm, valorAlvo: e.target.value })}
              required
            />
          </Field>

          <Field label="Data Alvo (opcional)">
            <input
              type="date"
              className={inputClass}
              value={editForm.dataAlvo}
              onChange={(e) => setEditForm({ ...editForm, dataAlvo: e.target.value })}
            />
          </Field>

          <Field label="Status">
            <select
              className={inputClass}
              value={editForm.status}
              onChange={(e) => setEditForm({ ...editForm, status: e.target.value as StatusMetaEco })}
            >
              <option value="EM_ANDAMENTO">Em andamento</option>
              <option value="CONCLUIDA">Concluída</option>
              <option value="CANCELADA">Cancelada</option>
            </select>
          </Field>

          <Field label="Ícone">
            <div className="flex flex-wrap gap-1.5">
              {EMOJIS_SUGERIDOS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => setEditForm({ ...editForm, icone: emoji })}
                  className={cn(
                    'rounded-lg p-1.5 text-lg transition-colors',
                    editForm.icone === emoji
                      ? 'bg-emerald-100 ring-2 ring-emerald-500 dark:bg-emerald-900'
                      : 'hover:bg-slate-100 dark:hover:bg-slate-800'
                  )}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </Field>

          <Field label="Cor">
            <div className="flex flex-wrap gap-1.5">
              {CORES_SUGERIDAS.map((cor) => (
                <button
                  key={cor}
                  type="button"
                  onClick={() => setEditForm({ ...editForm, cor })}
                  className={cn(
                    'h-7 w-7 rounded-full transition-transform',
                    editForm.cor === cor ? 'scale-125 ring-2 ring-offset-2 ring-slate-400' : 'hover:scale-110'
                  )}
                  style={{ backgroundColor: cor }}
                />
              ))}
            </div>
          </Field>

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" className={btnSecondary} onClick={() => setEditModal(null)}>
              Cancelar
            </button>
            <button type="submit" className={btnPrimary} disabled={saving}>
              {saving ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal aporte */}
      <Modal open={!!aporteModal} onClose={() => setAporteModal(null)} title={`Aporte em "${aporteModal?.nome}"`}>
        <form onSubmit={handleAporte} className="space-y-4">
          {aporteModal && (
            <div className="rounded-lg bg-slate-50 px-4 py-3 dark:bg-slate-800">
              <div className="mb-2 flex justify-between text-xs text-slate-500">
                <span>Progresso atual</span>
                <span>{aporteModal.percentual}%</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
                <div
                  className="h-full rounded-full bg-emerald-500"
                  style={{ width: `${aporteModal.percentual}%` }}
                />
              </div>
              <div className="mt-1 flex justify-between text-xs text-slate-400">
                <span>{formatCurrency(aporteModal.valorAtual)}</span>
                <span>{formatCurrency(aporteModal.valorAlvo)}</span>
              </div>
            </div>
          )}

          <Field label="Valor">
            <input
              type="number"
              step="0.01"
              min="0.01"
              placeholder="0,00"
              className={inputClass}
              value={aporteForm.valor}
              onChange={(e) => setAporteForm({ ...aporteForm, valor: e.target.value })}
              required
            />
          </Field>

          <Field label="Data">
            <input
              type="date"
              className={inputClass}
              value={aporteForm.data}
              onChange={(e) => setAporteForm({ ...aporteForm, data: e.target.value })}
            />
          </Field>

          <Field label="Descrição (opcional)">
            <input
              type="text"
              placeholder="Ex: Transferência do salário..."
              className={inputClass}
              value={aporteForm.descricao}
              onChange={(e) => setAporteForm({ ...aporteForm, descricao: e.target.value })}
            />
          </Field>

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" className={btnSecondary} onClick={() => setAporteModal(null)}>
              Cancelar
            </button>
            <button type="submit" className={btnPrimary} disabled={saving}>
              {saving ? 'Registrando...' : 'Registrar Aporte'}
            </button>
          </div>
        </form>
      </Modal>
    </>
  )
}

function MetaEconomiaCard({ meta, onAporte, onEdit, onDelete, deleting }: {
  meta: MetaEconomia
  onAporte: (m: MetaEconomia) => void
  onEdit: (m: MetaEconomia) => void
  onDelete: (id: string) => void
  deleting: string | null
}) {
  const cor = meta.cor ?? '#10b981'
  const concluida = meta.status === 'CONCLUIDA'
  const cancelada = meta.status === 'CANCELADA'

  return (
    <div
      className={cn(
        'rounded-xl border bg-card p-5 transition-shadow hover:shadow-md',
        concluida ? 'border-emerald-300 dark:border-emerald-800' : 'border-border',
        cancelada ? 'opacity-60' : ''
      )}
    >
      {/* Header */}
      <div className="mb-4 flex items-start justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <div
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-xl"
            style={{ backgroundColor: cor + '22' }}
          >
            {meta.icone ?? '🎯'}
          </div>
          <div>
            <p className="font-semibold text-slate-900 dark:text-white">{meta.nome}</p>
            <p className={cn('text-xs', statusColor(meta.status))}>{statusLabel(meta.status)}</p>
          </div>
        </div>
        <div className="flex shrink-0 gap-1">
          <button
            onClick={() => onEdit(meta)}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => onDelete(meta.id)}
            disabled={deleting === meta.id}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-500 disabled:opacity-40"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Progress */}
      <div className="mb-1 flex justify-between text-xs text-slate-500">
        <span>{formatCurrency(meta.valorAtual)}</span>
        <span className="font-medium" style={{ color: cor }}>{meta.percentual}%</span>
      </div>
      <div className="mb-1 h-2.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${meta.percentual}%`, backgroundColor: cor }}
        />
      </div>
      <p className="mb-4 text-xs text-slate-400">
        de {formatCurrency(meta.valorAlvo)}
        {meta.dataAlvo && (
          <span className="ml-1">
            · prazo: {new Date(meta.dataAlvo).toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' })}
          </span>
        )}
      </p>

      {/* Aporte button */}
      {!cancelada && !concluida && (
        <button
          onClick={() => onAporte(meta)}
          className="w-full rounded-lg border border-emerald-300 px-3 py-2 text-xs font-semibold text-emerald-700 hover:bg-emerald-50 dark:border-emerald-800 dark:text-emerald-400 dark:hover:bg-emerald-950"
        >
          + Aporte
        </button>
      )}
      {concluida && (
        <div className="flex items-center justify-center gap-1.5 rounded-lg bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400">
          Meta concluida!
        </div>
      )}
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

type Tab = 'orcamento' | 'poupanca'

export default function MetasPage() {
  const [activeTab, setActiveTab] = useState<Tab>('orcamento')

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-xl font-bold text-slate-900 dark:text-white">Metas</h1>
        <p className="mt-0.5 text-sm text-slate-500">Gerencie orçamentos e objetivos de poupança</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-xl border border-border bg-slate-50 p-1 dark:bg-slate-900">
        {([
          { id: 'orcamento' as Tab, label: 'Orçamento', icon: Target },
          { id: 'poupanca' as Tab, label: 'Poupança', icon: PiggyBank },
        ] as const).map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={cn(
              'flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors',
              activeTab === id
                ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-800 dark:text-white'
                : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
            )}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'orcamento' ? <TabOrcamento /> : <TabPoupanca />}
    </div>
  )
}
