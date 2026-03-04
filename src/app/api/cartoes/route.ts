import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const schema = z.object({
  nome: z.string().min(1, 'Nome é obrigatório'),
  bandeira: z.enum(['VISA', 'MASTERCARD', 'ELO', 'AMEX', 'HIPERCARD', 'OUTROS']),
  limite: z.number().positive('Limite deve ser positivo'),
  diaFechamento: z.number().int().min(1).max(31),
  diaVencimento: z.number().int().min(1).max(31),
  cor: z.string().optional().nullable(),
  contaDebitoId: z.string().optional().nullable(),
})

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const cartoes = await prisma.cartaoCredito.findMany({
    where: { userId: session.userId, ativa: true },
    include: {
      faturas: {
        where: { status: 'ABERTA' },
        take: 1,
        orderBy: [{ ano: 'desc' }, { mes: 'desc' }],
      },
    },
    orderBy: { createdAt: 'asc' },
  })

  return NextResponse.json({ data: cartoes })
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Dados inválidos' }, { status: 400 })
  }

  const cartao = await prisma.cartaoCredito.create({
    data: {
      ...parsed.data,
      userId: session.userId,
    },
  })

  return NextResponse.json({ data: cartao }, { status: 201 })
}
