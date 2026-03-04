import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const createSchema = z.object({
  mes: z.number().int().min(1).max(12).optional(),
  ano: z.number().int().min(2000).optional(),
})

/**
 * Calculate the closing and due dates for a fatura given a card's configuration.
 * The fechamento (closing) date is the diaFechamento of the given month.
 * The vencimento (due) date is the diaVencimento of the NEXT month.
 */
function calcularDatas(
  mes: number,
  ano: number,
  diaFechamento: number,
  diaVencimento: number
): { dataFechamento: Date; dataVencimento: Date } {
  // Clamp day to last day of month (handles months with fewer days)
  const lastDayFechamento = new Date(ano, mes, 0).getDate()
  const clampedFechamento = Math.min(diaFechamento, lastDayFechamento)
  const dataFechamento = new Date(ano, mes - 1, clampedFechamento)

  // Vencimento is in the following month
  const nextMes = mes === 12 ? 1 : mes + 1
  const nextAno = mes === 12 ? ano + 1 : ano
  const lastDayVencimento = new Date(nextAno, nextMes, 0).getDate()
  const clampedVencimento = Math.min(diaVencimento, lastDayVencimento)
  const dataVencimento = new Date(nextAno, nextMes - 1, clampedVencimento)

  return { dataFechamento, dataVencimento }
}

async function getOrCreateFatura(cartaoId: string, mes: number, ano: number) {
  const cartao = await prisma.cartaoCredito.findUnique({
    where: { id: cartaoId },
    select: { diaFechamento: true, diaVencimento: true },
  })

  if (!cartao) throw new Error('Cartão não encontrado')

  const { dataFechamento, dataVencimento } = calcularDatas(
    mes,
    ano,
    cartao.diaFechamento,
    cartao.diaVencimento
  )

  const existing = await prisma.faturaCartao.findUnique({
    where: { cartaoId_mes_ano: { cartaoId, mes, ano } },
  })

  if (existing) return existing

  return prisma.faturaCartao.create({
    data: {
      cartaoId,
      mes,
      ano,
      valorTotal: 0,
      status: 'ABERTA',
      dataFechamento,
      dataVencimento,
    },
  })
}

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { id: cartaoId } = await params

  // Verify card belongs to user
  const cartao = await prisma.cartaoCredito.findFirst({
    where: { id: cartaoId, userId: session.userId },
  })
  if (!cartao) return NextResponse.json({ error: 'Cartão não encontrado' }, { status: 404 })

  // Last 12 months
  const now = new Date()
  const twelveMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 11, 1)

  const faturas = await prisma.faturaCartao.findMany({
    where: {
      cartaoId,
      OR: [
        { ano: { gt: twelveMonthsAgo.getFullYear() } },
        {
          ano: twelveMonthsAgo.getFullYear(),
          mes: { gte: twelveMonthsAgo.getMonth() + 1 },
        },
      ],
    },
    include: {
      lancamentos: {
        select: { id: true, valor: true, tipo: true, status: true },
      },
      conta: { select: { id: true, nome: true } },
    },
    orderBy: [{ ano: 'desc' }, { mes: 'desc' }],
  })

  // Compute valorTotal from lancamentos for each fatura
  const faturasComTotal = faturas.map((f) => {
    const total = f.lancamentos
      .filter((l) => l.status !== 'CANCELADO')
      .reduce((sum, l) => sum + Number(l.valor), 0)
    return { ...f, valorTotal: total }
  })

  return NextResponse.json({ data: faturasComTotal })
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { id: cartaoId } = await params

  // Verify card belongs to user
  const cartao = await prisma.cartaoCredito.findFirst({
    where: { id: cartaoId, userId: session.userId },
  })
  if (!cartao) return NextResponse.json({ error: 'Cartão não encontrado' }, { status: 404 })

  const body = await req.json().catch(() => ({}))
  const parsed = createSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 })
  }

  const now = new Date()
  const mes = parsed.data.mes ?? now.getMonth() + 1
  const ano = parsed.data.ano ?? now.getFullYear()

  try {
    const fatura = await getOrCreateFatura(cartaoId, mes, ano)
    return NextResponse.json({ data: fatura }, { status: 201 })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro ao criar fatura'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
