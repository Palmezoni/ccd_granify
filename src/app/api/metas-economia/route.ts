import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const schema = z.object({
  nome: z.string().min(1, 'Nome é obrigatório'),
  valorAlvo: z.number().positive('Valor alvo deve ser positivo'),
  dataAlvo: z.string().nullable().optional(),
  cor: z.string().nullable().optional(),
  icone: z.string().nullable().optional(),
})

export async function GET(_req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const metas = await prisma.metaEconomia.findMany({
    where: { userId: session.userId },
    orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
    include: {
      _count: { select: { aportes: true } },
    },
  })

  const result = metas.map((meta) => {
    const valorAlvo = Number(meta.valorAlvo)
    const valorAtual = Number(meta.valorAtual)
    const percentual = valorAlvo > 0 ? Math.min(Math.round((valorAtual / valorAlvo) * 100), 100) : 0

    return {
      id: meta.id,
      nome: meta.nome,
      valorAlvo,
      valorAtual,
      dataAlvo: meta.dataAlvo,
      cor: meta.cor,
      icone: meta.icone,
      status: meta.status,
      percentual,
      totalAportes: meta._count.aportes,
      createdAt: meta.createdAt,
    }
  })

  return NextResponse.json({ data: result })
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 })
  }

  const { nome, valorAlvo, dataAlvo, cor, icone } = parsed.data

  const meta = await prisma.metaEconomia.create({
    data: {
      userId: session.userId,
      nome,
      valorAlvo,
      dataAlvo: dataAlvo ? new Date(dataAlvo) : null,
      cor: cor ?? null,
      icone: icone ?? null,
    },
  })

  return NextResponse.json({ data: meta }, { status: 201 })
}
