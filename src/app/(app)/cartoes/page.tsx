'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

// ─── Types ────────────────────────────────────────────────────────────────────

type Bandeira = 'VISA' | 'MASTERCARD' | 'ELO' | 'AMEX' | 'HIPERCARD' | 'OUTROS'

interface FaturaAberta {
  id: string
  mes: number
  ano: number
  valorTotal: number
  status: 'ABERTA' | 'FECHADA' | 'PAGA'
}

interface CartaoCredito {
  id: string
  nome: string
  bandeira: Bandeira
  limite: number
  diaFechamento: number
  diaVencimento: number
  cor: string | null
  contaDebitoId: string | null
  ativa: boolean
  faturas: FaturaAberta[]
}

interface Conta {
  id: string
  nome: string
  tipo: string
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const BRL = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })

const BANDEIRAS: { value: Bandeira; label: string }[] = [
  { value: 'VISA', label: 'Visa' },
  { value: 'MASTERCARD', label: 'Mastercard' },
  { value: 'ELO', label: 'Elo' },
  { value: 'AMEX', label: 'American Express' },
  { value: 'HIPERCARD', label: 'Hipercard' },
  { value: 'OUTROS', label: 'Outros' },
]

const BANDEIRA_COLORS: Record<Bandeira, string> = {
  VISA: 'bg-blue-700',
  MASTERCARD: 'bg-red-600',
  ELO: 'bg-yellow-500',
  AMEX: 'bg-green-700',
  HIPERCARD: 'bg-red-700',
  OUTROS: 'bg-slate-600',
}

const BANDEIRA_SYMBOLS: Record<Bandeira, string> = {
  VISA: 'VISA',
  MASTERCARD: '●●',
  ELO: 'elo',
  AMEX: 'AMEX',
  HIPERCARD: 'HIPER',
  OUTROS: '★',
}

function getCardGradient(cor: string | null, bandeira: Bandeira): string {
  if (cor) {
    // Use provided hex color as basis for gradient
    return `background: linear-gradient(135deg, ${cor}dd, ${cor}88)`
  }
  const defaults: Record<Bandeira, string> = {
    VISA: 'linear-gradient(135deg, #1a1f5e, #2b5bdb)',
    MASTERCARD: 'linear-gradient(135deg, #b91c1c, #dc2626)',
    ELO: 'linear-gradient(135deg, #854d0e, #ca8a04)',
    AMEX: 'linear-gradient(135deg, #14532d, #16a34a)',
    HIPERCARD: 'linear-gradient(135deg, #7f1d1d, #dc2626)',
    OUTROS: 'linear-gradient(135deg, #1e293b, #475569)',
  }
  return defaults[bandeira]
}

// ─── Modal Form ───────────────────────────────────────────────────────────────

interface ModalFormProps {
  open: boolean
  onClose: () => void
  onSaved: () => void
  cartao?: CartaoCredito | null
  contas: Conta[]
}

function ModalForm({ open, onClose, onSaved, cartao, contas }: ModalFormProps) {
  const isEditing = Boolean(cartao)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [form, setForm] = useState({
    nome: '',
    bandeira: 'VISA' as Bandeira,
    limite: '',
    diaFechamento: '1',
    diaVencimento: '10',
    cor: '',
    contaDebitoId: '',
  })

  useEffect(() => {
    if (cartao) {
      setForm({
        nome: cartao.nome,
        bandeira: cartao.bandeira,
        limite: String(cartao.limite),
        diaFechamento: String(cartao.diaFechamento),
        diaVencimento: String(cartao.diaVencimento),
        cor: cartao.cor ?? '',
        contaDebitoId: cartao.contaDebitoId ?? '',
      })
    } else {
      setForm({
        nome: '',
        bandeira: 'VISA',
        limite: '',
        diaFechamento: '1',
        diaVencimento: '10',
        cor: '',
        contaDebitoId: '',
      })
    }
    setError(null)
  }, [cartao, open])

  if (!open) return null

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const payload = {
      nome: form.nome,
      bandeira: form.bandeira,
      limite: parseFloat(form.limite),
      diaFechamento: parseInt(form.diaFechamento),
      diaVencimento: parseInt(form.diaVencimento),
      cor: form.cor || null,
      contaDebitoId: form.contaDebitoId || null,
    }

    try {
      const url = isEditing ? `/api/cartoes/${cartao!.id}` : '/api/cartoes'
      const method = isEditing ? 'PUT' : 'POST'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erro ao salvar cartão')
      onSaved()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative z-10 w-full max-w-lg rounded-2xl bg-white p-8 shadow-2xl dark:bg-slate-800">
        <h2 className="mb-6 text-xl font-bold text-slate-800 dark:text-white">
          {isEditing ? 'Editar Cartão' : 'Novo Cartão de Crédito'}
        </h2>

        {error && (
          <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-300">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
              Nome do cartão
            </label>
            <input
              type="text"
              required
              placeholder="Ex: Nubank Platinum"
              value={form.nome}
              onChange={(e) => setForm({ ...form, nome: e.target.value })}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:border-slate-600 dark:bg-slate-700 dark:text-white"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
                Bandeira
              </label>
              <select
                value={form.bandeira}
                onChange={(e) => setForm({ ...form, bandeira: e.target.value as Bandeira })}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:border-slate-600 dark:bg-slate-700 dark:text-white"
              >
                {BANDEIRAS.map((b) => (
                  <option key={b.value} value={b.value}>
                    {b.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
                Limite (R$)
              </label>
              <input
                type="number"
                required
                min="0"
                step="0.01"
                placeholder="5000.00"
                value={form.limite}
                onChange={(e) => setForm({ ...form, limite: e.target.value })}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:border-slate-600 dark:bg-slate-700 dark:text-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
                Dia de fechamento
              </label>
              <input
                type="number"
                required
                min="1"
                max="31"
                value={form.diaFechamento}
                onChange={(e) => setForm({ ...form, diaFechamento: e.target.value })}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:border-slate-600 dark:bg-slate-700 dark:text-white"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
                Dia de vencimento
              </label>
              <input
                type="number"
                required
                min="1"
                max="31"
                value={form.diaVencimento}
                onChange={(e) => setForm({ ...form, diaVencimento: e.target.value })}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:border-slate-600 dark:bg-slate-700 dark:text-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
                Cor do cartão
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={form.cor || '#1a1f5e'}
                  onChange={(e) => setForm({ ...form, cor: e.target.value })}
                  className="h-9 w-12 cursor-pointer rounded border border-slate-200 dark:border-slate-600"
                />
                <input
                  type="text"
                  placeholder="#1a1f5e (opcional)"
                  value={form.cor}
                  onChange={(e) => setForm({ ...form, cor: e.target.value })}
                  className="flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:border-slate-600 dark:bg-slate-700 dark:text-white"
                />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
                Conta de débito
              </label>
              <select
                value={form.contaDebitoId}
                onChange={(e) => setForm({ ...form, contaDebitoId: e.target.value })}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:border-slate-600 dark:bg-slate-700 dark:text-white"
              >
                <option value="">Nenhuma</option>
                {contas.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nome}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="rounded-lg bg-emerald-500 px-5 py-2 text-sm font-medium text-white hover:bg-emerald-600 disabled:opacity-50"
            >
              {loading ? 'Salvando...' : isEditing ? 'Salvar alterações' : 'Criar cartão'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Credit Card Visual ────────────────────────────────────────────────────────

interface CardVisualProps {
  cartao: CartaoCredito
  onEdit: () => void
  onDelete: () => void
  onVerFaturas: () => void
}

function CardVisual({ cartao, onEdit, onDelete, onVerFaturas }: CardVisualProps) {
  const fatura = cartao.faturas[0]
  const usado = fatura ? Number(fatura.valorTotal) : 0
  const limite = Number(cartao.limite)
  const disponivel = limite - usado
  const percentualUsado = limite > 0 ? (usado / limite) * 100 : 0

  const cardStyle = {
    background: getCardGradient(cartao.cor, cartao.bandeira),
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Physical card */}
      <div
        className="relative h-48 w-full max-w-sm rounded-2xl p-6 text-white shadow-xl transition-transform hover:scale-[1.02]"
        style={cardStyle}
      >
        {/* Chip */}
        <div className="mb-4 h-8 w-12 rounded bg-yellow-300/80" />

        {/* Card name */}
        <div className="mb-2 text-lg font-bold tracking-wide">{cartao.nome}</div>

        {/* Bandeira */}
        <div className="absolute right-6 top-6 text-right">
          <span className="text-xl font-black tracking-widest opacity-90">
            {BANDEIRA_SYMBOLS[cartao.bandeira]}
          </span>
        </div>

        {/* Bottom info */}
        <div className="absolute bottom-5 left-6 right-6 flex items-end justify-between">
          <div className="text-xs opacity-75">
            <div>Fecha dia {cartao.diaFechamento}</div>
            <div>Vence dia {cartao.diaVencimento}</div>
          </div>
          <div className="text-right text-xs opacity-75">
            <div>Limite</div>
            <div className="text-sm font-semibold">{BRL.format(limite)}</div>
          </div>
        </div>

        {/* Decorative circles */}
        <div className="absolute -right-6 -top-6 h-32 w-32 rounded-full bg-white/5" />
        <div className="absolute -bottom-8 -right-8 h-40 w-40 rounded-full bg-white/5" />
      </div>

      {/* Info panel */}
      <div className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800">
        {/* Limit usage bar */}
        <div className="mb-3">
          <div className="mb-1 flex justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>Utilizado</span>
            <span>{percentualUsado.toFixed(0)}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700">
            <div
              className={`h-full rounded-full transition-all ${
                percentualUsado > 80 ? 'bg-red-500' : percentualUsado > 50 ? 'bg-amber-500' : 'bg-emerald-500'
              }`}
              style={{ width: `${Math.min(percentualUsado, 100)}%` }}
            />
          </div>
        </div>

        <div className="mb-4 grid grid-cols-2 gap-3">
          <div>
            <div className="text-xs text-slate-500 dark:text-slate-400">Fatura aberta</div>
            <div className="font-semibold text-slate-800 dark:text-white">
              {BRL.format(usado)}
            </div>
          </div>
          <div>
            <div className="text-xs text-slate-500 dark:text-slate-400">Disponível</div>
            <div className="font-semibold text-emerald-600 dark:text-emerald-400">
              {BRL.format(Math.max(disponivel, 0))}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={onVerFaturas}
            className="flex-1 rounded-lg bg-emerald-500 px-3 py-2 text-xs font-medium text-white hover:bg-emerald-600 transition-colors"
          >
            Ver Faturas
          </button>
          <button
            onClick={onEdit}
            className="rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-600 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700"
          >
            Editar
          </button>
          <button
            onClick={onDelete}
            className="rounded-lg border border-red-100 px-3 py-2 text-xs text-red-500 hover:bg-red-50 dark:border-red-900 dark:hover:bg-red-900/20"
          >
            Excluir
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CartoesPage() {
  const router = useRouter()
  const [cartoes, setCartoes] = useState<CartaoCredito[]>([])
  const [contas, setContas] = useState<Conta[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<CartaoCredito | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  async function fetchData() {
    setLoading(true)
    try {
      const [cartoesRes, contasRes] = await Promise.all([
        fetch('/api/cartoes'),
        fetch('/api/contas'),
      ])
      const cartoesData = await cartoesRes.json()
      const contasData = await contasRes.json()
      if (cartoesData.data) setCartoes(cartoesData.data)
      if (contasData.data) setContas(contasData.data)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  function handleEdit(cartao: CartaoCredito) {
    setEditing(cartao)
    setModalOpen(true)
  }

  function handleNew() {
    setEditing(null)
    setModalOpen(true)
  }

  function handleClose() {
    setModalOpen(false)
    setEditing(null)
  }

  function handleSaved() {
    handleClose()
    fetchData()
  }

  async function handleDelete(id: string) {
    setDeleteError(null)
    const res = await fetch(`/api/cartoes/${id}`, { method: 'DELETE' })
    const data = await res.json()
    if (!res.ok) {
      setDeleteError(data.error || 'Erro ao excluir cartão')
      return
    }
    setDeleteId(null)
    fetchData()
  }

  return (
    <div className="min-h-full">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Cartões de Crédito</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Gerencie seus cartões e faturas
          </p>
        </div>
        <button
          onClick={handleNew}
          className="flex items-center gap-2 rounded-xl bg-emerald-500 px-5 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-emerald-600 transition-colors"
        >
          <span className="text-lg leading-none">+</span>
          Novo Cartão
        </button>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-24">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent" />
        </div>
      ) : cartoes.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 py-24 dark:border-slate-700">
          <div className="mb-4 text-5xl">💳</div>
          <h3 className="mb-1 text-lg font-semibold text-slate-700 dark:text-white">
            Nenhum cartão cadastrado
          </h3>
          <p className="mb-6 text-sm text-slate-500 dark:text-slate-400">
            Adicione seu primeiro cartão de crédito para começar
          </p>
          <button
            onClick={handleNew}
            className="rounded-xl bg-emerald-500 px-6 py-2.5 text-sm font-medium text-white hover:bg-emerald-600"
          >
            + Novo Cartão
          </button>
        </div>
      ) : (
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {cartoes.map((cartao) => (
            <CardVisual
              key={cartao.id}
              cartao={cartao}
              onEdit={() => handleEdit(cartao)}
              onDelete={() => { setDeleteId(cartao.id); setDeleteError(null) }}
              onVerFaturas={() => router.push(`/cartoes/${cartao.id}/faturas`)}
            />
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      <ModalForm
        open={modalOpen}
        onClose={handleClose}
        onSaved={handleSaved}
        cartao={editing}
        contas={contas}
      />

      {/* Delete Confirmation Modal */}
      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60" onClick={() => setDeleteId(null)} />
          <div className="relative z-10 w-full max-w-sm rounded-2xl bg-white p-8 shadow-2xl dark:bg-slate-800">
            <h3 className="mb-2 text-lg font-bold text-slate-800 dark:text-white">
              Excluir cartão?
            </h3>
            <p className="mb-5 text-sm text-slate-500 dark:text-slate-400">
              Esta ação não pode ser desfeita. O cartão e suas faturas serão excluídos.
            </p>
            {deleteError && (
              <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-300">
                {deleteError}
              </div>
            )}
            <div className="flex gap-3">
              <button
                onClick={() => { setDeleteId(null); setDeleteError(null) }}
                className="flex-1 rounded-lg border border-slate-200 py-2 text-sm text-slate-600 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700"
              >
                Cancelar
              </button>
              <button
                onClick={() => handleDelete(deleteId)}
                className="flex-1 rounded-lg bg-red-500 py-2 text-sm font-medium text-white hover:bg-red-600"
              >
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
