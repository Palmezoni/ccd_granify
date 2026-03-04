import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const schema = z.object({
  texto: z.string().min(2).optional(),
  categoriaId: z.string().nullable().optional(),
  contaId: z.string().nullable().optional(),
  descricao: z.string().nullable().optional(),
  ativa: z.boolean().optional(),
})

async function getRegraOrFail(id: string, userId: string, tenantId: string) {
  return prisma.regraPreenchi.findFirst({ where: { id, userId, tenantId } })
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { id } = await params
  const regra = await getRegraOrFail(id, session.userId, session.tenantId)
  if (!regra) return NextResponse.json({ error: 'Regra não encontrada' }, { status: 404 })

  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Dados inválidos' }, { status: 400 })
  }

  const updated = await prisma.regraPreenchi.update({
    where: { id },
    data: parsed.data,
  })

  return NextResponse.json({ data: updated })
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { id } = await params
  const regra = await getRegraOrFail(id, session.userId, session.tenantId)
  if (!regra) return NextResponse.json({ error: 'Regra não encontrada' }, { status: 404 })

  await prisma.regraPreenchi.delete({ where: { id } })

  return NextResponse.json({ message: 'Regra excluída' })
}
