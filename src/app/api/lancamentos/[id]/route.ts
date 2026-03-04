import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const schema = z.object({
  tipo: z.enum(['RECEITA', 'DESPESA', 'TRANSFERENCIA']).optional(),
  descricao: z.string().min(1, 'Descrição é obrigatória').optional(),
  valor: z.number().positive('Valor deve ser positivo').optional(),
  data: z.string().optional(),
  categoriaId: z.string().nullable().optional(),
  contaId: z.string().nullable().optional(),
  contaDestinoId: z.string().nullable().optional(),
  cartaoId: z.string().nullable().optional(),
  faturaId: z.string().nullable().optional(),
  status: z.enum(['CONFIRMADO', 'PROJETADO', 'CANCELADO']).optional(),
  observacao: z.string().nullable().optional(),
})

async function getLancamentoOrFail(id: string, userId: string) {
  return prisma.lancamento.findFirst({
    where: { id, userId },
    include: {
      categoria: { select: { id: true, nome: true, cor: true, icone: true } },
      conta: { select: { id: true, nome: true, cor: true } },
      contaDestino: { select: { id: true, nome: true, cor: true } },
    },
  })
}

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { id } = await params
  const lancamento = await getLancamentoOrFail(id, session.userId)
  if (!lancamento) return NextResponse.json({ error: 'Lançamento não encontrado' }, { status: 404 })

  return NextResponse.json({ data: lancamento })
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { id } = await params
  const lancamento = await getLancamentoOrFail(id, session.userId)
  if (!lancamento) return NextResponse.json({ error: 'Lançamento não encontrado' }, { status: 404 })

  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Dados inválidos' }, { status: 400 })
  }

  const updateData: Record<string, unknown> = { ...parsed.data }

  if (parsed.data.data) {
    updateData.data = new Date(parsed.data.data)
  }

  const updated = await prisma.lancamento.update({
    where: { id },
    data: updateData,
    include: {
      categoria: { select: { id: true, nome: true, cor: true, icone: true } },
      conta: { select: { id: true, nome: true, cor: true } },
      contaDestino: { select: { id: true, nome: true, cor: true } },
    },
  })

  return NextResponse.json({ data: updated })
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { id } = await params
  const lancamento = await getLancamentoOrFail(id, session.userId)
  if (!lancamento) return NextResponse.json({ error: 'Lançamento não encontrado' }, { status: 404 })

  const { searchParams } = new URL(req.url)
  const deleteAll = searchParams.get('deleteAll') === 'true'

  // If has parcelas > 1 or recorrenciaId, and deleteAll is requested, delete the whole group
  if (deleteAll && lancamento.parcelas > 1) {
    // Delete all lancamentos with same descricao base, userId, and parcelas count
    // We identify sibling parcelas by matching the original description pattern
    const baseDescricao = lancamento.descricao.replace(/ \(\d+\/\d+\)$/, '')
    await prisma.lancamento.deleteMany({
      where: {
        userId: session.userId,
        descricao: { startsWith: baseDescricao },
        parcelas: lancamento.parcelas,
        contaId: lancamento.contaId,
      },
    })
    return NextResponse.json({ message: 'Todas as parcelas excluídas' })
  }

  if (deleteAll && lancamento.recorrenciaId) {
    await prisma.lancamento.deleteMany({
      where: { userId: session.userId, recorrenciaId: lancamento.recorrenciaId },
    })
    return NextResponse.json({ message: 'Todos os lançamentos recorrentes excluídos' })
  }

  await prisma.lancamento.delete({ where: { id } })
  return NextResponse.json({ message: 'Lançamento excluído' })
}
