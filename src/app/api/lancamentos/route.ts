import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { addMonths } from 'date-fns'

const schema = z.object({
  tipo: z.enum(['RECEITA', 'DESPESA', 'TRANSFERENCIA']),
  descricao: z.string().min(1, 'Descrição é obrigatória'),
  valor: z.number().positive('Valor deve ser positivo'),
  data: z.string().min(1, 'Data é obrigatória'),
  categoriaId: z.string().nullable().optional(),
  contaId: z.string().nullable().optional(),
  contaDestinoId: z.string().nullable().optional(),
  cartaoId: z.string().nullable().optional(),
  faturaId: z.string().nullable().optional(),
  status: z.enum(['CONFIRMADO', 'PROJETADO', 'CANCELADO']).default('CONFIRMADO'),
  parcelas: z.number().int().min(1).max(48).default(1),
  observacao: z.string().nullable().optional(),
})

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const tipo = searchParams.get('tipo')
  const contaId = searchParams.get('contaId')
  const categoriaId = searchParams.get('categoriaId')
  const mes = searchParams.get('mes')
  const ano = searchParams.get('ano')
  const status = searchParams.get('status')
  const search = searchParams.get('search')
  const limit = parseInt(searchParams.get('limit') || '50', 10)
  const page = parseInt(searchParams.get('page') || '1', 10)

  const where: Record<string, unknown> = { userId: session.userId }

  if (tipo && ['RECEITA', 'DESPESA', 'TRANSFERENCIA'].includes(tipo)) {
    where.tipo = tipo
  }
  if (contaId) {
    where.contaId = contaId
  }
  if (categoriaId) {
    where.categoriaId = categoriaId
  }
  if (status && ['CONFIRMADO', 'PROJETADO', 'CANCELADO'].includes(status)) {
    where.status = status
  }
  if (search) {
    where.descricao = { contains: search, mode: 'insensitive' }
  }

  if (mes || ano) {
    const now = new Date()
    const y = ano ? parseInt(ano, 10) : now.getFullYear()
    const m = mes ? parseInt(mes, 10) : now.getMonth() + 1
    const start = new Date(y, m - 1, 1)
    const end = new Date(y, m, 0, 23, 59, 59, 999)
    where.data = { gte: start, lte: end }
  }

  const [total, lancamentos] = await Promise.all([
    prisma.lancamento.count({ where }),
    prisma.lancamento.findMany({
      where,
      orderBy: [{ data: 'desc' }, { createdAt: 'desc' }],
      skip: (page - 1) * limit,
      take: limit,
      include: {
        categoria: { select: { id: true, nome: true, cor: true, icone: true } },
        conta: { select: { id: true, nome: true, cor: true } },
        contaDestino: { select: { id: true, nome: true, cor: true } },
      },
    }),
  ])

  return NextResponse.json({
    data: lancamentos,
    meta: { total, page, limit, pages: Math.ceil(total / limit) },
  })
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 })
  }

  const { tipo, descricao, valor, data, categoriaId, contaId, contaDestinoId,
    cartaoId, faturaId, status, parcelas, observacao } = parsed.data

  const dataObj = new Date(data)

  // TRANSFERENCIA: create two lancamentos atomically
  if (tipo === 'TRANSFERENCIA') {
    if (!contaId || !contaDestinoId) {
      return NextResponse.json(
        { error: 'Transferência requer conta origem e conta destino' },
        { status: 400 }
      )
    }

    const [despesa, receita] = await prisma.$transaction([
      prisma.lancamento.create({
        data: {
          userId: session.userId,
          tipo: 'DESPESA',
          descricao,
          valor,
          data: dataObj,
          contaId,
          contaDestinoId,
          status: status as 'CONFIRMADO' | 'PROJETADO' | 'CANCELADO',
          parcelas: 1,
          parcelaAtual: 1,
          observacao: observacao ?? null,
        },
        include: {
          categoria: { select: { id: true, nome: true, cor: true, icone: true } },
          conta: { select: { id: true, nome: true, cor: true } },
          contaDestino: { select: { id: true, nome: true, cor: true } },
        },
      }),
      prisma.lancamento.create({
        data: {
          userId: session.userId,
          tipo: 'RECEITA',
          descricao,
          valor,
          data: dataObj,
          contaId: contaDestinoId,
          contaDestinoId: contaId,
          status: status as 'CONFIRMADO' | 'PROJETADO' | 'CANCELADO',
          parcelas: 1,
          parcelaAtual: 1,
          observacao: observacao ?? null,
        },
        include: {
          categoria: { select: { id: true, nome: true, cor: true, icone: true } },
          conta: { select: { id: true, nome: true, cor: true } },
          contaDestino: { select: { id: true, nome: true, cor: true } },
        },
      }),
    ])

    return NextResponse.json({ data: [despesa, receita] }, { status: 201 })
  }

  // Parcelamento: create N lancamentos
  if (parcelas > 1 && tipo === 'DESPESA') {
    const valorParcela = Math.round((valor / parcelas) * 100) / 100

    const creates = Array.from({ length: parcelas }, (_, i) => {
      const dataParcela = addMonths(dataObj, i)
      return prisma.lancamento.create({
        data: {
          userId: session.userId,
          tipo,
          descricao: `${descricao} (${i + 1}/${parcelas})`,
          valor: valorParcela,
          data: dataParcela,
          categoriaId: categoriaId ?? null,
          contaId: contaId ?? null,
          cartaoId: cartaoId ?? null,
          faturaId: faturaId ?? null,
          status: status as 'CONFIRMADO' | 'PROJETADO' | 'CANCELADO',
          parcelas,
          parcelaAtual: i + 1,
          observacao: observacao ?? null,
        },
        include: {
          categoria: { select: { id: true, nome: true, cor: true, icone: true } },
          conta: { select: { id: true, nome: true, cor: true } },
          contaDestino: { select: { id: true, nome: true, cor: true } },
        },
      })
    })

    const lancamentos = await prisma.$transaction(creates)
    return NextResponse.json({ data: lancamentos }, { status: 201 })
  }

  // Single lancamento (RECEITA or DESPESA without parcelas)
  const lancamento = await prisma.lancamento.create({
    data: {
      userId: session.userId,
      tipo,
      descricao,
      valor,
      data: dataObj,
      categoriaId: categoriaId ?? null,
      contaId: contaId ?? null,
      cartaoId: cartaoId ?? null,
      faturaId: faturaId ?? null,
      status: status as 'CONFIRMADO' | 'PROJETADO' | 'CANCELADO',
      parcelas: 1,
      parcelaAtual: 1,
      observacao: observacao ?? null,
    },
    include: {
      categoria: { select: { id: true, nome: true, cor: true, icone: true } },
      conta: { select: { id: true, nome: true, cor: true } },
      contaDestino: { select: { id: true, nome: true, cor: true } },
    },
  })

  return NextResponse.json({ data: lancamento }, { status: 201 })
}
