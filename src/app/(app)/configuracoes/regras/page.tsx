'use client'

import { useEffect, useState } from 'react'
import {
  Plus, Pencil, Trash2, Loader2, X, Search, SlidersHorizontal,
} from 'lucide-react'

interface Categoria {
  id: string
  nome: string
  cor: string | null
}

interface Conta {
  id: string
  nome: string
  cor: string | null
}

interface Regra {
  id: string
  texto: string
  categoriaId: string | null
  contaId: string | null
  descricao: string | null
  ativa: boolean
  createdAt: string
  categoria: Categoria | null
  conta: Conta | null
}

const EMPTY_FORM = {
  texto: '',
  categoriaId: '',
  contaId: '',
  descricao: '',
  ativa: true,
}

export default function RegrasPage() {
  const [regras, setRegras] = useState<Regra[]>([])
  const [categorias, setCategorias] = useState<Categoria[]>([])
  const [contas, setContas] = useState<Conta[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Regra | null>(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [togglingId, setTogglingId] = useState<string | null>(null)

  async function load() {
    setLoading(true)
    const [rRes, cRes, ctRes] = await Promise.all([
      fetch('/api/regras'),
      fetch('/api/categorias'),
      fetch('/api/contas'),
    ])
    const [rData, cData, ctData] = await Promise.all([
      rRes.json(),
      cRes.json(),
      ctRes.json(),
    ])
    setRegras(rData.data || [])

    // Flatten categorias (pai + filhos)
    const cats = (cData.data || []) as Array<Categoria & { filhos?: Categoria[] }>
    const flat: Categoria[] = []
    cats.forEach((c) => {
      flat.push(c)
      if (c.filhos) flat.push(...c.filhos)
    })
    setCategorias(flat)
    setContas(ctData.data || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  function openCreate() {
    setEditing(null)
    setForm(EMPTY_FORM)
    setError('')
    setShowForm(true)
  }

  function openEdit(regra: Regra) {
    setEditing(regra)
    setForm({
      texto: regra.texto,
      categoriaId: regra.categoriaId || '',
      contaId: regra.contaId || '',
      descricao: regra.descricao || '',
      ativa: regra.ativa,
    })
    setError('')
    setShowForm(true)
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')

    const payload = {
      texto: form.texto,
      categoriaId: form.categoriaId || null,
      contaId: form.contaId || null,
      descricao: form.descricao || null,
      ativa: form.ativa,
    }

    const res = await fetch(editing ? `/api/regras/${editing.id}` : '/api/regras', {
      method: editing ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    const data = await res.json()

    if (!res.ok) {
      setError(data.error || 'Erro ao salvar')
      setSaving(false)
      return
    }

    await load()
    setShowForm(false)
    setSaving(false)
  }

  async function handleDelete(id: string) {
    if (!confirm('Excluir esta regra?')) return
    await fetch(`/api/regras/${id}`, { method: 'DELETE' })
    await load()
  }

  async function handleToggle(regra: Regra) {
    setTogglingId(regra.id)
    await fetch(`/api/regras/${regra.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ativa: !regra.ativa }),
    })
    await load()
    setTogglingId(null)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">Regras de Preenchimento</h1>
          <p className="mt-0.5 text-sm text-slate-500">Configure regras para categorizar lançamentos automaticamente</p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-white shadow-sm shadow-emerald-500/30 transition hover:bg-emerald-600"
        >
          <Plus className="h-4 w-4" /> Nova Regra
        </button>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
        </div>
      ) : regras.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-14 text-center dark:border-slate-700 dark:bg-slate-800">
          <SlidersHorizontal className="mx-auto mb-3 h-10 w-10 text-slate-300 dark:text-slate-600" />
          <p className="text-sm font-medium text-slate-500">Nenhuma regra cadastrada</p>
          <p className="mt-1 text-xs text-slate-400">Adicione regras para categorizar lançamentos automaticamente.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border bg-card">
          {/* Table header */}
          <div className="hidden grid-cols-[2fr_1.5fr_1.5fr_1.5fr_auto_auto] gap-4 border-b border-border bg-slate-50 px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-slate-400 dark:bg-slate-800/60 sm:grid">
            <span className="flex items-center gap-1.5"><Search className="h-3 w-3" /> Texto</span>
            <span>Categoria</span>
            <span>Conta</span>
            <span>Substituir por</span>
            <span>Status</span>
            <span></span>
          </div>

          <div className="divide-y divide-border">
            {regras.map((regra) => (
              <div
                key={regra.id}
                className="grid grid-cols-1 gap-3 px-4 py-3.5 sm:grid-cols-[2fr_1.5fr_1.5fr_1.5fr_auto_auto] sm:items-center sm:gap-4"
              >
                {/* Texto */}
                <div className="flex items-center gap-2">
                  <Search className="hidden h-3.5 w-3.5 shrink-0 text-slate-400 sm:block" />
                  <span className="font-mono text-sm font-medium text-slate-800 dark:text-slate-100">
                    {regra.texto}
                  </span>
                </div>

                {/* Categoria */}
                <div className="flex items-center gap-2">
                  {regra.categoria ? (
                    <>
                      <span
                        className="h-2.5 w-2.5 shrink-0 rounded-full"
                        style={{ backgroundColor: regra.categoria.cor || '#64748b' }}
                      />
                      <span className="truncate text-sm text-slate-700 dark:text-slate-300">
                        {regra.categoria.nome}
                      </span>
                    </>
                  ) : (
                    <span className="text-sm text-slate-400">—</span>
                  )}
                </div>

                {/* Conta */}
                <div>
                  {regra.conta ? (
                    <span className="truncate text-sm text-slate-700 dark:text-slate-300">
                      {regra.conta.nome}
                    </span>
                  ) : (
                    <span className="text-sm text-slate-400">—</span>
                  )}
                </div>

                {/* Descrição substituta */}
                <div>
                  {regra.descricao ? (
                    <span className="truncate text-sm italic text-slate-600 dark:text-slate-400">
                      {regra.descricao}
                    </span>
                  ) : (
                    <span className="text-sm text-slate-400">—</span>
                  )}
                </div>

                {/* Toggle ativo */}
                <div className="flex items-center">
                  <button
                    onClick={() => handleToggle(regra)}
                    disabled={togglingId === regra.id}
                    className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none disabled:opacity-60 ${
                      regra.ativa ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600'
                    }`}
                    title={regra.ativa ? 'Desativar' : 'Ativar'}
                  >
                    <span
                      className={`pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow ring-0 transition-transform ${
                        regra.ativa ? 'translate-x-4' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => openEdit(regra)}
                    className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-700"
                    title="Editar"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => handleDelete(regra.id)}
                    className="rounded-md p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950"
                    title="Excluir"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-2xl border border-border bg-card p-6 shadow-2xl">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="font-semibold text-slate-900 dark:text-white">
                {editing ? 'Editar regra' : 'Nova regra de preenchimento'}
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
              {/* Texto a localizar */}
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
                  Texto a localizar na descrição *
                </label>
                <input
                  type="text"
                  value={form.texto}
                  onChange={(e) => setForm({ ...form, texto: e.target.value })}
                  required
                  minLength={2}
                  className="input-field"
                  placeholder="Ex: UBER, IFOOD, SALARIO..."
                />
                <p className="mt-1 text-xs text-slate-400">
                  A regra será aplicada quando este texto for encontrado na descrição do lançamento (sem diferença de maiúsculas).
                </p>
              </div>

              {/* Categoria */}
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
                  Atribuir categoria (opcional)
                </label>
                <select
                  value={form.categoriaId}
                  onChange={(e) => setForm({ ...form, categoriaId: e.target.value })}
                  className="input-field"
                >
                  <option value="">Nenhuma</option>
                  {categorias.map((c) => (
                    <option key={c.id} value={c.id}>{c.nome}</option>
                  ))}
                </select>
              </div>

              {/* Conta */}
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
                  Atribuir conta (opcional)
                </label>
                <select
                  value={form.contaId}
                  onChange={(e) => setForm({ ...form, contaId: e.target.value })}
                  className="input-field"
                >
                  <option value="">Nenhuma</option>
                  {contas.map((c) => (
                    <option key={c.id} value={c.id}>{c.nome}</option>
                  ))}
                </select>
              </div>

              {/* Substituir descrição */}
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
                  Substituir descrição por (opcional)
                </label>
                <input
                  type="text"
                  value={form.descricao}
                  onChange={(e) => setForm({ ...form, descricao: e.target.value })}
                  className="input-field"
                  placeholder="Ex: Transporte - Uber"
                />
              </div>

              {/* Ativa */}
              {editing && (
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="ativa"
                    checked={form.ativa}
                    onChange={(e) => setForm({ ...form, ativa: e.target.checked })}
                    className="h-4 w-4 rounded border-slate-300 text-emerald-500 focus:ring-emerald-500"
                  />
                  <label htmlFor="ativa" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    Regra ativa
                  </label>
                </div>
              )}

              <div className="flex gap-3 pt-2">
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
