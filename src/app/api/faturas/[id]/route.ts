import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const actionSchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('fechar') }),
  z.object({ action: z.literal('reabrir') }),
  z.object({
    action: z.literal('pagar'),
    dataPagamento: z.string().optional(),
    contaId: z.string().optional(),
  }),
])

async function getFaturaForUser(faturaId: string, userId: string, tenantId: string) {
  const fatura = await prisma.faturaCartao.findFirst({
    where: {
      id: faturaId,
      cartao: { userId, tenantId },
    },
    include: {
      cartao: { select: { id: true, nome: true, userId: true } },
    },
  })
  return fatura
}

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { id } = await params

  const fatura = await prisma.faturaCartao.findFirst({
    where: {
      id,
      cartao: { userId: session.userId, tenantId: session.tenantId },
    },
    include: {
      cartao: { select: { id: true, nome: true, bandeira: true, cor: true, limite: true } },
      conta: { select: { id: true, nome: true } },
      lancamentos: {
        include: {
          categoria: { select: { id: true, nome: true, cor: true, icone: true } },
          subCartao: { select: { id: true, nome: true, tipo: true } },
        },
        orderBy: { data: 'desc' },
      },
    },
  })

  if (!fatura) return NextResponse.json({ error: 'Fatura não encontrada' }, { status: 404 })

  // Compute valorTotal from lancamentos
  const valorTotal = fatura.lancamentos
    .filter((l) => l.status !== 'CANCELADO')
    .reduce((sum, l) => sum + Number(l.valor), 0)

  return NextResponse.json({ data: { ...fatura, valorTotal } })
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { id } = await params

  const fatura = await getFaturaForUser(id, session.userId, session.tenantId)
  if (!fatura) return NextResponse.json({ error: 'Fatura não encontrada' }, { status: 404 })

  const body = await req.json()
  const parsed = actionSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Dados inválidos' }, { status: 400 })
  }

  const action = parsed.data

  if (action.action === 'fechar') {
    if (fatura.status !== 'ABERTA') {
      return NextResponse.json({ error: 'Apenas faturas ABERTAS podem ser fechadas' }, { status: 409 })
    }

    const updated = await prisma.faturaCartao.update({
      where: { id },
      data: { status: 'FECHADA' },
    })
    return NextResponse.json({ data: updated })
  }

  if (action.action === 'reabrir') {
    if (fatura.status === 'ABERTA') {
      return NextResponse.json({ error: 'Fatura já está aberta' }, { status: 409 })
    }

    const updated = await prisma.faturaCartao.update({
      where: { id },
      data: { status: 'ABERTA', dataPagamento: null, contaId: null },
    })
    return NextResponse.json({ data: updated })
  }

  if (action.action === 'pagar') {
    if (fatura.status !== 'FECHADA') {
      return NextResponse.json(
        { error: 'Apenas faturas FECHADAS podem ser pagas. Feche a fatura primeiro.' },
        { status: 409 }
      )
    }

    const dataPagamento = action.dataPagamento ? new Date(action.dataPagamento) : new Date()
    const contaId = action.contaId ?? fatura.cartao ? undefined : undefined

    // Compute total from lancamentos
    const lancamentos = await prisma.lancamento.findMany({
      where: { faturaId: id, status: { not: 'CANCELADO' } },
      select: { valor: true },
    })
    const valorTotal = lancamentos.reduce((sum, l) => sum + Number(l.valor), 0)

    // Use transaction: update fatura and optionally create despesa lancamento
    const result = await prisma.$transaction(async (tx) => {
      const updated = await tx.faturaCartao.update({
        where: { id },
        data: {
          status: 'PAGA',
          dataPagamento,
          contaId: action.contaId ?? null,
        },
      })

      // Create a DESPESA lancamento on the payment account if contaId provided
      if (action.contaId && valorTotal > 0) {
        const mes = String(fatura.mes).padStart(2, '0')
        await tx.lancamento.create({
          data: {
            userId: session.userId,
            tenantId: session.tenantId,
            tipo: 'DESPESA',
            descricao: `Pagamento Fatura ${fatura.cartao.nome} ${mes}/${fatura.ano}`,
            valor: valorTotal,
            data: dataPagamento,
            contaId: action.contaId,
            status: 'CONFIRMADO',
          },
        })
      }

      return updated
    })

    return NextResponse.json({ data: result })
  }

  return NextResponse.json({ error: 'Ação inválida' }, { status: 400 })
}
