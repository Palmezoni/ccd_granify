import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const schema = z.object({
  nome: z.string().min(1).optional(),
  tipo: z.enum(['CORRENTE', 'POUPANCA', 'DINHEIRO', 'INVESTIMENTO', 'OUTROS']).optional(),
  banco: z.string().optional(),
  moeda: z.string().optional(),
  saldoInicial: z.number().optional(),
  cor: z.string().nullable().optional(),
  icone: z.string().nullable().optional(),
  ativa: z.boolean().optional(),
  incluirTotal: z.boolean().optional(),
  ordem: z.number().optional(),
})

async function getContaOrFail(id: string, userId: string, tenantId: string) {
  const conta = await prisma.conta.findFirst({ where: { id, userId, tenantId } })
  if (!conta) return null
  return conta
}

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { id } = await params
  const conta = await getContaOrFail(id, session.userId, session.tenantId)
  if (!conta) return NextResponse.json({ error: 'Conta não encontrada' }, { status: 404 })

  return NextResponse.json({ data: conta })
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { id } = await params
  const conta = await getContaOrFail(id, session.userId, session.tenantId)
  if (!conta) return NextResponse.json({ error: 'Conta não encontrada' }, { status: 404 })

  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Dados inválidos' }, { status: 400 })
  }

  const updated = await prisma.conta.update({
    where: { id },
    data: parsed.data,
  })

  return NextResponse.json({ data: updated })
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { id } = await params
  const conta = await getContaOrFail(id, session.userId, session.tenantId)
  if (!conta) return NextResponse.json({ error: 'Conta não encontrada' }, { status: 404 })

  await prisma.conta.delete({ where: { id } })
  return NextResponse.json({ message: 'Conta excluída' })
}
