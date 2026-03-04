import { NextRequest, NextResponse } from 'next/server'
import { getSessionFromRequest } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

const MONTH_NAMES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']

export async function GET(request: NextRequest) {
  const session = await getSessionFromRequest(request)
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const userId = session.userId
  const tenantId = session.tenantId
  const { searchParams } = new URL(request.url)
  const ano = parseInt(searchParams.get('ano') ?? String(new Date().getFullYear()), 10)

  // Fetch all lancamentos for the year (exclude CANCELADO and TRANSFERENCIA)
  const [lancamentos, categoriasData] = await Promise.all([
    prisma.lancamento.findMany({
      where: {
        userId,
        tenantId,
        data: { gte: new Date(ano, 0, 1), lt: new Date(ano + 1, 0, 1) },
        status: { not: 'CANCELADO' },
        tipo: { not: 'TRANSFERENCIA' },
      },
      select: { tipo: true, valor: true, data: true, categoriaId: true },
    }),

    // Fetch por categoria (with category info)
    prisma.lancamento.findMany({
      where: {
        userId,
        tenantId,
        data: { gte: new Date(ano, 0, 1), lt: new Date(ano + 1, 0, 1) },
        status: { not: 'CANCELADO' },
        tipo: { not: 'TRANSFERENCIA' },
        categoriaId: { not: null },
      },
      select: {
        tipo: true,
        valor: true,
        categoria: { select: { id: true, nome: true, cor: true, tipo: true } },
      },
    }),
  ])

  // Build monthly data
  const monthly = Array.from({ length: 12 }, (_, i) => {
    const mes = i + 1
    const items = lancamentos.filter((l) => new Date(l.data).getMonth() + 1 === mes)
    const receitas = items
      .filter((l) => l.tipo === 'RECEITA')
      .reduce((s, l) => s + Number(l.valor), 0)
    const despesas = items
      .filter((l) => l.tipo === 'DESPESA')
      .reduce((s, l) => s + Number(l.valor), 0)
    return {
      mes,
      label: MONTH_NAMES[i],
      receitas: Math.round(receitas * 100) / 100,
      despesas: Math.round(despesas * 100) / 100,
      resultado: Math.round((receitas - despesas) * 100) / 100,
      saldoAcumulado: 0, // populated below
    }
  })

  // Compute saldoAcumulado (running sum)
  let acc = 0
  for (const m of monthly) {
    acc += m.resultado
    m.saldoAcumulado = Math.round(acc * 100) / 100
  }

  // Build por categoria map
  const catMap = new Map<
    string,
    { categoriaId: string; nome: string; cor: string; tipo: string; total: number }
  >()

  for (const l of categoriasData) {
    if (!l.categoria) continue
    const cat = l.categoria
    const existing = catMap.get(cat.id)
    const valor = Number(l.valor)
    if (existing) {
      existing.total = Math.round((existing.total + valor) * 100) / 100
    } else {
      catMap.set(cat.id, {
        categoriaId: cat.id,
        nome: cat.nome,
        cor: cat.cor ?? '#64748b',
        tipo: l.tipo,
        total: Math.round(valor * 100) / 100,
      })
    }
  }

  const porCategoria = Array.from(catMap.values()).sort((a, b) => b.total - a.total)

  // Totals
  const totais = monthly.reduce(
    (acc, m) => ({
      receitas: Math.round((acc.receitas + m.receitas) * 100) / 100,
      despesas: Math.round((acc.despesas + m.despesas) * 100) / 100,
      resultado: Math.round((acc.resultado + m.resultado) * 100) / 100,
    }),
    { receitas: 0, despesas: 0, resultado: 0 }
  )

  return NextResponse.json({
    data: {
      ano,
      mensal: monthly,
      porCategoria,
      totais,
    },
  })
}
