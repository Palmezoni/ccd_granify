'use client'

import { useEffect, useState } from 'react'
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, ReferenceLine,
} from 'recharts'
import { TrendingUp, TrendingDown, DollarSign, Calendar, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react'

// ─── Types ───────────────────────────────────────────────────────────────────

interface MensalItem {
  mes: number
  label: string
  receitas: number
  despesas: number
  resultado: number
  saldoAcumulado: number
}

interface CategoriaItem {
  categoriaId: string
  nome: string
  cor: string
  tipo: string
  total: number
}

interface Totais {
  receitas: number
  despesas: number
  resultado: number
}

interface FluxoData {
  ano: number
  mensal: MensalItem[]
  porCategoria: CategoriaItem[]
  totais: Totais
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const formatCurrency = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)

const formatKilo = (v: number) => {
  if (Math.abs(v) >= 1000) return `R$${(v / 1000).toFixed(0)}k`
  return `R$${v.toFixed(0)}`
}

// ─── Custom Tooltip ───────────────────────────────────────────────────────────

function CustomBarTooltip({ active, payload, label }: {
  active?: boolean
  payload?: { name: string; value: number; color: string }[]
  label?: string
}) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-xl border border-border bg-card px-4 py-3 shadow-lg text-sm">
      <p className="mb-2 font-semibold text-slate-700 dark:text-slate-200">{label}</p>
      {payload.map((p) => (
        <div key={p.name} className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: p.color }} />
          <span className="text-slate-500 dark:text-slate-400">{p.name}:</span>
          <span className="font-semibold text-slate-900 dark:text-white">{formatCurrency(p.value)}</span>
        </div>
      ))}
    </div>
  )
}

function CustomLineTooltip({ active, payload, label }: {
  active?: boolean
  payload?: { name: string; value: number; color: string }[]
  label?: string
}) {
  if (!active || !payload?.length) return null
  const v = payload[0]?.value ?? 0
  return (
    <div className="rounded-xl border border-border bg-card px-4 py-3 shadow-lg text-sm">
      <p className="mb-1 font-semibold text-slate-700 dark:text-slate-200">{label}</p>
      <div className="flex items-center gap-2">
        <span className="h-2.5 w-2.5 rounded-full bg-blue-500" />
        <span className="text-slate-500 dark:text-slate-400">Saldo Acumulado:</span>
        <span className={`font-semibold ${v >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500'}`}>
          {formatCurrency(v)}
        </span>
      </div>
    </div>
  )
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────

function KpiCard({ title, value, subtitle, icon, colorClass, iconBg }: {
  title: string
  value: string
  subtitle: string
  icon: React.ReactNode
  colorClass: string
  iconBg: string
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-start justify-between">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{title}</p>
          <p className={`mt-1 text-xl font-bold ${colorClass}`}>{value}</p>
          <p className="mt-0.5 truncate text-xs text-slate-400">{subtitle}</p>
        </div>
        <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${iconBg}`}>
          {icon}
        </div>
      </div>
    </div>
  )
}

// ─── Section Header ───────────────────────────────────────────────────────────

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500 mb-4">
      {children}
    </h2>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function FluxoDeCaixaPage() {
  const currentYear = new Date().getFullYear()
  const currentMonth = new Date().getMonth() + 1

  const [ano, setAno] = useState(currentYear)
  const [data, setData] = useState<FluxoData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    setLoading(true)
    setError('')
    fetch(`/api/fluxo-caixa?ano=${ano}`)
      .then((r) => r.json())
      .then((json) => {
        if (json.error) throw new Error(json.error)
        setData(json.data)
      })
      .catch((e) => setError(e.message || 'Erro ao carregar dados'))
      .finally(() => setLoading(false))
  }, [ano])

  // Derived: month with highest expenses
  const mesMaiorGasto = data
    ? data.mensal.reduce(
        (best, m) => (m.despesas > best.despesas ? m : best),
        data.mensal[0]
      )
    : null

  // Top categories (despesa only, for percentage bar)
  const topDespesas = data
    ? data.porCategoria.filter((c) => c.tipo === 'DESPESA').slice(0, 8)
    : []
  const maxCatTotal = topDespesas[0]?.total ?? 1

  const topReceitas = data
    ? data.porCategoria.filter((c) => c.tipo === 'RECEITA').slice(0, 5)
    : []

  return (
    <div className="space-y-6">

      {/* ── Page Header ── */}
      <div className="flex items-center justify-end">
        {/* Year selector */}
        <div className="flex items-center gap-1 rounded-xl border border-border bg-card px-2 py-1.5">
          <button
            onClick={() => setAno((y) => y - 1)}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-slate-700 dark:hover:text-white"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="min-w-[52px] text-center text-sm font-semibold text-slate-900 dark:text-white">
            {ano}
          </span>
          <button
            onClick={() => setAno((y) => y + 1)}
            disabled={ano >= currentYear}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 disabled:opacity-30 dark:hover:bg-slate-700 dark:hover:text-white"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* ── Loading / Error ── */}
      {loading && (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
        </div>
      )}

      {!loading && error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-400">
          {error}
        </div>
      )}

      {!loading && !error && data && (
        <>
          {/* ── KPI Row ── */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <KpiCard
              title="Total Receitas"
              value={formatCurrency(data.totais.receitas)}
              subtitle={`no ano de ${ano}`}
              icon={<TrendingUp className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />}
              colorClass="text-emerald-600 dark:text-emerald-400"
              iconBg="bg-emerald-50 dark:bg-emerald-950"
            />
            <KpiCard
              title="Total Despesas"
              value={formatCurrency(data.totais.despesas)}
              subtitle={`no ano de ${ano}`}
              icon={<TrendingDown className="h-4 w-4 text-red-500" />}
              colorClass="text-red-500"
              iconBg="bg-red-50 dark:bg-red-950"
            />
            <KpiCard
              title="Resultado"
              value={formatCurrency(data.totais.resultado)}
              subtitle={data.totais.resultado >= 0 ? 'saldo positivo' : 'saldo negativo'}
              icon={<DollarSign className={`h-4 w-4 ${data.totais.resultado >= 0 ? 'text-blue-600 dark:text-blue-400' : 'text-red-500'}`} />}
              colorClass={data.totais.resultado >= 0 ? 'text-blue-600 dark:text-blue-400' : 'text-red-500'}
              iconBg={data.totais.resultado >= 0 ? 'bg-blue-50 dark:bg-blue-950' : 'bg-red-50 dark:bg-red-950'}
            />
            <KpiCard
              title="Maior Gasto"
              value={mesMaiorGasto ? mesMaiorGasto.label : '—'}
              subtitle={mesMaiorGasto ? formatCurrency(mesMaiorGasto.despesas) : 'sem dados'}
              icon={<Calendar className="h-4 w-4 text-amber-600 dark:text-amber-400" />}
              colorClass="text-amber-600 dark:text-amber-400"
              iconBg="bg-amber-50 dark:bg-amber-950"
            />
          </div>

          {/* ── Chart 1: Bar (Receitas vs Despesas) ── */}
          <div className="rounded-xl border border-border bg-card p-5">
            <SectionTitle>Receitas vs Despesas por Mês</SectionTitle>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.mensal} barGap={4} barCategoryGap="28%">
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 12, fill: '#94a3b8' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tickFormatter={formatKilo}
                    tick={{ fontSize: 12, fill: '#94a3b8' }}
                    axisLine={false}
                    tickLine={false}
                    width={56}
                  />
                  <Tooltip content={<CustomBarTooltip />} cursor={{ fill: 'rgba(148,163,184,0.08)' }} />
                  <Legend
                    wrapperStyle={{ paddingTop: 16, fontSize: 13 }}
                    formatter={(value) => <span className="text-slate-600 dark:text-slate-300">{value}</span>}
                  />
                  <Bar dataKey="receitas" name="Receitas" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={40} />
                  <Bar dataKey="despesas" name="Despesas" fill="#ef4444" radius={[4, 4, 0, 0]} maxBarSize={40} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* ── Chart 2: Line (Saldo Acumulado) ── */}
          <div className="rounded-xl border border-border bg-card p-5">
            <SectionTitle>Saldo Acumulado</SectionTitle>
            <div className="h-60">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data.mensal}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 12, fill: '#94a3b8' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tickFormatter={formatKilo}
                    tick={{ fontSize: 12, fill: '#94a3b8' }}
                    axisLine={false}
                    tickLine={false}
                    width={56}
                  />
                  <Tooltip content={<CustomLineTooltip />} cursor={{ stroke: '#94a3b8', strokeWidth: 1 }} />
                  <ReferenceLine y={0} stroke="#94a3b8" strokeDasharray="4 4" />
                  <Line
                    type="monotone"
                    dataKey="saldoAcumulado"
                    name="Saldo Acumulado"
                    stroke="#3b82f6"
                    strokeWidth={2.5}
                    dot={{ r: 4, fill: '#3b82f6', strokeWidth: 0 }}
                    activeDot={{ r: 6, fill: '#3b82f6' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* ── Chart 3: Categories ── */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">

            {/* Despesas por categoria */}
            <div className="rounded-xl border border-border bg-card p-5">
              <SectionTitle>Top Despesas por Categoria</SectionTitle>
              {topDespesas.length === 0 ? (
                <p className="py-8 text-center text-sm text-slate-400">Sem dados de despesas</p>
              ) : (
                <div className="space-y-3">
                  {topDespesas.map((cat) => {
                    const pct = data.totais.despesas > 0
                      ? (cat.total / data.totais.despesas) * 100
                      : 0
                    const barPct = (cat.total / maxCatTotal) * 100
                    return (
                      <div key={cat.categoriaId}>
                        <div className="mb-1 flex items-center justify-between gap-2">
                          <div className="flex min-w-0 items-center gap-2">
                            <span
                              className="h-2.5 w-2.5 shrink-0 rounded-full"
                              style={{ backgroundColor: cat.cor }}
                            />
                            <span className="truncate text-sm text-slate-700 dark:text-slate-300">{cat.nome}</span>
                          </div>
                          <div className="flex shrink-0 items-center gap-2">
                            <span className="text-xs text-slate-400">{pct.toFixed(1)}%</span>
                            <span className="text-sm font-semibold text-slate-900 dark:text-white">
                              {formatCurrency(cat.total)}
                            </span>
                          </div>
                        </div>
                        <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{ width: `${barPct}%`, backgroundColor: cat.cor }}
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Receitas por categoria */}
            <div className="rounded-xl border border-border bg-card p-5">
              <SectionTitle>Top Receitas por Categoria</SectionTitle>
              {topReceitas.length === 0 ? (
                <p className="py-8 text-center text-sm text-slate-400">Sem dados de receitas</p>
              ) : (
                <div className="space-y-3">
                  {topReceitas.map((cat) => {
                    const pct = data.totais.receitas > 0
                      ? (cat.total / data.totais.receitas) * 100
                      : 0
                    const barPct = topReceitas[0]?.total > 0
                      ? (cat.total / topReceitas[0].total) * 100
                      : 0
                    return (
                      <div key={cat.categoriaId}>
                        <div className="mb-1 flex items-center justify-between gap-2">
                          <div className="flex min-w-0 items-center gap-2">
                            <span
                              className="h-2.5 w-2.5 shrink-0 rounded-full"
                              style={{ backgroundColor: cat.cor }}
                            />
                            <span className="truncate text-sm text-slate-700 dark:text-slate-300">{cat.nome}</span>
                          </div>
                          <div className="flex shrink-0 items-center gap-2">
                            <span className="text-xs text-slate-400">{pct.toFixed(1)}%</span>
                            <span className="text-sm font-semibold text-slate-900 dark:text-white">
                              {formatCurrency(cat.total)}
                            </span>
                          </div>
                        </div>
                        <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{ width: `${barPct}%`, backgroundColor: cat.cor }}
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>

          {/* ── Monthly Detail Table ── */}
          <div className="rounded-xl border border-border bg-card p-5">
            <SectionTitle>Detalhamento Mensal</SectionTitle>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="pb-3 text-left font-semibold text-slate-500">Mês</th>
                    <th className="pb-3 text-right font-semibold text-slate-500">Receitas</th>
                    <th className="pb-3 text-right font-semibold text-slate-500">Despesas</th>
                    <th className="pb-3 text-right font-semibold text-slate-500">Resultado</th>
                    <th className="pb-3 text-right font-semibold text-slate-500">Saldo Acumulado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {data.mensal.map((m) => {
                    const isCurrentMonth = ano === currentYear && m.mes === currentMonth
                    return (
                      <tr
                        key={m.mes}
                        className={`transition-colors ${
                          isCurrentMonth
                            ? 'bg-emerald-50/60 dark:bg-emerald-950/30'
                            : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
                        }`}
                      >
                        <td className="py-3 pr-4">
                          <div className="flex items-center gap-2">
                            {isCurrentMonth && (
                              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                            )}
                            <span className={`font-medium ${isCurrentMonth ? 'text-emerald-700 dark:text-emerald-400' : 'text-slate-700 dark:text-slate-300'}`}>
                              {m.label}
                            </span>
                            {isCurrentMonth && (
                              <span className="rounded-full bg-emerald-100 px-1.5 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300">
                                atual
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 text-right text-emerald-600 dark:text-emerald-400">
                          {m.receitas > 0 ? formatCurrency(m.receitas) : <span className="text-slate-300 dark:text-slate-600">—</span>}
                        </td>
                        <td className="py-3 text-right text-red-500">
                          {m.despesas > 0 ? formatCurrency(m.despesas) : <span className="text-slate-300 dark:text-slate-600">—</span>}
                        </td>
                        <td className={`py-3 text-right font-semibold ${m.resultado > 0 ? 'text-emerald-600 dark:text-emerald-400' : m.resultado < 0 ? 'text-red-500' : 'text-slate-400'}`}>
                          {m.resultado !== 0
                            ? (m.resultado > 0 ? '+' : '') + formatCurrency(m.resultado)
                            : <span className="font-normal text-slate-300 dark:text-slate-600">—</span>}
                        </td>
                        <td className={`py-3 text-right font-semibold ${m.saldoAcumulado >= 0 ? 'text-blue-600 dark:text-blue-400' : 'text-red-500'}`}>
                          {formatCurrency(m.saldoAcumulado)}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-slate-200 dark:border-slate-700">
                    <td className="pt-3 font-bold text-slate-700 dark:text-slate-200">Total</td>
                    <td className="pt-3 text-right font-bold text-emerald-600 dark:text-emerald-400">
                      {formatCurrency(data.totais.receitas)}
                    </td>
                    <td className="pt-3 text-right font-bold text-red-500">
                      {formatCurrency(data.totais.despesas)}
                    </td>
                    <td className={`pt-3 text-right font-bold ${data.totais.resultado >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500'}`}>
                      {(data.totais.resultado >= 0 ? '+' : '') + formatCurrency(data.totais.resultado)}
                    </td>
                    <td className={`pt-3 text-right font-bold ${data.mensal[11]?.saldoAcumulado >= 0 ? 'text-blue-600 dark:text-blue-400' : 'text-red-500'}`}>
                      {formatCurrency(data.mensal[11]?.saldoAcumulado ?? 0)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
