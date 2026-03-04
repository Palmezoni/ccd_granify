import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const userId = session.userId
  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999)

  const [contas, receitasAgg, despesasAgg, transRecebidasAgg, transEnviadasAgg, ultimos5] =
    await Promise.all([
      // All active accounts that should be included in total
      prisma.conta.findMany({
        where: { userId, ativa: true, incluirTotal: true },
        select: { id: true, saldoInicial: true },
      }),

      // Sum of RECEITA CONFIRMADO for current month
      prisma.lancamento.aggregate({
        where: {
          userId,
          tipo: 'RECEITA',
          status: 'CONFIRMADO',
          data: { gte: startOfMonth, lte: endOfMonth },
        },
        _sum: { valor: true },
      }),

      // Sum of DESPESA CONFIRMADO for current month
      prisma.lancamento.aggregate({
        where: {
          userId,
          tipo: 'DESPESA',
          status: 'CONFIRMADO',
          data: { gte: startOfMonth, lte: endOfMonth },
        },
        _sum: { valor: true },
      }),

      // For saldo: sum all RECEITA CONFIRMADO across all time (no month filter)
      prisma.lancamento.groupBy({
        by: ['contaId'],
        where: { userId, tipo: 'RECEITA', status: 'CONFIRMADO' },
        _sum: { valor: true },
      }),

      // For saldo: sum all DESPESA CONFIRMADO across all time (no month filter)
      prisma.lancamento.groupBy({
        by: ['contaId'],
        where: { userId, tipo: 'DESPESA', status: 'CONFIRMADO' },
        _sum: { valor: true },
      }),

      // Last 5 lancamentos
      prisma.lancamento.findMany({
        where: { userId },
        orderBy: [{ data: 'desc' }, { createdAt: 'desc' }],
        take: 5,
        include: {
          categoria: { select: { id: true, nome: true, cor: true, icone: true } },
          conta: { select: { id: true, nome: true, cor: true } },
          contaDestino: { select: { id: true, nome: true, cor: true } },
        },
      }),
    ])

  // Build lookup maps for conta-level transaction sums
  const receitasPorConta = new Map<string, number>()
  for (const row of transRecebidasAgg) {
    if (row.contaId) {
      receitasPorConta.set(row.contaId, Number(row._sum.valor ?? 0))
    }
  }

  const despesasPorConta = new Map<string, number>()
  for (const row of transEnviadasAgg) {
    if (row.contaId) {
      despesasPorConta.set(row.contaId, Number(row._sum.valor ?? 0))
    }
  }

  // Calculate dynamic saldo total
  const saldoTotal = contas.reduce((sum, conta) => {
    const saldoInicial = Number(conta.saldoInicial)
    const receitas = receitasPorConta.get(conta.id) ?? 0
    const despesas = despesasPorConta.get(conta.id) ?? 0
    return sum + saldoInicial + receitas - despesas
  }, 0)

  const receitasMes = Number(receitasAgg._sum.valor ?? 0)
  const despesasMes = Number(despesasAgg._sum.valor ?? 0)
  const resultado = receitasMes - despesasMes

  return NextResponse.json({
    data: {
      saldoTotal,
      receitasMes,
      despesasMes,
      resultado,
      ultimos5lancamentos: ultimos5,
    },
  })
}
