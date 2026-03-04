import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const schema = z.object({
  categoriaId: z.string().nullable().optional(),
  tipo: z.enum(['DESPESA', 'RECEITA']),
  valor: z.number().positive('Valor deve ser positivo'),
  mes: z.number().int().min(1).max(12),
  ano: z.number().int().min(2000).max(2100),
})

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const now = new Date()
  const mes = parseInt(searchParams.get('mes') || String(now.getMonth() + 1), 10)
  const ano = parseInt(searchParams.get('ano') || String(now.getFullYear()), 10)

  const metas = await prisma.meta.findMany({
    where: { userId: session.userId, mes, ano },
    include: {
      categoria: { select: { id: true, nome: true, cor: true, icone: true, tipo: true } },
    },
    orderBy: [{ tipo: 'asc' }],
  })

  const startOfMonth = new Date(ano, mes - 1, 1)
  const endOfMonth = new Date(ano, mes, 0, 23, 59, 59, 999)

  // Compute realizado for each meta
  const result = await Promise.all(
    metas.map(async (meta) => {
      const where: Record<string, unknown> = {
        userId: session.userId,
        tipo: meta.tipo,
        status: 'CONFIRMADO',
        data: { gte: startOfMonth, lte: endOfMonth },
      }

      if (meta.categoriaId) {
        where.categoriaId = meta.categoriaId
      } else {
        // Meta geral sem categoria: soma todos os lançamentos do tipo naquele mês
        // sem filtro de categoria
      }

      const agg = await prisma.lancamento.aggregate({
        where,
        _sum: { valor: true },
      })

      const valorMeta = Number(meta.valor)
      const realizado = Number(agg._sum.valor ?? 0)
      const percentual = valorMeta > 0 ? Math.round((realizado / valorMeta) * 100) : 0

      return {
        id: meta.id,
        categoriaId: meta.categoriaId,
        categoria: meta.categoria,
        tipo: meta.tipo,
        valor: valorMeta,
        mes: meta.mes,
        ano: meta.ano,
        realizado,
        percentual,
      }
    })
  )

  return NextResponse.json({ data: result })
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Dados inválidos' }, { status: 400 })
  }

  const { categoriaId, tipo, valor, mes, ano } = parsed.data
  const userId = session.userId

  // findFirst + create/update to handle nullable categoriaId in compound unique
  const existing = await prisma.meta.findFirst({
    where: { userId, categoriaId: categoriaId ?? null, tipo, mes, ano },
  })

  const meta = existing
    ? await prisma.meta.update({
        where: { id: existing.id },
        data: { valor },
        include: { categoria: { select: { id: true, nome: true, cor: true, icone: true, tipo: true } } },
      })
    : await prisma.meta.create({
        data: { userId, categoriaId: categoriaId ?? null, tipo, valor, mes, ano },
        include: { categoria: { select: { id: true, nome: true, cor: true, icone: true, tipo: true } } },
      })

  return NextResponse.json({ data: meta }, { status: 201 })
}
