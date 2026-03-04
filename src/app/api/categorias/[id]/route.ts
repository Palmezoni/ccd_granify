import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const schema = z.object({
  nome: z.string().min(1).optional(),
  tipo: z.enum(['RECEITA', 'DESPESA', 'AMBOS']).optional(),
  cor: z.string().nullable().optional(),
  icone: z.string().nullable().optional(),
  paiId: z.string().nullable().optional(),
  ordem: z.number().optional(),
})

async function getCategoriaOrFail(id: string, userId: string, tenantId: string) {
  return prisma.categoria.findFirst({ where: { id, userId, tenantId } })
}

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { id } = await params
  const cat = await getCategoriaOrFail(id, session.userId, session.tenantId)
  if (!cat) return NextResponse.json({ error: 'Categoria não encontrada' }, { status: 404 })

  return NextResponse.json({ data: cat })
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { id } = await params
  const cat = await getCategoriaOrFail(id, session.userId, session.tenantId)
  if (!cat) return NextResponse.json({ error: 'Categoria não encontrada' }, { status: 404 })

  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Dados inválidos' }, { status: 400 })
  }

  const updated = await prisma.categoria.update({ where: { id }, data: parsed.data })
  return NextResponse.json({ data: updated })
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { id } = await params
  const cat = await getCategoriaOrFail(id, session.userId, session.tenantId)
  if (!cat) return NextResponse.json({ error: 'Categoria não encontrada' }, { status: 404 })

  // Remove sub-categorias junto
  await prisma.categoria.deleteMany({ where: { paiId: id } })
  await prisma.categoria.delete({ where: { id } })

  return NextResponse.json({ message: 'Categoria excluída' })
}
