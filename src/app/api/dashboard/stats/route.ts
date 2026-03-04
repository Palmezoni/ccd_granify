import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { userId, tenantId } = session
  const url = new URL(req.url)

  const now = new Date()
  const defaultInicio = new Date(now.getFullYear(), now.getMonth(), 1)
  const defaultFim = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999)

  const inicioStr = url.searchParams.get('inicio')
  const fimStr = url.searchParams.get('fim')
  const contasParam = url.searchParams.get('contas')

  const inicio = inicioStr ? new Date(inicioStr + 'T00:00:00') : defaultInicio
  const fim = fimStr ? new Date(fimStr + 'T23:59:59.999') : defaultFim
  const contasFiltro: string[] | null = contasParam ? contasParam.split(',').filter(Boolean) : null

  // Date range for last 12 months (evolution chart — always full range regardless of period filter)
  const dozeAtras = new Date(now.getFullYear(), now.getMonth() - 11, 1)

  const contaIdFilter = contasFiltro ? { id: { in: contasFiltro } } : {}
  const lancamentoContaFilter = contasFiltro ? { contaId: { in: contasFiltro } } : {}

  const [contas, allLancamentos, periodLancamentos, evolucaoLancamentos] = await Promise.all([
    // All active accounts (filtered by selection if any)
    prisma.conta.findMany({
      where: { userId, tenantId, ativa: true, ...contaIdFilter },
      select: { id: true, nome: true, saldoInicial: true, cor: true, tipo: true, incluirTotal: true },
      orderBy: { ordem: 'asc' },
    }),

    // All-time CONFIRMED transactions (for live saldo calculation)
    prisma.lancamento.findMany({
      where: {
        userId,
        tenantId,
        status: 'CONFIRMADO',
        ...(contasFiltro
          ? { OR: [{ contaId: { in: contasFiltro } }, { contaDestinoId: { in: contasFiltro } }] }
          : {}),
      },
      select: { tipo: true, valor: true, contaId: true, contaDestinoId: true },
    }),

    // Transactions within selected period
    prisma.lancamento.findMany({
      where: {
        userId,
        tenantId,
        data: { gte: inicio, lte: fim },
        ...lancamentoContaFilter,
      },
      select: {
        id: true,
        descricao: true,
        valor: true,
        tipo: true,
        data: true,
        status: true,
        contaId: true,
        categoria: { select: { id: true, nome: true, cor: true } },
        conta: { select: { nome: true } },
      },
      orderBy: [{ data: 'desc' }, { createdAt: 'desc' }],
    }),

    // Last 12 months of RECEITA/DESPESA (for evolution chart)
    prisma.lancamento.findMany({
      where: {
        userId,
        tenantId,
        status: 'CONFIRMADO',
        tipo: { in: ['RECEITA', 'DESPESA'] },
        data: { gte: dozeAtras },
        ...lancamentoContaFilter,
      },
      select: { tipo: true, valor: true, data: true },
    }),
  ])

  // ─── Calculate live saldo per account ────────────────────────────────────────
  const contasComSaldo = contas.map((conta) => {
    let saldo = Number(conta.saldoInicial)
    for (const l of allLancamentos) {
      if (l.tipo === 'RECEITA' && l.contaId === conta.id) saldo += Number(l.valor)
      if (l.tipo === 'DESPESA' && l.contaId === conta.id) saldo -= Number(l.valor)
      if (l.tipo === 'TRANSFERENCIA' && l.contaId === conta.id) saldo -= Number(l.valor)
      if (l.tipo === 'TRANSFERENCIA' && l.contaDestinoId === conta.id) saldo += Number(l.valor)
    }
    return { ...conta, saldoInicial: Number(conta.saldoInicial), saldo }
  })

  const saldoTotal = contasComSaldo.filter((c) => c.incluirTotal).reduce((s, c) => s + c.saldo, 0)

  // ─── KPIs from period (CONFIRMADO only) ──────────────────────────────────────
  const confirmed = periodLancamentos.filter((l) => l.status === 'CONFIRMADO')
  const receitasMes = confirmed
    .filter((l) => l.tipo === 'RECEITA')
    .reduce((s, l) => s + Number(l.valor), 0)
  const despesasMes = confirmed
    .filter((l) => l.tipo === 'DESPESA')
    .reduce((s, l) => s + Number(l.valor), 0)
  const resultado = receitasMes - despesasMes

  // ─── Last 8 transactions (all statuses, within period) ───────────────────────
  const ultimos8 = periodLancamentos.slice(0, 8)

  // ─── Despesas por categoria (period, confirmed) ──────────────────────────────
  const catMap = new Map<string, { nome: string; cor: string | null; total: number }>()
  for (const l of confirmed.filter((l) => l.tipo === 'DESPESA')) {
    const catId = l.categoria?.id ?? '__sem__'
    const catNome = l.categoria?.nome ?? 'Sem categoria'
    const catCor = l.categoria?.cor ?? null
    const entry = catMap.get(catId) ?? { nome: catNome, cor: catCor, total: 0 }
    entry.total += Number(l.valor)
    catMap.set(catId, entry)
  }
  const despesasPorCategoria = Array.from(catMap.values())
    .sort((a, b) => b.total - a.total)
    .slice(0, 8)

  // ─── Evolution: last 12 months ───────────────────────────────────────────────
  const evolucaoMap = new Map<string, { receitas: number; despesas: number }>()
  for (const l of evolucaoLancamentos) {
    const d = new Date(l.data)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const entry = evolucaoMap.get(key) ?? { receitas: 0, despesas: 0 }
    if (l.tipo === 'RECEITA') entry.receitas += Number(l.valor)
    else entry.despesas += Number(l.valor)
    evolucaoMap.set(key, entry)
  }

  const evolucao = []
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const label = d.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '')
    const entry = evolucaoMap.get(key) ?? { receitas: 0, despesas: 0 }
    evolucao.push({ mes: label, receitas: entry.receitas, despesas: entry.despesas })
  }

  return NextResponse.json({
    kpis: { saldoTotal, receitasMes, despesasMes, resultado },
    contas: contasComSaldo,
    ultimos8,
    despesasPorCategoria,
    evolucao,
    periodo: { inicio: inicio.toISOString(), fim: fim.toISOString() },
  })
}
