import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const schema = z.object({
  nome: z.string().min(1, 'Nome é obrigatório'),
  tipo: z.enum(['CORRENTE', 'POUPANCA', 'DINHEIRO', 'INVESTIMENTO', 'OUTROS']),
  banco: z.string().optional(),
  moeda: z.string().default('BRL'),
  saldoInicial: z.number().default(0),
  cor: z.string().optional(),
  icone: z.string().optional(),
  incluirTotal: z.boolean().default(true),
  ordem: z.number().default(0),
})

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const contas = await prisma.conta.findMany({
    where: { userId: session.userId },
    orderBy: [{ ordem: 'asc' }, { createdAt: 'asc' }],
  })

  return NextResponse.json({ data: contas })
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Dados inválidos' }, { status: 400 })
  }

  const conta = await prisma.conta.create({
    data: { ...parsed.data, userId: session.userId },
  })

  return NextResponse.json({ data: conta }, { status: 201 })
}
