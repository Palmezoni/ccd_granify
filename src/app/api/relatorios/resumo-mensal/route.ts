import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const now = new Date()
  const mes = parseInt(searchParams.get('mes') || String(now.getMonth() + 1), 10)
  const ano = parseInt(searchParams.get('ano') || String(now.getFullYear()), 10)

  const startOfMonth = new Date(ano, mes - 1, 1)
  const endOfMonth = new Date(ano, mes, 0, 23, 59, 59, 999)

  const userId = session.userId

  // Receitas e despesas do mês
  const [receitasAgg, despesasAgg, lancamentosMes, contas] = await Promise.all([
    prisma.lancamento.aggregate({
      where: {
        userId,
        tipo: 'RECEITA',
        status: 'CONFIRMADO',
        data: { gte: startOfMonth, lte: endOfMonth },
      },
      _sum: { valor: true },
    }),
    prisma.lancamento.aggregate({
      where: {
        userId,
        tipo: 'DESPESA',
        status: 'CONFIRMADO',
        data: { gte: startOfMonth, lte: endOfMonth },
      },
      _sum: { valor: true },
    }),
    prisma.lancamento.findMany({
      where: {
        userId,
        status: 'CONFIRMADO',
        tipo: { in: ['RECEITA', 'DESPESA'] },
        data: { gte: startOfMonth, lte: endOfMonth },
      },
      include: {
        categoria: { select: { id: true, nome: true, cor: true, tipo: true } },
      },
    }),
    prisma.conta.findMany({
      where: { userId, ativa: true },
      select: { id: true, nome: true, cor: true, saldoInicial: true },
    }),
  ])

  const receitas = Number(receitasAgg._sum.valor ?? 0)
  const despesas = Number(despesasAgg._sum.valor ?? 0)
  const resultado = receitas - despesas

  // Agrupamento por categoria
  const porCategoriaMap = new Map<string, {
    categoriaId: string
    nome: string
    cor: string
    tipo: string
    valor: number
  }>()

  for (const l of lancamentosMes) {
    if (!l.categoriaId || !l.categoria) continue
    const key = l.categoriaId
    const existing = porCategoriaMap.get(key)
    if (existing) {
      existing.valor += Number(l.valor)
    } else {
      porCategoriaMap.set(key, {
        categoriaId: l.categoriaId,
        nome: l.categoria.nome,
        cor: l.categoria.cor ?? '#6b7280',
        tipo: l.tipo,
        valor: Number(l.valor),
      })
    }
  }

  const porCategoria = Array.from(porCategoriaMap.values()).map((c) => ({
    ...c,
    percentual: c.tipo === 'DESPESA'
      ? despesas > 0 ? Math.round((c.valor / despesas) * 10000) / 100 : 0
      : receitas > 0 ? Math.round((c.valor / receitas) * 10000) / 100 : 0,
  })).sort((a, b) => b.valor - a.valor)

  // Saldo por conta (saldoInicial + receitas - despesas até o fim do mês)
  const lancamentosPorConta = await prisma.lancamento.groupBy({
    by: ['contaId', 'tipo'],
    where: {
      userId,
      status: 'CONFIRMADO',
      tipo: { in: ['RECEITA', 'DESPESA'] },
      data: { lte: endOfMonth },
      contaId: { not: null },
    },
    _sum: { valor: true },
  })

  const saldoPorConta = new Map<string, number>()
  for (const conta of contas) {
    saldoPorConta.set(conta.id, Number(conta.saldoInicial))
  }
  for (const row of lancamentosPorConta) {
    if (!row.contaId) continue
    const current = saldoPorConta.get(row.contaId) ?? 0
    const val = Number(row._sum.valor ?? 0)
    saldoPorConta.set(
      row.contaId,
      row.tipo === 'RECEITA' ? current + val : current - val
    )
  }

  const porConta = contas.map((c) => ({
    contaId: c.id,
    nome: c.nome,
    cor: c.cor ?? '#6b7280',
    saldo: saldoPorConta.get(c.id) ?? Number(c.saldoInicial),
  }))

  // Evolução dos últimos 6 meses
  const evolucao: Array<{
    mes: number
    ano: number
    label: string
    receitas: number
    despesas: number
  }> = []

  const MESES_LABEL = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']

  for (let i = 5; i >= 0; i--) {
    const d = new Date(ano, mes - 1 - i, 1)
    const mI = d.getMonth() + 1
    const aI = d.getFullYear()
    const start = new Date(aI, mI - 1, 1)
    const end = new Date(aI, mI, 0, 23, 59, 59, 999)

    const [r, dp] = await Promise.all([
      prisma.lancamento.aggregate({
        where: { userId, tipo: 'RECEITA', status: 'CONFIRMADO', data: { gte: start, lte: end } },
        _sum: { valor: true },
      }),
      prisma.lancamento.aggregate({
        where: { userId, tipo: 'DESPESA', status: 'CONFIRMADO', data: { gte: start, lte: end } },
        _sum: { valor: true },
      }),
    ])

    evolucao.push({
      mes: mI,
      ano: aI,
      label: `${MESES_LABEL[mI - 1]}/${String(aI).slice(2)}`,
      receitas: Number(r._sum.valor ?? 0),
      despesas: Number(dp._sum.valor ?? 0),
    })
  }

  return NextResponse.json({
    data: {
      receitas,
      despesas,
      resultado,
      porCategoria,
      porConta,
      evolucao,
    },
  })
}
