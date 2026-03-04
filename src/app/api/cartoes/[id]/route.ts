import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const updateSchema = z.object({
  nome: z.string().min(1).optional(),
  bandeira: z.enum(['VISA', 'MASTERCARD', 'ELO', 'AMEX', 'HIPERCARD', 'OUTROS']).optional(),
  limite: z.number().positive().optional(),
  diaFechamento: z.number().int().min(1).max(31).optional(),
  diaVencimento: z.number().int().min(1).max(31).optional(),
  cor: z.string().nullable().optional(),
  contaDebitoId: z.string().nullable().optional(),
  ativa: z.boolean().optional(),
})

async function getCartaoOrFail(id: string, userId: string) {
  return prisma.cartaoCredito.findFirst({ where: { id, userId } })
}

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { id } = await params
  const cartao = await getCartaoOrFail(id, session.userId)
  if (!cartao) return NextResponse.json({ error: 'Cartão não encontrado' }, { status: 404 })

  // Get last 6 months of faturas
  const now = new Date()
  const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1)

  const cartaoDetalhado = await prisma.cartaoCredito.findFirst({
    where: { id, userId: session.userId },
    include: {
      faturas: {
        where: {
          OR: [
            { ano: { gt: sixMonthsAgo.getFullYear() } },
            {
              ano: sixMonthsAgo.getFullYear(),
              mes: { gte: sixMonthsAgo.getMonth() + 1 },
            },
          ],
        },
        orderBy: [{ ano: 'desc' }, { mes: 'desc' }],
        include: {
          lancamentos: {
            where: { status: 'CONFIRMADO' },
            orderBy: { data: 'desc' },
          },
        },
      },
      subCartoes: { where: { ativo: true } },
    },
  })

  return NextResponse.json({ data: cartaoDetalhado })
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { id } = await params
  const cartao = await getCartaoOrFail(id, session.userId)
  if (!cartao) return NextResponse.json({ error: 'Cartão não encontrado' }, { status: 404 })

  const body = await req.json()
  const parsed = updateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Dados inválidos' }, { status: 400 })
  }

  const updated = await prisma.cartaoCredito.update({
    where: { id },
    data: parsed.data,
  })

  return NextResponse.json({ data: updated })
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { id } = await params
  const cartao = await getCartaoOrFail(id, session.userId)
  if (!cartao) return NextResponse.json({ error: 'Cartão não encontrado' }, { status: 404 })

  // Check if there are lancamentos associated with this card
  const lancamentosCount = await prisma.lancamento.count({
    where: { faturaId: { in: (await prisma.faturaCartao.findMany({ where: { cartaoId: id }, select: { id: true } })).map(f => f.id) } },
  })

  if (lancamentosCount > 0) {
    return NextResponse.json(
      { error: `Não é possível excluir: o cartão possui ${lancamentosCount} lançamento(s) em faturas` },
      { status: 409 }
    )
  }

  await prisma.cartaoCredito.delete({ where: { id } })
  return NextResponse.json({ message: 'Cartão excluído com sucesso' })
}
