'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  TrendingUp, TrendingDown, DollarSign, FileText,
  Download, BarChart3, PieChart, FileSpreadsheet,
} from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

// ─── Types ───────────────────────────────────────────────────────────────────

interface CategoriaResumo {
  categoriaId: string
  nome: string
  cor: string
  tipo: string
  valor: number
  percentual: number
}

interface ContaResumo {
  contaId: string
  nome: string
  cor: string
  saldo: number
}

interface EvolucaoItem {
  mes: number
  ano: number
  label: string
  receitas: number
  despesas: number
}

interface ResumoMensal {
  receitas: number
  despesas: number
  resultado: number
  porCategoria: CategoriaResumo[]
  porConta: ContaResumo[]
  evolucao: EvolucaoItem[]
}

interface Conta {
  id: string
  nome: string
  cor: string | null
}

// ─── PDF / Excel helpers ──────────────────────────────────────────────────────

async function exportarResumoPDF(resumo: ResumoMensal, mes: number, ano: number) {
  const jsPDF = (await import('jspdf')).default
  await import('jspdf-autotable')

  const doc = new jsPDF()
  const titulo = `Resumo Mensal — ${String(mes).padStart(2, '0')}/${ano}`

  doc.setFontSize(16)
  doc.text(titulo, 14, 18)

  doc.setFontSize(11)
  doc.text(`Receitas: ${formatCurrency(resumo.receitas)}`, 14, 30)
  doc.text(`Despesas: ${formatCurrency(resumo.despesas)}`, 14, 37)
  doc.text(`Resultado: ${formatCurrency(resumo.resultado)}`, 14, 44)
  ;(doc as any).autoTable({
    startY: 55,
    head: [['Categoria', 'Tipo', 'Valor', '% do Total']],
    body: resumo.porCategoria.map((c) => [
      c.nome,
      c.tipo,
      formatCurrency(c.valor),
      `${c.percentual.toFixed(1)}%`,
    ]),
    theme: 'striped',
    headStyles: { fillColor: [16, 185, 129] },
  })
  doc.save(`${titulo}.pdf`)
}

async function exportarResumoExcel(resumo: ResumoMensal, mes: number, ano: number) {
  const XLSX = await import('xlsx')
  const dados = resumo.porCategoria.map((c) => ({
    Categoria: c.nome,
    Tipo: c.tipo,
    Valor: c.valor,
    'Percentual (%)': c.percentual,
  }))
  const ws = XLSX.utils.json_to_sheet(dados)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Por Categoria')

  const evolucaoDados = resumo.evolucao.map((e) => ({
    'Mês/Ano': e.label,
    Receitas: e.receitas,
    Despesas: e.despesas,
    Resultado: e.receitas - e.despesas,
  }))
  const ws2 = XLSX.utils.json_to_sheet(evolucaoDados)
  XLSX.utils.book_append_sheet(wb, ws2, 'Evolução')

  XLSX.writeFile(wb, `Resumo-${String(mes).padStart(2, '0')}-${ano}.xlsx`)
}

// ─── Main Page ────────────────────────────────────────────────────────────────

const SECTIONS = ['Resumo Mensal', 'Por Categoria', 'Extrato de Conta'] as const
type Section = typeof SECTIONS[number]

const MESES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
]

export default function RelatoriosPage() {
  const now = new Date()
  const [activeSection, setActiveSection] = useState<Section>('Resumo Mensal')

  // Resumo state
  const [mes, setMes] = useState(now.getMonth() + 1)
  const [ano, setAno] = useState(now.getFullYear())
  const [resumo, setResumo] = useState<ResumoMensal | null>(null)
  const [loadingResumo, setLoadingResumo] = useState(false)

  // Categoria filter state
  const [catMes, setCatMes] = useState(now.getMonth() + 1)
  const [catAno, setCatAno] = useState(now.getFullYear())
  const [catTipo, setCatTipo] = useState<'DESPESA' | 'RECEITA'>('DESPESA')

  // Extrato state
  const [contas, setContas] = useState<Conta[]>([])
  const [contaId, setContaId] = useState('')
  const [dataInicio, setDataInicio] = useState(
    `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
  )
  const [dataFim, setDataFim] = useState(
    new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0]
  )

  // Load contas on mount
  useEffect(() => {
    fetch('/api/contas')
      .then((r) => r.json())
      .then((d) => {
        if (d.data) {
          setContas(d.data)
          if (d.data.length > 0) setContaId(d.data[0].id)
        }
      })
  }, [])

  // Fetch resumo mensal
  const fetchResumo = useCallback(async (m: number, a: number) => {
    setLoadingResumo(true)
    try {
      const res = await fetch(`/api/relatorios/resumo-mensal?mes=${m}&ano=${a}`)
      const d = await res.json()
      if (d.data) setResumo(d.data)
    } finally {
      setLoadingResumo(false)
    }
  }, [])

  useEffect(() => {
    if (activeSection === 'Resumo Mensal' || activeSection === 'Por Categoria') {
      fetchResumo(mes, ano)
    }
  }, [mes, ano, activeSection, fetchResumo])

  useEffect(() => {
    if (activeSection === 'Por Categoria') {
      fetchResumo(catMes, catAno)
    }
  }, [catMes, catAno, activeSection, fetchResumo])

  const resumoParaCat = resumo

  const anos = Array.from({ length: 5 }, (_, i) => now.getFullYear() - i)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-slate-900 dark:text-white">Relatórios</h1>
        <p className="mt-0.5 text-sm text-slate-500">Análise detalhada das suas finanças</p>
      </div>

      {/* Section tabs */}
      <div className="flex gap-1 rounded-xl border border-border bg-card p-1">
        {SECTIONS.map((s) => (
          <button
            key={s}
            onClick={() => setActiveSection(s)}
            className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
              activeSection === s
                ? 'bg-emerald-500 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      {/* ── RESUMO MENSAL ── */}
      {activeSection === 'Resumo Mensal' && (
        <div className="space-y-6">
          {/* Controls */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <select
                value={mes}
                onChange={(e) => setMes(Number(e.target.value))}
                className="rounded-lg border border-border bg-card px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:text-white"
              >
                {MESES.map((m, i) => (
                  <option key={i + 1} value={i + 1}>{m}</option>
                ))}
              </select>
              <select
                value={ano}
                onChange={(e) => setAno(Number(e.target.value))}
                className="rounded-lg border border-border bg-card px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:text-white"
              >
                {anos.map((a) => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => resumo && exportarResumoPDF(resumo, mes, ano)}
                disabled={!resumo || loadingResumo}
                className="flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                <FileText className="h-4 w-4" />
                Exportar PDF
              </button>
              <button
                onClick={() => resumo && exportarResumoExcel(resumo, mes, ano)}
                disabled={!resumo || loadingResumo}
                className="flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                <FileSpreadsheet className="h-4 w-4" />
                Exportar Excel
              </button>
            </div>
          </div>

          {/* KPI cards */}
          {loadingResumo ? (
            <KPISkeleton />
          ) : resumo ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <KPICard
                title="Receitas"
                value={formatCurrency(resumo.receitas)}
                icon={<TrendingUp className="h-5 w-5" />}
                colorClass="bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400"
                valueClass="text-emerald-600 dark:text-emerald-400"
              />
              <KPICard
                title="Despesas"
                value={formatCurrency(resumo.despesas)}
                icon={<TrendingDown className="h-5 w-5" />}
                colorClass="bg-red-50 text-red-500 dark:bg-red-950 dark:text-red-400"
                valueClass="text-red-500 dark:text-red-400"
              />
              <KPICard
                title="Resultado"
                value={formatCurrency(resumo.resultado)}
                icon={<DollarSign className="h-5 w-5" />}
                colorClass={resumo.resultado >= 0
                  ? 'bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-400'
                  : 'bg-red-50 text-red-500 dark:bg-red-950 dark:text-red-400'}
                valueClass={resumo.resultado >= 0
                  ? 'text-blue-600 dark:text-blue-400'
                  : 'text-red-500 dark:text-red-400'}
              />
            </div>
          ) : null}

          {/* Chart placeholder + Por conta */}
          {resumo && !loadingResumo && (
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              {/* Chart placeholder */}
              <div className="rounded-xl border border-border bg-card p-6">
                <div className="mb-3 flex items-center gap-2">
                  <PieChart className="h-4 w-4 text-emerald-500" />
                  <h2 className="font-semibold text-slate-900 dark:text-white">Gráfico de Categorias</h2>
                </div>
                <div className="flex h-48 items-center justify-center rounded-lg bg-slate-50 dark:bg-slate-800">
                  <p className="text-sm text-slate-400">gráfico de categorias</p>
                </div>
              </div>

              {/* Contas */}
              <div className="rounded-xl border border-border bg-card p-6">
                <div className="mb-3 flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-emerald-500" />
                  <h2 className="font-semibold text-slate-900 dark:text-white">Saldo por Conta</h2>
                </div>
                {resumo.porConta.length === 0 ? (
                  <p className="py-8 text-center text-sm text-slate-400">Nenhuma conta encontrada</p>
                ) : (
                  <div className="space-y-3">
                    {resumo.porConta.map((c) => (
                      <div key={c.contaId} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="h-3 w-3 rounded-full" style={{ backgroundColor: c.cor }} />
                          <span className="text-sm text-slate-700 dark:text-slate-300">{c.nome}</span>
                        </div>
                        <span className={`text-sm font-semibold ${c.saldo >= 0 ? 'text-slate-900 dark:text-white' : 'text-red-500'}`}>
                          {formatCurrency(c.saldo)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Evolução */}
          {resumo && !loadingResumo && resumo.evolucao.length > 0 && (
            <div className="rounded-xl border border-border bg-card p-6">
              <h2 className="mb-4 font-semibold text-slate-900 dark:text-white">Evolução dos Últimos 6 Meses</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="pb-3 text-left font-medium text-slate-500">Mês</th>
                      <th className="pb-3 text-right font-medium text-slate-500">Receitas</th>
                      <th className="pb-3 text-right font-medium text-slate-500">Despesas</th>
                      <th className="pb-3 text-right font-medium text-slate-500">Resultado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {resumo.evolucao.map((e) => {
                      const res = e.receitas - e.despesas
                      return (
                        <tr key={`${e.mes}-${e.ano}`} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                          <td className="py-3 font-medium text-slate-900 dark:text-white">{e.label}</td>
                          <td className="py-3 text-right text-emerald-600 dark:text-emerald-400">{formatCurrency(e.receitas)}</td>
                          <td className="py-3 text-right text-red-500">{formatCurrency(e.despesas)}</td>
                          <td className={`py-3 text-right font-semibold ${res >= 0 ? 'text-blue-600 dark:text-blue-400' : 'text-red-500'}`}>
                            {formatCurrency(res)}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── POR CATEGORIA ── */}
      {activeSection === 'Por Categoria' && (
        <div className="space-y-6">
          {/* Controls */}
          <div className="flex flex-wrap items-center gap-3">
            <select
              value={catMes}
              onChange={(e) => setCatMes(Number(e.target.value))}
              className="rounded-lg border border-border bg-card px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:text-white"
            >
              {MESES.map((m, i) => (
                <option key={i + 1} value={i + 1}>{m}</option>
              ))}
            </select>
            <select
              value={catAno}
              onChange={(e) => setCatAno(Number(e.target.value))}
              className="rounded-lg border border-border bg-card px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:text-white"
            >
              {anos.map((a) => <option key={a} value={a}>{a}</option>)}
            </select>
            <div className="flex overflow-hidden rounded-lg border border-border">
              <button
                onClick={() => setCatTipo('DESPESA')}
                className={`px-4 py-2 text-sm font-medium transition-colors ${
                  catTipo === 'DESPESA'
                    ? 'bg-red-500 text-white'
                    : 'bg-card text-slate-600 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-800'
                }`}
              >
                Despesas
              </button>
              <button
                onClick={() => setCatTipo('RECEITA')}
                className={`px-4 py-2 text-sm font-medium transition-colors ${
                  catTipo === 'RECEITA'
                    ? 'bg-emerald-500 text-white'
                    : 'bg-card text-slate-600 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-800'
                }`}
              >
                Receitas
              </button>
            </div>
          </div>

          {/* Category table */}
          <div className="rounded-xl border border-border bg-card">
            {loadingResumo ? (
              <div className="p-8 text-center text-sm text-slate-400">Carregando...</div>
            ) : !resumoParaCat ? null : (() => {
              const categoriasFiltradas = resumoParaCat.porCategoria.filter((c) => c.tipo === catTipo)
              const total = categoriasFiltradas.reduce((s, c) => s + c.valor, 0)

              return (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="px-5 pb-3 pt-4 text-left font-medium text-slate-500">Categoria</th>
                        <th className="px-5 pb-3 pt-4 text-right font-medium text-slate-500">Valor</th>
                        <th className="px-5 pb-3 pt-4 text-right font-medium text-slate-500">% do Total</th>
                        <th className="px-5 pb-3 pt-4 text-left font-medium text-slate-500">Distribuição</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {categoriasFiltradas.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="py-10 text-center text-slate-400">
                            Nenhum lançamento encontrado para {catTipo === 'DESPESA' ? 'despesas' : 'receitas'} neste período
                          </td>
                        </tr>
                      ) : (
                        categoriasFiltradas.map((c) => (
                          <tr key={c.categoriaId} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                            <td className="px-5 py-3">
                              <div className="flex items-center gap-2.5">
                                <div className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: c.cor }} />
                                <span className="font-medium text-slate-900 dark:text-white">{c.nome}</span>
                              </div>
                            </td>
                            <td className={`px-5 py-3 text-right font-semibold ${catTipo === 'DESPESA' ? 'text-red-500' : 'text-emerald-600 dark:text-emerald-400'}`}>
                              {formatCurrency(c.valor)}
                            </td>
                            <td className="px-5 py-3 text-right text-slate-600 dark:text-slate-400">
                              {c.percentual.toFixed(1)}%
                            </td>
                            <td className="px-5 py-3">
                              <div className="h-2 w-full max-w-[200px] overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700">
                                <div
                                  className={`h-full rounded-full transition-all ${catTipo === 'DESPESA' ? 'bg-red-400' : 'bg-emerald-500'}`}
                                  style={{ width: `${c.percentual}%` }}
                                />
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                    {categoriasFiltradas.length > 0 && (
                      <tfoot>
                        <tr className="border-t-2 border-border bg-slate-50 dark:bg-slate-800/30">
                          <td className="px-5 py-3 font-semibold text-slate-900 dark:text-white">Total</td>
                          <td className={`px-5 py-3 text-right font-bold ${catTipo === 'DESPESA' ? 'text-red-500' : 'text-emerald-600 dark:text-emerald-400'}`}>
                            {formatCurrency(total)}
                          </td>
                          <td className="px-5 py-3 text-right font-medium text-slate-600 dark:text-slate-400">100%</td>
                          <td />
                        </tr>
                      </tfoot>
                    )}
                  </table>
                </div>
              )
            })()}
          </div>
        </div>
      )}

      {/* ── EXTRATO DE CONTA ── */}
      {activeSection === 'Extrato de Conta' && (
        <ExtratoSection
          contas={contas}
          contaId={contaId}
          setContaId={setContaId}
          dataInicio={dataInicio}
          setDataInicio={setDataInicio}
          dataFim={dataFim}
          setDataFim={setDataFim}
        />
      )}
    </div>
  )
}

// ─── Extrato sub-section ──────────────────────────────────────────────────────

interface ExtratoLancamento {
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
  lancamentos: ExtratoLancamento[]
}

async function exportarExtratoPDF(dados: ExtratoData) {
  const jsPDF = (await import('jspdf')).default
  await import('jspdf-autotable')

  const doc = new jsPDF()
  const titulo = `Extrato — ${dados.conta.nome}`

  doc.setFontSize(16)
  doc.text(titulo, 14, 18)
  doc.setFontSize(11)
  doc.text(`Saldo Inicial: ${formatCurrency(dados.saldoInicial)}`, 14, 30)
  doc.text(`Saldo Final: ${formatCurrency(dados.saldoFinal)}`, 14, 37)
  ;(doc as any).autoTable({
    startY: 48,
    head: [['Data', 'Descrição', 'Categoria', 'Valor', 'Saldo']],
    body: dados.lancamentos.map((l) => [
      new Date(l.data + 'T12:00:00').toLocaleDateString('pt-BR'),
      l.descricao,
      l.categoria?.nome ?? '—',
      (l.tipo === 'RECEITA' ? '+' : '-') + formatCurrency(l.valor),
      l.saldoAcumulado != null ? formatCurrency(l.saldoAcumulado) : '—',
    ]),
    theme: 'striped',
    headStyles: { fillColor: [16, 185, 129] },
  })
  doc.save(`${titulo}.pdf`)
}

async function exportarExtratoExcel(dados: ExtratoData) {
  const XLSX = await import('xlsx')
  const rows = dados.lancamentos.map((l) => ({
    Data: new Date(l.data + 'T12:00:00').toLocaleDateString('pt-BR'),
    Descrição: l.descricao,
    Categoria: l.categoria?.nome ?? '—',
    Tipo: l.tipo,
    Valor: l.tipo === 'RECEITA' ? l.valor : -l.valor,
    'Saldo Acumulado': l.saldoAcumulado ?? '',
  }))
  const ws = XLSX.utils.json_to_sheet(rows)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Extrato')
  XLSX.writeFile(wb, `Extrato-${dados.conta.nome}.xlsx`)
}

function ExtratoSection({
  contas, contaId, setContaId, dataInicio, setDataInicio, dataFim, setDataFim,
}: {
  contas: Conta[]
  contaId: string
  setContaId: (v: string) => void
  dataInicio: string
  setDataInicio: (v: string) => void
  dataFim: string
  setDataFim: (v: string) => void
}) {
  const [extrato, setExtrato] = useState<ExtratoData | null>(null)
  const [loading, setLoading] = useState(false)

  const fetchExtrato = useCallback(async () => {
    if (!contaId) return
    setLoading(true)
    try {
      const params = new URLSearchParams({ contaId, dataInicio, dataFim })
      const res = await fetch(`/api/relatorios/extrato?${params}`)
      const d = await res.json()
      if (d.data) setExtrato(d.data)
    } finally {
      setLoading(false)
    }
  }, [contaId, dataInicio, dataFim])

  useEffect(() => {
    if (contaId) fetchExtrato()
  }, [contaId, dataInicio, dataFim, fetchExtrato])

  const totalEntradas = extrato?.lancamentos
    .filter((l) => l.tipo === 'RECEITA' && l.status === 'CONFIRMADO')
    .reduce((s, l) => s + l.valor, 0) ?? 0

  const totalSaidas = extrato?.lancamentos
    .filter((l) => l.tipo === 'DESPESA' && l.status === 'CONFIRMADO')
    .reduce((s, l) => s + l.valor, 0) ?? 0

  return (
    <div className="space-y-5">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <select
          value={contaId}
          onChange={(e) => setContaId(e.target.value)}
          className="rounded-lg border border-border bg-card px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:text-white"
        >
          {contas.map((c) => (
            <option key={c.id} value={c.id}>{c.nome}</option>
          ))}
        </select>
        <input
          type="date"
          value={dataInicio}
          onChange={(e) => setDataInicio(e.target.value)}
          className="rounded-lg border border-border bg-card px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:text-white"
        />
        <span className="text-sm text-slate-400">até</span>
        <input
          type="date"
          value={dataFim}
          onChange={(e) => setDataFim(e.target.value)}
          className="rounded-lg border border-border bg-card px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:text-white"
        />
        <div className="ml-auto flex gap-2">
          <button
            onClick={() => extrato && exportarExtratoPDF(extrato)}
            disabled={!extrato || loading}
            className="flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            <FileText className="h-4 w-4" />
            PDF
          </button>
          <button
            onClick={() => extrato && exportarExtratoExcel(extrato)}
            disabled={!extrato || loading}
            className="flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            <FileSpreadsheet className="h-4 w-4" />
            Excel
          </button>
        </div>
      </div>

      {/* Summary cards */}
      {extrato && !loading && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <SummaryCard label="Saldo Inicial" value={formatCurrency(extrato.saldoInicial)} />
          <SummaryCard label="Total Entradas" value={formatCurrency(totalEntradas)} color="emerald" />
          <SummaryCard label="Total Saídas" value={formatCurrency(totalSaidas)} color="red" />
          <SummaryCard
            label="Saldo Final"
            value={formatCurrency(extrato.saldoFinal)}
            color={extrato.saldoFinal >= 0 ? 'blue' : 'red'}
          />
        </div>
      )}

      {/* Table */}
      <div className="rounded-xl border border-border bg-card">
        {loading ? (
          <div className="p-8 text-center text-sm text-slate-400">Carregando extrato...</div>
        ) : !extrato || extrato.lancamentos.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-14">
            <Download className="mb-3 h-8 w-8 text-slate-300 dark:text-slate-600" />
            <p className="text-sm text-slate-400">Nenhum lançamento no período</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="px-5 pb-3 pt-4 text-left font-medium text-slate-500">Data</th>
                  <th className="px-5 pb-3 pt-4 text-left font-medium text-slate-500">Descrição</th>
                  <th className="px-5 pb-3 pt-4 text-left font-medium text-slate-500">Categoria</th>
                  <th className="px-5 pb-3 pt-4 text-right font-medium text-slate-500">Valor</th>
                  <th className="px-5 pb-3 pt-4 text-right font-medium text-slate-500">Saldo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {extrato.lancamentos.map((l) => (
                  <tr key={l.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                    <td className="px-5 py-3 text-slate-600 dark:text-slate-400">
                      {new Date(l.data + 'T12:00:00').toLocaleDateString('pt-BR')}
                    </td>
                    <td className="px-5 py-3 font-medium text-slate-900 dark:text-white">{l.descricao}</td>
                    <td className="px-5 py-3">
                      {l.categoria ? (
                        <div className="flex items-center gap-1.5">
                          <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: l.categoria.cor }} />
                          <span className="text-slate-600 dark:text-slate-400">{l.categoria.nome}</span>
                        </div>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className={`px-5 py-3 text-right font-semibold ${l.tipo === 'RECEITA' ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500'}`}>
                      {l.tipo === 'RECEITA' ? '+' : '-'}{formatCurrency(l.valor)}
                    </td>
                    <td className="px-5 py-3 text-right text-slate-700 dark:text-slate-300">
                      {l.saldoAcumulado != null ? formatCurrency(l.saldoAcumulado) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Small reusable components ────────────────────────────────────────────────

function KPICard({
  title, value, icon, colorClass, valueClass,
}: {
  title: string
  value: string
  icon: React.ReactNode
  colorClass: string
  valueClass: string
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{title}</p>
          <p className={`mt-1 text-2xl font-bold ${valueClass}`}>{value}</p>
        </div>
        <div className={`rounded-lg p-2.5 ${colorClass}`}>{icon}</div>
      </div>
    </div>
  )
}

function SummaryCard({
  label, value, color = 'default',
}: {
  label: string
  value: string
  color?: 'emerald' | 'red' | 'blue' | 'default'
}) {
  const colorMap = {
    emerald: 'text-emerald-600 dark:text-emerald-400',
    red: 'text-red-500',
    blue: 'text-blue-600 dark:text-blue-400',
    default: 'text-slate-900 dark:text-white',
  }
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <p className="text-xs font-medium text-slate-500">{label}</p>
      <p className={`mt-1 text-lg font-bold ${colorMap[color]}`}>{value}</p>
    </div>
  )
}

function KPISkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      {[1, 2, 3].map((i) => (
        <div key={i} className="rounded-xl border border-border bg-card p-5">
          <div className="h-4 w-20 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
          <div className="mt-2 h-8 w-32 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
        </div>
      ))}
    </div>
  )
}
