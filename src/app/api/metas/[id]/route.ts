import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const schema = z.object({
  categoriaId: z.string().nullable().optional(),
  tipo: z.enum(['DESPESA', 'RECEITA']).optional(),
  valor: z.number().positive('Valor deve ser positivo').optional(),
  mes: z.number().int().min(1).max(12).optional(),
  ano: z.number().int().min(2000).max(2100).optional(),
})

async function getMetaOrFail(id: string, userId: string) {
  return prisma.meta.findFirst({ where: { id, userId } })
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { id } = await params
  const meta = await getMetaOrFail(id, session.userId)
  if (!meta) return NextResponse.json({ error: 'Meta não encontrada' }, { status: 404 })

  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 })
  }

  const updated = await prisma.meta.update({
    where: { id },
    data: parsed.data,
    include: {
      categoria: { select: { id: true, nome: true, cor: true, icone: true, tipo: true } },
    },
  })

  return NextResponse.json({ data: updated })
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { id } = await params
  const meta = await getMetaOrFail(id, session.userId)
  if (!meta) return NextResponse.json({ error: 'Meta não encontrada' }, { status: 404 })

  await prisma.meta.delete({ where: { id } })

  return NextResponse.json({ message: 'Meta excluída' })
}
