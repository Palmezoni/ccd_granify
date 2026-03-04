import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const contaId = searchParams.get('contaId')
  const dataInicio = searchParams.get('dataInicio')
  const dataFim = searchParams.get('dataFim')
  const tipo = searchParams.get('tipo') // RECEITA | DESPESA | null
  const categoriaId = searchParams.get('categoriaId')

  const userId = session.userId
  const tenantId = session.tenantId

  if (!contaId) {
    return NextResponse.json({ error: 'contaId é obrigatório' }, { status: 400 })
  }

  // Verify the account belongs to the user and tenant
  const conta = await prisma.conta.findFirst({
    where: { id: contaId, userId, tenantId },
    select: { id: true, nome: true, saldoInicial: true, cor: true },
  })

  if (!conta) {
    return NextResponse.json({ error: 'Conta não encontrada' }, { status: 404 })
  }

  const now = new Date()
  const startDate = dataInicio
    ? new Date(dataInicio + 'T00:00:00')
    : new Date(now.getFullYear(), now.getMonth(), 1)
  const endDate = dataFim
    ? new Date(dataFim + 'T23:59:59.999')
    : new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999)

  // Build filter for lancamentos in period
  const whereInPeriod: Record<string, unknown> = {
    userId,
    tenantId,
    contaId,
    status: { not: 'CANCELADO' },
    data: { gte: startDate, lte: endDate },
  }

  if (tipo && ['RECEITA', 'DESPESA'].includes(tipo)) {
    whereInPeriod.tipo = tipo
  }
  if (categoriaId) {
    whereInPeriod.categoriaId = categoriaId
  }

  // Calculate opening balance: saldoInicial + all confirmed movements before startDate
  const [movimentosAntes, lancamentos] = await Promise.all([
    prisma.lancamento.findMany({
      where: {
        userId,
        tenantId,
        contaId,
        status: 'CONFIRMADO',
        tipo: { in: ['RECEITA', 'DESPESA'] },
        data: { lt: startDate },
      },
      select: { tipo: true, valor: true },
    }),
    prisma.lancamento.findMany({
      where: whereInPeriod,
      orderBy: [{ data: 'asc' }, { createdAt: 'asc' }],
      include: {
        categoria: { select: { id: true, nome: true, cor: true } },
        conta: { select: { id: true, nome: true } },
      },
    }),
  ])

  // Compute opening balance
  let saldoInicial = Number(conta.saldoInicial)
  for (const m of movimentosAntes) {
    if (m.tipo === 'RECEITA') saldoInicial += Number(m.valor)
    else saldoInicial -= Number(m.valor)
  }

  // Build lancamentos with running balance
  let saldoAcumulado = saldoInicial
  const lancamentosComSaldo = lancamentos.map((l) => {
    const valor = Number(l.valor)
    if (l.status === 'CONFIRMADO') {
      if (l.tipo === 'RECEITA') saldoAcumulado += valor
      else if (l.tipo === 'DESPESA') saldoAcumulado -= valor
    }

    return {
      id: l.id,
      data: l.data.toISOString().split('T')[0],
      descricao: l.descricao,
      tipo: l.tipo,
      valor,
      status: l.status,
      categoria: l.categoria ? { nome: l.categoria.nome, cor: l.categoria.cor } : null,
      saldoAcumulado: l.status === 'CONFIRMADO' ? saldoAcumulado : null,
    }
  })

  const saldoFinal = saldoAcumulado

  // Current account balance (all time)
  const todosMovimentos = await prisma.lancamento.findMany({
    where: {
      userId,
      tenantId,
      contaId,
      status: 'CONFIRMADO',
      tipo: { in: ['RECEITA', 'DESPESA'] },
    },
    select: { tipo: true, valor: true },
  })

  let saldoAtual = Number(conta.saldoInicial)
  for (const m of todosMovimentos) {
    if (m.tipo === 'RECEITA') saldoAtual += Number(m.valor)
    else saldoAtual -= Number(m.valor)
  }

  return NextResponse.json({
    data: {
      conta: {
        id: conta.id,
        nome: conta.nome,
        saldoAtual,
      },
      saldoInicial,
      saldoFinal,
      lancamentos: lancamentosComSaldo,
    },
  })
}
