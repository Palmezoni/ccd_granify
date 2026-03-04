import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const schema = z.object({
  nome: z.string().min(1).optional(),
  valorAlvo: z.number().positive().optional(),
  dataAlvo: z.string().nullable().optional(),
  cor: z.string().nullable().optional(),
  icone: z.string().nullable().optional(),
  status: z.enum(['EM_ANDAMENTO', 'CONCLUIDA', 'CANCELADA']).optional(),
})

async function getMetaOrFail(id: string, userId: string, tenantId: string) {
  return prisma.metaEconomia.findFirst({ where: { id, userId, tenantId } })
}

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { id } = await params
  const meta = await prisma.metaEconomia.findFirst({
    where: { id, userId: session.userId, tenantId: session.tenantId },
    include: {
      aportes: {
        orderBy: { data: 'desc' },
      },
    },
  })

  if (!meta) return NextResponse.json({ error: 'Meta não encontrada' }, { status: 404 })

  const valorAlvo = Number(meta.valorAlvo)
  const valorAtual = Number(meta.valorAtual)
  const percentual = valorAlvo > 0 ? Math.min(Math.round((valorAtual / valorAlvo) * 100), 100) : 0

  return NextResponse.json({
    data: {
      ...meta,
      valorAlvo,
      valorAtual,
      percentual,
      aportes: meta.aportes.map((a) => ({
        ...a,
        valor: Number(a.valor),
      })),
    },
  })
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { id } = await params
  const meta = await getMetaOrFail(id, session.userId, session.tenantId)
  if (!meta) return NextResponse.json({ error: 'Meta não encontrada' }, { status: 404 })

  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Dados inválidos' }, { status: 400 })
  }

  const { dataAlvo, ...rest } = parsed.data

  const updated = await prisma.metaEconomia.update({
    where: { id },
    data: {
      ...rest,
      ...(dataAlvo !== undefined ? { dataAlvo: dataAlvo ? new Date(dataAlvo) : null } : {}),
    },
  })

  return NextResponse.json({ data: updated })
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { id } = await params
  const meta = await getMetaOrFail(id, session.userId, session.tenantId)
  if (!meta) return NextResponse.json({ error: 'Meta não encontrada' }, { status: 404 })

  await prisma.metaEconomia.delete({ where: { id } })

  return NextResponse.json({ message: 'Meta excluída' })
}
