'use client'

import { useEffect, useState } from 'react'
import { Plus, Pencil, Trash2, FolderOpen, Loader2, X, ChevronRight } from 'lucide-react'

const TIPO_LABELS: Record<string, string> = {
  RECEITA: 'Receita', DESPESA: 'Despesa', AMBOS: 'Ambos',
}

const TIPO_COLORS: Record<string, string> = {
  RECEITA: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400',
  DESPESA: 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400',
  AMBOS: 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-400',
}

const CORES = ['#10b981', '#ef4444', '#3b82f6', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#64748b']

const ICONES = ['🏠', '🍔', '🚗', '💊', '📚', '🎬', '✈️', '👕', '💡', '📱', '💰', '🏦', '💼', '🎁', '⚡']

interface Categoria {
  id: string; nome: string; tipo: string; cor: string | null; icone: string | null
  paiId: string | null; filhos?: Categoria[]
}

const EMPTY_FORM = { nome: '', tipo: 'DESPESA', cor: '#ef4444', icone: '', paiId: '' }

export default function CategoriasPage() {
  const [categorias, setCategorias] = useState<Categoria[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Categoria | null>(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function load() {
    setLoading(true)
    const res = await fetch('/api/categorias')
    const data = await res.json()
    setCategorias(data.data || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  function openCreate(paiId?: string) {
    setEditing(null)
    setForm({ ...EMPTY_FORM, paiId: paiId || '' })
    setError('')
    setShowForm(true)
  }

  function openEdit(cat: Categoria) {
    setEditing(cat)
    setForm({ nome: cat.nome, tipo: cat.tipo, cor: cat.cor || '#ef4444', icone: cat.icone || '', paiId: cat.paiId || '' })
    setError('')
    setShowForm(true)
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')

    const payload = { ...form, paiId: form.paiId || null, icone: form.icone || null }

    const res = await fetch(editing ? `/api/categorias/${editing.id}` : '/api/categorias', {
      method: editing ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    const data = await res.json()

    if (!res.ok) { setError(data.error || 'Erro ao salvar'); setSaving(false); return }

    await load()
    setShowForm(false)
    setSaving(false)
  }

  async function handleDelete(id: string) {
    if (!confirm('Excluir esta categoria? As sub-categorias também serão excluídas.')) return
    await fetch(`/api/categorias/${id}`, { method: 'DELETE' })
    await load()
  }

  const allFlat = categorias.flatMap((c) => [c, ...(c.filhos || [])])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-end">
        <button
          onClick={() => openCreate()}
          className="flex items-center gap-2 rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-white shadow-sm shadow-emerald-500/30 transition hover:bg-emerald-600"
        >
          <Plus className="h-4 w-4" /> Adicionar categoria
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
        </div>
      ) : categorias.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-12 text-center dark:border-slate-700 dark:bg-slate-800">
          <FolderOpen className="mx-auto mb-3 h-10 w-10 text-slate-300 dark:text-slate-600" />
          <p className="text-sm font-medium text-slate-500">Nenhuma categoria cadastrada</p>
        </div>
      ) : (
        <div className="space-y-2">
          {categorias.map((cat) => (
            <div key={cat.id} className="overflow-hidden rounded-xl border border-border bg-card">
              {/* Categoria pai */}
              <div className="flex items-center justify-between px-4 py-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg text-base" style={{ backgroundColor: `${cat.cor}20` }}>
                    {cat.icone || <span style={{ color: cat.cor || '#64748b' }}>◆</span>}
                  </div>
                  <div>
                    <p className="font-medium text-slate-900 dark:text-white">{cat.nome}</p>
                    {cat.filhos && cat.filhos.length > 0 && (
                      <p className="text-xs text-slate-400">{cat.filhos.length} sub-categoria{cat.filhos.length !== 1 ? 's' : ''}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${TIPO_COLORS[cat.tipo]}`}>
                    {TIPO_LABELS[cat.tipo]}
                  </span>
                  <button
                    onClick={() => openCreate(cat.id)}
                    className="rounded-md px-2 py-1 text-xs text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-700"
                    title="Adicionar sub-categoria"
                  >
                    + Sub
                  </button>
                  <button onClick={() => openEdit(cat)} className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-700">
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button onClick={() => handleDelete(cat.id)} className="rounded-md p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              {/* Sub-categorias */}
              {cat.filhos && cat.filhos.length > 0 && (
                <div className="border-t border-border bg-slate-50 dark:bg-slate-800/50">
                  {cat.filhos.map((sub) => (
                    <div key={sub.id} className="flex items-center justify-between border-b border-border/50 px-4 py-2.5 last:border-0">
                      <div className="flex items-center gap-2.5 pl-4">
                        <ChevronRight className="h-3 w-3 text-slate-400" />
                        <div className="h-2 w-2 rounded-full" style={{ backgroundColor: sub.cor || cat.cor || '#64748b' }} />
                        <span className="text-sm text-slate-700 dark:text-slate-300">{sub.nome}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${TIPO_COLORS[sub.tipo]}`}>
                          {TIPO_LABELS[sub.tipo]}
                        </span>
                        <button onClick={() => openEdit(sub)} className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-700">
                          <Pencil className="h-3 w-3" />
                        </button>
                        <button onClick={() => handleDelete(sub.id)} className="rounded-md p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950">
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="font-semibold text-slate-900 dark:text-white">
                {editing ? 'Editar categoria' : form.paiId ? 'Nova sub-categoria' : 'Nova categoria'}
              </h2>
              <button onClick={() => setShowForm(false)} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700">
                <X className="h-4 w-4" />
              </button>
            </div>

            {error && (
              <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600 dark:border-red-800 dark:bg-red-950 dark:text-red-400">
                {error}
              </div>
            )}

            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Nome *</label>
                <input type="text" value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} required className="input-field" placeholder="Ex: Alimentação, Salário..." />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Tipo *</label>
                  <select value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value })} className="input-field">
                    <option value="DESPESA">Despesa</option>
                    <option value="RECEITA">Receita</option>
                    <option value="AMBOS">Ambos</option>
                  </select>
                </div>
                {!form.paiId && (
                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Categoria pai</label>
                    <select value={form.paiId} onChange={(e) => setForm({ ...form, paiId: e.target.value })} className="input-field">
                      <option value="">Nenhuma</option>
                      {categorias.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
                    </select>
                  </div>
                )}
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">Cor</label>
                <div className="flex flex-wrap gap-2">
                  {CORES.map((cor) => (
                    <button key={cor} type="button" onClick={() => setForm({ ...form, cor })}
                      className={`h-7 w-7 rounded-full transition ${form.cor === cor ? 'ring-2 ring-offset-2 ring-slate-400' : ''}`}
                      style={{ backgroundColor: cor }} />
                  ))}
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">Ícone</label>
                <div className="flex flex-wrap gap-1.5">
                  {ICONES.map((icone) => (
                    <button key={icone} type="button" onClick={() => setForm({ ...form, icone })}
                      className={`rounded-lg px-2 py-1 text-lg transition ${form.icone === icone ? 'bg-emerald-100 ring-1 ring-emerald-400 dark:bg-emerald-950' : 'hover:bg-slate-100 dark:hover:bg-slate-700'}`}>
                      {icone}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowForm(false)} className="flex-1 rounded-lg border border-border py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-700">
                  Cancelar
                </button>
                <button type="submit" disabled={saving} className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-emerald-500 py-2 text-sm font-semibold text-white transition hover:bg-emerald-600 disabled:opacity-60">
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
