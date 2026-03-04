'use client'

import { useEffect, useState } from 'react'
import {
  Plus, Trash2, Loader2, X, KeyRound, Copy, Check, AlertTriangle, BookOpen,
} from 'lucide-react'

interface ApiToken {
  id: string
  nome: string
  escopo: string
  expiresAt: string | null
  lastUsedAt: string | null
  ativo: boolean
  createdAt: string
  token: string // masked on list, full on creation
}

const ESCOPO_LABELS: Record<string, string> = {
  read: 'Leitura',
  write: 'Escrita',
  full: 'Completo',
}

const ESCOPO_COLORS: Record<string, string> = {
  read: 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-400',
  write: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400',
  full: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400',
}

const EMPTY_FORM = { nome: '', escopo: 'read', expiresAt: '' }

function fmtDate(d: string | null) {
  if (!d) return 'Nunca'
  return new Date(d).toLocaleDateString('pt-BR')
}

export default function TokensPage() {
  const [tokens, setTokens] = useState<ApiToken[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [newToken, setNewToken] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [revokingId, setRevokingId] = useState<string | null>(null)

  async function load() {
    setLoading(true)
    const res = await fetch('/api/tokens')
    const data = await res.json()
    setTokens(data.data || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  function openCreate() {
    setForm(EMPTY_FORM)
    setError('')
    setNewToken(null)
    setCopied(false)
    setShowForm(true)
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')

    const payload = {
      nome: form.nome,
      escopo: form.escopo,
      expiresAt: form.expiresAt || null,
    }

    const res = await fetch('/api/tokens', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    const data = await res.json()

    if (!res.ok) {
      setError(data.error || 'Erro ao gerar token')
      setSaving(false)
      return
    }

    setNewToken(data.data.token)
    await load()
    setShowForm(false)
    setSaving(false)
  }

  async function handleRevoke(id: string) {
    if (!confirm('Revogar este token? Esta ação não pode ser desfeita.')) return
    setRevokingId(id)
    await fetch(`/api/tokens/${id}`, { method: 'DELETE' })
    await load()
    setRevokingId(null)
  }

  async function handleCopy(text: string) {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2500)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">Tokens de API</h1>
          <p className="mt-0.5 text-sm text-slate-500">Use tokens para integrar o Granify com outros sistemas</p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-white shadow-sm shadow-emerald-500/30 transition hover:bg-emerald-600"
        >
          <Plus className="h-4 w-4" /> Gerar Token
        </button>
      </div>

      {/* Novo token gerado - banner de exibição única */}
      {newToken && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 dark:border-amber-700 dark:bg-amber-950/40">
          <div className="mb-3 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">
              Copie este token agora! Ele não será exibido novamente.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <code className="flex-1 overflow-x-auto rounded-lg border border-amber-200 bg-white px-3 py-2 font-mono text-xs text-slate-800 dark:border-amber-800 dark:bg-slate-900 dark:text-slate-200">
              {newToken}
            </code>
            <button
              onClick={() => handleCopy(newToken)}
              className={`flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition ${
                copied
                  ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400'
                  : 'bg-amber-100 text-amber-800 hover:bg-amber-200 dark:bg-amber-900 dark:text-amber-300 dark:hover:bg-amber-800'
              }`}
            >
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              {copied ? 'Copiado!' : 'Copiar'}
            </button>
          </div>
          <button
            onClick={() => setNewToken(null)}
            className="mt-3 text-xs text-amber-600 hover:underline dark:text-amber-400"
          >
            Dispensar aviso
          </button>
        </div>
      )}

      {/* Documentação */}
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/50">
        <div className="mb-2 flex items-center gap-2">
          <BookOpen className="h-4 w-4 text-slate-500" />
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">Como usar os tokens</p>
        </div>
        <p className="mb-2 text-xs text-slate-500">
          Inclua o token no header de cada requisição à API do Granify:
        </p>
        <code className="block rounded-lg border border-slate-200 bg-white px-3 py-2 font-mono text-xs text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
          Authorization: Bearer SEU_TOKEN
        </code>
        <div className="mt-3 flex flex-wrap gap-4 text-xs text-slate-500">
          <span>
            <span className="font-semibold text-blue-600 dark:text-blue-400">leitura</span> — acesso somente leitura
          </span>
          <span>
            <span className="font-semibold text-amber-600 dark:text-amber-400">escrita</span> — criar e editar registros
          </span>
          <span>
            <span className="font-semibold text-emerald-600 dark:text-emerald-400">completo</span> — acesso total, incluindo exclusão
          </span>
        </div>
      </div>

      {/* Tabela de tokens */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
        </div>
      ) : tokens.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-14 text-center dark:border-slate-700 dark:bg-slate-800">
          <KeyRound className="mx-auto mb-3 h-10 w-10 text-slate-300 dark:text-slate-600" />
          <p className="text-sm font-medium text-slate-500">Nenhum token gerado</p>
          <p className="mt-1 text-xs text-slate-400">Gere um token para integrar o Granify com sistemas externos.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border bg-card">
          {/* Table header */}
          <div className="hidden grid-cols-[2fr_1fr_1.2fr_1.2fr_1.2fr_auto] gap-4 border-b border-border bg-slate-50 px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-slate-400 dark:bg-slate-800/60 md:grid">
            <span>Nome</span>
            <span>Escopo</span>
            <span>Criado em</span>
            <span>Último uso</span>
            <span>Expira em</span>
            <span></span>
          </div>

          <div className="divide-y divide-border">
            {tokens.map((token) => (
              <div
                key={token.id}
                className="grid grid-cols-1 gap-3 px-4 py-3.5 md:grid-cols-[2fr_1fr_1.2fr_1.2fr_1.2fr_auto] md:items-center md:gap-4"
              >
                {/* Nome + token mascarado */}
                <div>
                  <p className="font-medium text-slate-800 dark:text-slate-100">{token.nome}</p>
                  <p className="font-mono text-xs text-slate-400">{token.token}</p>
                </div>

                {/* Escopo */}
                <div>
                  <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${ESCOPO_COLORS[token.escopo] || ESCOPO_COLORS.read}`}>
                    {ESCOPO_LABELS[token.escopo] || token.escopo}
                  </span>
                </div>

                {/* Criado em */}
                <div className="text-sm text-slate-600 dark:text-slate-400">
                  {fmtDate(token.createdAt)}
                </div>

                {/* Último uso */}
                <div className="text-sm text-slate-600 dark:text-slate-400">
                  {fmtDate(token.lastUsedAt)}
                </div>

                {/* Expira em */}
                <div className="text-sm text-slate-600 dark:text-slate-400">
                  {token.expiresAt ? (
                    <span className={new Date(token.expiresAt) < new Date() ? 'text-red-500 dark:text-red-400' : ''}>
                      {fmtDate(token.expiresAt)}
                    </span>
                  ) : (
                    <span className="text-slate-400">Nunca</span>
                  )}
                </div>

                {/* Revogar */}
                <div className="flex items-center">
                  <button
                    onClick={() => handleRevoke(token.id)}
                    disabled={revokingId === token.id}
                    className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium text-red-500 transition hover:bg-red-50 hover:text-red-700 disabled:opacity-60 dark:hover:bg-red-950"
                    title="Revogar token"
                  >
                    {revokingId === token.id ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="h-3.5 w-3.5" />
                    )}
                    Revogar
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal criar token */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="font-semibold text-slate-900 dark:text-white">Gerar novo token</h2>
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
              {/* Nome */}
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
                  Nome do token *
                </label>
                <input
                  type="text"
                  value={form.nome}
                  onChange={(e) => setForm({ ...form, nome: e.target.value })}
                  required
                  className="input-field"
                  placeholder="Ex: Integração Zapier, Script de relatórios..."
                />
              </div>

              {/* Escopo */}
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
                  Escopo de acesso
                </label>
                <select
                  value={form.escopo}
                  onChange={(e) => setForm({ ...form, escopo: e.target.value })}
                  className="input-field"
                >
                  <option value="read">Leitura — somente consulta</option>
                  <option value="write">Escrita — criar e editar</option>
                  <option value="full">Completo — acesso total</option>
                </select>
              </div>

              {/* Expiração */}
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
                  Expiração (opcional)
                </label>
                <input
                  type="date"
                  value={form.expiresAt}
                  onChange={(e) => setForm({ ...form, expiresAt: e.target.value })}
                  min={new Date().toISOString().split('T')[0]}
                  className="input-field"
                />
                <p className="mt-1 text-xs text-slate-400">Deixe em branco para token sem expiração.</p>
              </div>

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
                  {saving ? 'Gerando...' : 'Gerar token'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
