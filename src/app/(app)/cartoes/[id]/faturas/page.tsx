'use client'

import { useEffect, useState, use } from 'react'
import Link from 'next/link'

// ─── Types ────────────────────────────────────────────────────────────────────

type StatusFatura = 'ABERTA' | 'FECHADA' | 'PAGA'

interface Lancamento {
  id: string
  descricao: string
  valor: number
  data: string
  tipo: string
  status: string
  categoria?: { nome: string; cor: string | null; icone: string | null } | null
  subCartao?: { nome: string | null; tipo: string } | null
}

interface Fatura {
  id: string
  mes: number
  ano: number
  valorTotal: number
  status: StatusFatura
  dataVencimento: string
  dataFechamento: string
  dataPagamento: string | null
  lancamentos: Lancamento[]
  conta?: { id: string; nome: string } | null
}

interface CartaoInfo {
  id: string
  nome: string
  bandeira: string
  cor: string | null
  limite: number
}

interface Conta {
  id: string
  nome: string
  tipo: string
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const BRL = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })

const MESES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
]

function fmtDate(dateStr: string): string {
  const d = new Date(dateStr)
  return d.toLocaleDateString('pt-BR')
}

function StatusBadge({ status }: { status: StatusFatura }) {
  const variants: Record<StatusFatura, string> = {
    ABERTA: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    FECHADA: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    PAGA: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  }
  const labels: Record<StatusFatura, string> = {
    ABERTA: 'Aberta',
    FECHADA: 'Fechada',
    PAGA: 'Paga',
  }
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${variants[status]}`}>
      {labels[status]}
    </span>
  )
}

// ─── Pay Modal ─────────────────────────────────────────────────────────────────

interface PagarModalProps {
  fatura: Fatura
  contas: Conta[]
  onClose: () => void
  onPaid: () => void
}

function PagarModal({ fatura, contas, onClose, onPaid }: PagarModalProps) {
  const [contaId, setContaId] = useState('')
  const [dataPagamento, setDataPagamento] = useState(new Date().toISOString().split('T')[0])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const res = await fetch(`/api/faturas/${fatura.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'pagar',
          dataPagamento,
          contaId: contaId || undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erro ao pagar fatura')
      onPaid()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md rounded-2xl bg-white p-8 shadow-2xl dark:bg-slate-800">
        <h3 className="mb-2 text-lg font-bold text-slate-800 dark:text-white">
          Pagar Fatura
        </h3>
        <p className="mb-6 text-sm text-slate-500 dark:text-slate-400">
          {MESES[fatura.mes - 1]}/{fatura.ano} — {BRL.format(fatura.valorTotal)}
        </p>

        {error && (
          <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-300">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
              Data do pagamento
            </label>
            <input
              type="date"
              value={dataPagamento}
              onChange={(e) => setDataPagamento(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:border-slate-600 dark:bg-slate-700 dark:text-white"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
              Conta de pagamento (opcional)
            </label>
            <select
              value={contaId}
              onChange={(e) => setContaId(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:border-slate-600 dark:bg-slate-700 dark:text-white"
            >
              <option value="">Sem conta específica</option>
              {contas.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nome}
                </option>
              ))}
            </select>
            {contaId && (
              <p className="mt-1 text-xs text-slate-400">
                Um lançamento de despesa será criado nessa conta
              </p>
            )}
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-lg border border-slate-200 py-2 text-sm text-slate-600 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 rounded-lg bg-emerald-500 py-2 text-sm font-medium text-white hover:bg-emerald-600 disabled:opacity-50"
            >
              {loading ? 'Processando...' : 'Confirmar Pagamento'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Lancamentos Table ─────────────────────────────────────────────────────────

function LancamentosTable({ lancamentos }: { lancamentos: Lancamento[] }) {
  if (lancamentos.length === 0) {
    return (
      <div className="rounded-xl border border-slate-100 bg-slate-50 py-10 text-center dark:border-slate-700 dark:bg-slate-800/50">
        <p className="text-sm text-slate-400">Nenhum lançamento nesta fatura</p>
      </div>
    )
  }

  return (
    <div className="overflow-hidden rounded-xl border border-slate-100 dark:border-slate-700">
      <table className="w-full text-sm">
        <thead className="bg-slate-50 dark:bg-slate-800">
          <tr>
            <th className="px-4 py-3 text-left font-medium text-slate-500 dark:text-slate-400">Data</th>
            <th className="px-4 py-3 text-left font-medium text-slate-500 dark:text-slate-400">Descrição</th>
            <th className="px-4 py-3 text-left font-medium text-slate-500 dark:text-slate-400">Categoria</th>
            <th className="px-4 py-3 text-right font-medium text-slate-500 dark:text-slate-400">Valor</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
          {lancamentos.map((l) => (
            <tr key={l.id} className="bg-white hover:bg-slate-50 dark:bg-slate-900 dark:hover:bg-slate-800">
              <td className="whitespace-nowrap px-4 py-3 text-slate-500 dark:text-slate-400">
                {fmtDate(l.data)}
              </td>
              <td className="px-4 py-3 text-slate-800 dark:text-slate-100">
                <div>{l.descricao}</div>
                {l.subCartao && (
                  <div className="text-xs text-slate-400">
                    {l.subCartao.tipo === 'ADICIONAL' ? 'Cartão adicional' : l.subCartao.tipo.toLowerCase()}
                    {l.subCartao.nome ? ` — ${l.subCartao.nome}` : ''}
                  </div>
                )}
              </td>
              <td className="px-4 py-3">
                {l.categoria ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600 dark:bg-slate-700 dark:text-slate-300">
                    {l.categoria.icone && <span>{l.categoria.icone}</span>}
                    {l.categoria.nome}
                  </span>
                ) : (
                  <span className="text-slate-400">—</span>
                )}
              </td>
              <td className="whitespace-nowrap px-4 py-3 text-right font-medium text-slate-800 dark:text-white">
                {BRL.format(Number(l.valor))}
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot className="bg-slate-50 dark:bg-slate-800">
          <tr>
            <td colSpan={3} className="px-4 py-3 text-right text-sm font-semibold text-slate-700 dark:text-slate-300">
              Total
            </td>
            <td className="whitespace-nowrap px-4 py-3 text-right text-sm font-bold text-slate-800 dark:text-white">
              {BRL.format(lancamentos.filter(l => l.status !== 'CANCELADO').reduce((s, l) => s + Number(l.valor), 0))}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  )
}

// ─── Fatura Row ────────────────────────────────────────────────────────────────

interface FaturaRowProps {
  fatura: Fatura
  expanded: boolean
  onToggle: () => void
  onAction: (action: 'fechar' | 'reabrir' | 'pagar') => void
  actionLoading: boolean
}

function FaturaRow({ fatura, expanded, onToggle, onAction, actionLoading }: FaturaRowProps) {
  return (
    <div className="overflow-hidden rounded-xl border border-slate-100 bg-white shadow-sm transition-shadow hover:shadow-md dark:border-slate-700 dark:bg-slate-900">
      {/* Header row */}
      <div className="flex items-center gap-4 p-4">
        <button
          onClick={onToggle}
          className="flex flex-1 items-center gap-4 text-left"
        >
          {/* Month */}
          <div className="min-w-[80px]">
            <div className="font-semibold text-slate-800 dark:text-white">
              {MESES[fatura.mes - 1]}
            </div>
            <div className="text-xs text-slate-400">{fatura.ano}</div>
          </div>

          {/* Total */}
          <div className="flex-1">
            <div className="text-lg font-bold text-slate-800 dark:text-white">
              {BRL.format(fatura.valorTotal)}
            </div>
            <div className="text-xs text-slate-400">
              Vence {fmtDate(fatura.dataVencimento)}
            </div>
          </div>

          {/* Status */}
          <StatusBadge status={fatura.status} />

          {/* Expand indicator */}
          <span className={`text-slate-400 transition-transform ${expanded ? 'rotate-180' : ''}`}>
            ▼
          </span>
        </button>

        {/* Action buttons */}
        <div className="flex items-center gap-2">
          {fatura.status === 'ABERTA' && (
            <button
              onClick={() => onAction('fechar')}
              disabled={actionLoading}
              className="rounded-lg border border-blue-200 px-3 py-1.5 text-xs font-medium text-blue-600 hover:bg-blue-50 disabled:opacity-50 dark:border-blue-800 dark:text-blue-400 dark:hover:bg-blue-900/20"
            >
              Fechar
            </button>
          )}
          {fatura.status === 'FECHADA' && (
            <>
              <button
                onClick={() => onAction('pagar')}
                disabled={actionLoading}
                className="rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-600 disabled:opacity-50"
              >
                Pagar
              </button>
              <button
                onClick={() => onAction('reabrir')}
                disabled={actionLoading}
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs text-slate-500 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-600 dark:hover:bg-slate-800"
              >
                Reabrir
              </button>
            </>
          )}
          {fatura.status === 'PAGA' && (
            <button
              onClick={() => onAction('reabrir')}
              disabled={actionLoading}
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs text-slate-500 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-600 dark:hover:bg-slate-800"
            >
              Reabrir
            </button>
          )}
        </div>
      </div>

      {/* Payment info */}
      {fatura.status === 'PAGA' && fatura.dataPagamento && (
        <div className="border-t border-slate-100 bg-emerald-50 px-4 py-2 text-xs text-emerald-700 dark:border-slate-700 dark:bg-emerald-900/20 dark:text-emerald-400">
          Paga em {fmtDate(fatura.dataPagamento)}
          {fatura.conta && ` via ${fatura.conta.nome}`}
        </div>
      )}

      {/* Expanded lancamentos */}
      {expanded && (
        <div className="border-t border-slate-100 p-4 dark:border-slate-700">
          <LancamentosTable lancamentos={fatura.lancamentos} />
        </div>
      )}
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function FaturasPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: cartaoId } = use(params)

  const [cartao, setCartao] = useState<CartaoInfo | null>(null)
  const [faturas, setFaturas] = useState<Fatura[]>([])
  const [contas, setContas] = useState<Conta[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState(false)
  const [pagarFatura, setPagarFatura] = useState<Fatura | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  async function fetchAll() {
    setLoading(true)
    try {
      const [cartaoRes, faturasRes, contasRes] = await Promise.all([
        fetch(`/api/cartoes/${cartaoId}`),
        fetch(`/api/cartoes/${cartaoId}/faturas`),
        fetch('/api/contas'),
      ])

      const cartaoData = await cartaoRes.json()
      const faturasData = await faturasRes.json()
      const contasData = await contasRes.json()

      if (cartaoData.data) {
        const c = cartaoData.data
        setCartao({ id: c.id, nome: c.nome, bandeira: c.bandeira, cor: c.cor, limite: Number(c.limite) })
      }
      if (faturasData.data) setFaturas(faturasData.data)
      if (contasData.data) setContas(contasData.data)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAll()
  }, [cartaoId])

  async function handleAction(faturaId: string, action: 'fechar' | 'reabrir' | 'pagar') {
    setActionError(null)

    if (action === 'pagar') {
      const f = faturas.find((f) => f.id === faturaId)
      if (f) setPagarFatura(f)
      return
    }

    setActionLoading(true)
    try {
      const res = await fetch(`/api/faturas/${faturaId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erro ao executar ação')
      await fetchAll()
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Erro')
    } finally {
      setActionLoading(false)
    }
  }

  async function handlePaid() {
    setPagarFatura(null)
    await fetchAll()
  }

  function toggleExpand(id: string) {
    setExpandedId(expandedId === id ? null : id)
  }

  return (
    <div className="min-h-full">
      {/* Breadcrumb */}
      <nav className="mb-6 flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
        <Link href="/cartoes" className="hover:text-emerald-600 dark:hover:text-emerald-400">
          Cartões
        </Link>
        <span>/</span>
        <span className="font-medium text-slate-700 dark:text-slate-300">
          {cartao?.nome ?? '...'}
        </span>
        <span>/</span>
        <span className="font-medium text-slate-800 dark:text-white">Faturas</span>
      </nav>

      {/* Header */}
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white">
            {cartao ? `Faturas — ${cartao.nome}` : 'Faturas'}
          </h1>
          {cartao && (
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              {cartao.bandeira} · Limite {BRL.format(cartao.limite)}
            </p>
          )}
        </div>

        <Link
          href="/cartoes"
          className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700"
        >
          Voltar
        </Link>
      </div>

      {/* Error */}
      {actionError && (
        <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-300">
          {actionError}
          <button className="ml-2 underline" onClick={() => setActionError(null)}>Fechar</button>
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-24">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent" />
        </div>
      ) : faturas.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 py-24 dark:border-slate-700">
          <div className="mb-4 text-4xl">📋</div>
          <h3 className="mb-1 text-lg font-semibold text-slate-700 dark:text-white">
            Nenhuma fatura encontrada
          </h3>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            As faturas aparecem aqui quando há lançamentos neste cartão
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {/* Summary row */}
          <div className="mb-6 grid grid-cols-3 gap-4">
            {(['ABERTA', 'FECHADA', 'PAGA'] as StatusFatura[]).map((s) => {
              const count = faturas.filter((f) => f.status === s).length
              const total = faturas.filter((f) => f.status === s).reduce((acc, f) => acc + f.valorTotal, 0)
              const colors: Record<StatusFatura, string> = {
                ABERTA: 'border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-900/20',
                FECHADA: 'border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-900/20',
                PAGA: 'border-emerald-200 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-900/20',
              }
              const textColors: Record<StatusFatura, string> = {
                ABERTA: 'text-amber-700 dark:text-amber-400',
                FECHADA: 'text-blue-700 dark:text-blue-400',
                PAGA: 'text-emerald-700 dark:text-emerald-400',
              }
              const labels: Record<StatusFatura, string> = { ABERTA: 'Abertas', FECHADA: 'Fechadas', PAGA: 'Pagas' }
              return (
                <div key={s} className={`rounded-xl border p-4 ${colors[s]}`}>
                  <div className={`text-xs font-medium ${textColors[s]}`}>{labels[s]}</div>
                  <div className={`text-xl font-bold ${textColors[s]}`}>{count}</div>
                  <div className={`text-sm ${textColors[s]} opacity-80`}>{BRL.format(total)}</div>
                </div>
              )
            })}
          </div>

          {/* Fatura list */}
          {faturas.map((fatura) => (
            <FaturaRow
              key={fatura.id}
              fatura={fatura}
              expanded={expandedId === fatura.id}
              onToggle={() => toggleExpand(fatura.id)}
              onAction={(action) => handleAction(fatura.id, action)}
              actionLoading={actionLoading}
            />
          ))}
        </div>
      )}

      {/* Pay Modal */}
      {pagarFatura && (
        <PagarModal
          fatura={pagarFatura}
          contas={contas}
          onClose={() => setPagarFatura(null)}
          onPaid={handlePaid}
        />
      )}
    </div>
  )
}
