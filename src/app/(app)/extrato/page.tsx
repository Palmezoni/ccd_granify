'use client'

import { useState, useEffect, useCallback } from 'react'
import { FileText, FileSpreadsheet, Search, X, ArrowUpCircle, ArrowDownCircle } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

// ─── Types ───────────────────────────────────────────────────────────────────

interface Conta {
  id: string
  nome: string
  cor: string | null
}

interface Lancamento {
  id: string
  data: string
  descricao: string
  tipo: string
  valor: number
  status: string
  categoria: { nome: string; cor: string } | null
  saldoAcumulado: number | null
}

interface ExtratoData {
  conta: { id: string; nome: string; saldoAtual: number }
  saldoInicial: number
  saldoFinal: number
  lancamentos: Lancamento[]
}

// ─── PDF / Excel export ───────────────────────────────────────────────────────

async function exportarPDF(dados: ExtratoData, filtrados: Lancamento[]) {
  const jsPDF = (await import('jspdf')).default
  await import('jspdf-autotable')

  const doc = new jsPDF()
  doc.setFontSize(16)
  doc.text(`Extrato — ${dados.conta.nome}`, 14, 18)
  doc.setFontSize(10)
  doc.text(`Saldo Inicial: ${formatCurrency(dados.saldoInicial)}`, 14, 28)
  doc.text(`Saldo Final: ${formatCurrency(dados.saldoFinal)}`, 14, 34)
  ;(doc as any).autoTable({
    startY: 42,
    head: [['Data', 'Descrição', 'Categoria', 'Tipo', 'Valor', 'Saldo']],
    body: filtrados.map((l) => [
      new Date(l.data + 'T12:00:00').toLocaleDateString('pt-BR'),
      l.descricao,
      l.categoria?.nome ?? '—',
      l.tipo,
      (l.tipo === 'RECEITA' ? '+' : '-') + formatCurrency(l.valor),
      l.saldoAcumulado != null ? formatCurrency(l.saldoAcumulado) : '—',
    ]),
    theme: 'striped',
    headStyles: { fillColor: [16, 185, 129] },
    columnStyles: {
      4: { halign: 'right' },
      5: { halign: 'right' },
    },
  })
  doc.save(`Extrato-${dados.conta.nome}.pdf`)
}

async function exportarExcel(dados: ExtratoData, filtrados: Lancamento[]) {
  const XLSX = await import('xlsx')
  const rows = filtrados.map((l) => ({
    Data: new Date(l.data + 'T12:00:00').toLocaleDateString('pt-BR'),
    Descrição: l.descricao,
    Categoria: l.categoria?.nome ?? '—',
    Tipo: l.tipo,
    Valor: l.tipo === 'RECEITA' ? l.valor : -l.valor,
    'Saldo Acumulado': l.saldoAcumulado ?? '',
    Status: l.status,
  }))
  const ws = XLSX.utils.json_to_sheet(rows)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Extrato')
  XLSX.writeFile(wb, `Extrato-${dados.conta.nome}.xlsx`)
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ExtratoPage() {
  const now = new Date()
  const defaultInicio = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
  const defaultFim = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0]

  const [contas, setContas] = useState<Conta[]>([])
  const [contaId, setContaId] = useState('')
  const [dataInicio, setDataInicio] = useState(defaultInicio)
  const [dataFim, setDataFim] = useState(defaultFim)
  const [search, setSearch] = useState('')

  const [extrato, setExtrato] = useState<ExtratoData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Load contas
  useEffect(() => {
    fetch('/api/contas')
      .then((r) => r.json())
      .then((d) => {
        if (d.data && d.data.length > 0) {
          setContas(d.data)
          setContaId(d.data[0].id)
        }
      })
  }, [])

  // Fetch extrato whenever filters change
  const fetchExtrato = useCallback(async () => {
    if (!contaId) return
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({ contaId, dataInicio, dataFim })
      const res = await fetch(`/api/relatorios/extrato?${params}`)
      const d = await res.json()
      if (!res.ok) {
        setError(d.error ?? 'Erro ao carregar extrato')
        return
      }
      setExtrato(d.data)
    } catch {
      setError('Erro ao carregar extrato')
    } finally {
      setLoading(false)
    }
  }, [contaId, dataInicio, dataFim])

  useEffect(() => {
    if (contaId) fetchExtrato()
  }, [contaId, dataInicio, dataFim, fetchExtrato])

  // Apply search filter client-side
  const lancamentosFiltrados = (extrato?.lancamentos ?? []).filter((l) => {
    if (!search) return true
    const q = search.toLowerCase()
    return (
      l.descricao.toLowerCase().includes(q) ||
      (l.categoria?.nome ?? '').toLowerCase().includes(q)
    )
  })

  const totalEntradas = lancamentosFiltrados
    .filter((l) => l.tipo === 'RECEITA' && l.status === 'CONFIRMADO')
    .reduce((s, l) => s + l.valor, 0)

  const totalSaidas = lancamentosFiltrados
    .filter((l) => l.tipo === 'DESPESA' && l.status === 'CONFIRMADO')
    .reduce((s, l) => s + l.valor, 0)

  const contaSelecionada = contas.find((c) => c.id === contaId)

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="rounded-xl border border-border bg-card p-4">
        <div className="flex flex-wrap items-center gap-3">
          {/* Conta */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-slate-500">Conta</label>
            <select
              value={contaId}
              onChange={(e) => setContaId(e.target.value)}
              className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:text-white"
            >
              {contas.map((c) => (
                <option key={c.id} value={c.id}>{c.nome}</option>
              ))}
            </select>
          </div>

          {/* Data início */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-slate-500">Data Início</label>
            <input
              type="date"
              value={dataInicio}
              onChange={(e) => setDataInicio(e.target.value)}
              className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:text-white"
            />
          </div>

          {/* Data fim */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-slate-500">Data Fim</label>
            <input
              type="date"
              value={dataFim}
              onChange={(e) => setDataFim(e.target.value)}
              className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:text-white"
            />
          </div>

          {/* Search */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-slate-500">Buscar</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Descrição, categoria..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="rounded-lg border border-border bg-background py-2 pl-9 pr-8 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:text-white"
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Export buttons */}
          <div className="ml-auto flex items-end gap-2 pb-0.5">
            <button
              onClick={() => extrato && exportarPDF(extrato, lancamentosFiltrados)}
              disabled={!extrato || loading}
              className="flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              <FileText className="h-4 w-4" />
              PDF
            </button>
            <button
              onClick={() => extrato && exportarExcel(extrato, lancamentosFiltrados)}
              disabled={!extrato || loading}
              className="flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              <FileSpreadsheet className="h-4 w-4" />
              Excel
            </button>
          </div>
        </div>
      </div>

      {/* Summary */}
      {extrato && !loading && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <SummaryCard
            label="Saldo Abertura"
            value={formatCurrency(extrato.saldoInicial)}
            color="neutral"
          />
          <SummaryCard
            label="Total Entradas"
            value={formatCurrency(totalEntradas)}
            color="emerald"
            icon={<ArrowUpCircle className="h-4 w-4" />}
          />
          <SummaryCard
            label="Total Saídas"
            value={formatCurrency(totalSaidas)}
            color="red"
            icon={<ArrowDownCircle className="h-4 w-4" />}
          />
          <SummaryCard
            label="Saldo Final"
            value={formatCurrency(extrato.saldoFinal)}
            color={extrato.saldoFinal >= 0 ? 'blue' : 'red'}
          />
        </div>
      )}

      {/* Conta info badge */}
      {contaSelecionada && extrato && (
        <div className="flex items-center gap-2">
          <div
            className="h-3 w-3 rounded-full"
            style={{ backgroundColor: contaSelecionada.cor ?? '#10b981' }}
          />
          <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
            {contaSelecionada.nome}
          </span>
          <span className="text-sm text-slate-400">•</span>
          <span className="text-sm text-slate-500">
            Saldo atual: <span className="font-semibold text-slate-900 dark:text-white">{formatCurrency(extrato.conta.saldoAtual)}</span>
          </span>
          {search && (
            <>
              <span className="text-sm text-slate-400">•</span>
              <span className="text-sm text-slate-500">
                {lancamentosFiltrados.length} resultado{lancamentosFiltrados.length !== 1 ? 's' : ''} encontrado{lancamentosFiltrados.length !== 1 ? 's' : ''}
              </span>
            </>
          )}
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300">
          {error}
        </div>
      )}

      {/* Table */}
      <div className="rounded-xl border border-border bg-card">
        {loading ? (
          <TableSkeleton />
        ) : !extrato || lancamentosFiltrados.length === 0 ? (
          <EmptyState
            hasSearch={!!search}
            onClearSearch={() => setSearch('')}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="px-5 pb-3 pt-4 text-left font-medium text-slate-500">Data</th>
                  <th className="px-5 pb-3 pt-4 text-left font-medium text-slate-500">Descrição</th>
                  <th className="px-5 pb-3 pt-4 text-left font-medium text-slate-500">Categoria</th>
                  <th className="px-5 pb-3 pt-4 text-center font-medium text-slate-500">Tipo</th>
                  <th className="px-5 pb-3 pt-4 text-right font-medium text-slate-500">Entrada</th>
                  <th className="px-5 pb-3 pt-4 text-right font-medium text-slate-500">Saída</th>
                  <th className="px-5 pb-3 pt-4 text-right font-medium text-slate-500">Saldo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {[...lancamentosFiltrados].reverse().map((l) => (
                  <tr
                    key={l.id}
                    className={`transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50 ${
                      l.status === 'PROJETADO' ? 'opacity-60' : ''
                    }`}
                  >
                    <td className="whitespace-nowrap px-5 py-3 text-slate-600 dark:text-slate-400">
                      {new Date(l.data + 'T12:00:00').toLocaleDateString('pt-BR')}
                    </td>
                    <td className="px-5 py-3">
                      <div>
                        <span className="font-medium text-slate-900 dark:text-white">{l.descricao}</span>
                        {l.status === 'PROJETADO' && (
                          <span className="ml-2 inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-900 dark:text-amber-300">
                            Projetado
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      {l.categoria ? (
                        <div className="flex items-center gap-1.5">
                          <div
                            className="h-2.5 w-2.5 shrink-0 rounded-full"
                            style={{ backgroundColor: l.categoria.cor }}
                          />
                          <span className="text-slate-600 dark:text-slate-400">{l.categoria.nome}</span>
                        </div>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-center">
                      {l.tipo === 'RECEITA' ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300">
                          <ArrowUpCircle className="h-3 w-3" />
                          Entrada
                        </span>
                      ) : l.tipo === 'DESPESA' ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-700 dark:bg-red-900 dark:text-red-300">
                          <ArrowDownCircle className="h-3 w-3" />
                          Saída
                        </span>
                      ) : (
                        <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-900 dark:text-blue-300">
                          Transf.
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-right font-semibold text-emerald-600 dark:text-emerald-400">
                      {l.tipo === 'RECEITA' ? formatCurrency(l.valor) : '—'}
                    </td>
                    <td className="px-5 py-3 text-right font-semibold text-red-500">
                      {l.tipo === 'DESPESA' ? formatCurrency(l.valor) : '—'}
                    </td>
                    <td className={`px-5 py-3 text-right font-semibold ${
                      l.saldoAcumulado != null && l.saldoAcumulado < 0
                        ? 'text-red-500'
                        : 'text-slate-900 dark:text-white'
                    }`}>
                      {l.saldoAcumulado != null ? formatCurrency(l.saldoAcumulado) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
              {/* Footer totals */}
              <tfoot>
                <tr className="border-t-2 border-border bg-slate-50 dark:bg-slate-800/30">
                  <td colSpan={4} className="px-5 py-3 font-semibold text-slate-900 dark:text-white">
                    Total do período ({lancamentosFiltrados.length} lançamento{lancamentosFiltrados.length !== 1 ? 's' : ''})
                  </td>
                  <td className="px-5 py-3 text-right font-bold text-emerald-600 dark:text-emerald-400">
                    {formatCurrency(totalEntradas)}
                  </td>
                  <td className="px-5 py-3 text-right font-bold text-red-500">
                    {formatCurrency(totalSaidas)}
                  </td>
                  <td className={`px-5 py-3 text-right font-bold ${
                    totalEntradas - totalSaidas >= 0
                      ? 'text-blue-600 dark:text-blue-400'
                      : 'text-red-500'
                  }`}>
                    {formatCurrency(totalEntradas - totalSaidas)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Subcomponents ────────────────────────────────────────────────────────────

function SummaryCard({
  label,
  value,
  color = 'neutral',
  icon,
}: {
  label: string
  value: string
  color?: 'emerald' | 'red' | 'blue' | 'neutral'
  icon?: React.ReactNode
}) {
  const colorMap = {
    emerald: 'text-emerald-600 dark:text-emerald-400',
    red: 'text-red-500',
    blue: 'text-blue-600 dark:text-blue-400',
    neutral: 'text-slate-900 dark:text-white',
  }
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center gap-1.5">
        {icon && <span className={colorMap[color]}>{icon}</span>}
        <p className="text-xs font-medium text-slate-500">{label}</p>
      </div>
      <p className={`mt-1.5 text-lg font-bold ${colorMap[color]}`}>{value}</p>
    </div>
  )
}

function TableSkeleton() {
  return (
    <div className="space-y-3 p-5">
      {[...Array(6)].map((_, i) => (
        <div key={i} className="flex gap-4">
          <div className="h-5 w-20 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
          <div className="h-5 flex-1 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
          <div className="h-5 w-24 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
          <div className="h-5 w-24 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
        </div>
      ))}
    </div>
  )
}

function EmptyState({ hasSearch, onClearSearch }: { hasSearch: boolean; onClearSearch: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <FileText className="mb-3 h-10 w-10 text-slate-300 dark:text-slate-600" />
      <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
        {hasSearch ? 'Nenhum lançamento encontrado para esta busca' : 'Nenhum lançamento no período'}
      </p>
      {hasSearch && (
        <button
          onClick={onClearSearch}
          className="mt-2 text-xs font-medium text-emerald-600 hover:underline dark:text-emerald-400"
        >
          Limpar busca
        </button>
      )}
    </div>
  )
}
