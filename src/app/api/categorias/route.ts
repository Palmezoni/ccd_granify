import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const schema = z.object({
  nome: z.string().min(1, 'Nome é obrigatório'),
  tipo: z.enum(['RECEITA', 'DESPESA', 'AMBOS']),
  cor: z.string().optional(),
  icone: z.string().optional(),
  paiId: z.string().nullable().optional(),
  ordem: z.number().default(0),
})

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const categorias = await prisma.categoria.findMany({
    where: { userId: session.userId, paiId: null },
    orderBy: [{ ordem: 'asc' }, { nome: 'asc' }],
    include: {
      filhos: { orderBy: [{ ordem: 'asc' }, { nome: 'asc' }] },
    },
  })

  return NextResponse.json({ data: categorias })
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 })
  }

  const categoria = await prisma.categoria.create({
    data: { ...parsed.data, userId: session.userId },
  })

  return NextResponse.json({ data: categoria }, { status: 201 })
}
