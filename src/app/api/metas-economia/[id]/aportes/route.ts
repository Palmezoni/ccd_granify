import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const schema = z.object({
  valor: z.number().positive('Valor deve ser positivo'),
  data: z.string().optional(),
  descricao: z.string().nullable().optional(),
})

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { id } = await params

  const meta = await prisma.metaEconomia.findFirst({
    where: { id, userId: session.userId },
  })
  if (!meta) return NextResponse.json({ error: 'Meta não encontrada' }, { status: 404 })

  if (meta.status === 'CANCELADA') {
    return NextResponse.json({ error: 'Não é possível aportar em meta cancelada' }, { status: 400 })
  }

  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Dados inválidos' }, { status: 400 })
  }

  const { valor, data, descricao } = parsed.data
  const dataAporte = data ? new Date(data) : new Date()

  const novoValorAtual = Number(meta.valorAtual) + valor
  const valorAlvo = Number(meta.valorAlvo)
  const statusNovo = novoValorAtual >= valorAlvo ? 'CONCLUIDA' : 'EM_ANDAMENTO'

  const [aporte] = await prisma.$transaction([
    prisma.aporteEconomia.create({
      data: {
        metaId: id,
        valor,
        data: dataAporte,
        descricao: descricao ?? null,
      },
    }),
    prisma.metaEconomia.update({
      where: { id },
      data: {
        valorAtual: novoValorAtual,
        status: statusNovo,
      },
    }),
  ])

  return NextResponse.json(
    {
      data: {
        ...aporte,
        valor: Number(aporte.valor),
        novoValorAtual,
        percentual: Math.min(Math.round((novoValorAtual / valorAlvo) * 100), 100),
        status: statusNovo,
      },
    },
    { status: 201 }
  )
}
