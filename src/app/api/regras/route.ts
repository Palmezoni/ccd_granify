import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const schema = z.object({
  texto: z.string().min(2, 'Texto deve ter pelo menos 2 caracteres'),
  categoriaId: z.string().nullable().optional(),
  contaId: z.string().nullable().optional(),
  descricao: z.string().nullable().optional(),
})

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const regras = await prisma.regraPreenchi.findMany({
    where: { userId: session.userId },
    orderBy: { createdAt: 'asc' },
    include: {
      user: false,
    },
  })

  // Fetch categoria and conta names separately since RegraPreenchi has no direct relation
  const categoriaIds = [...new Set(regras.map((r) => r.categoriaId).filter(Boolean) as string[])]
  const contaIds = [...new Set(regras.map((r) => r.contaId).filter(Boolean) as string[])]

  const [categorias, contas] = await Promise.all([
    categoriaIds.length > 0
      ? prisma.categoria.findMany({
          where: { id: { in: categoriaIds }, userId: session.userId },
          select: { id: true, nome: true, cor: true },
        })
      : [],
    contaIds.length > 0
      ? prisma.conta.findMany({
          where: { id: { in: contaIds }, userId: session.userId },
          select: { id: true, nome: true, cor: true },
        })
      : [],
  ])

  const categoriaMap = Object.fromEntries(categorias.map((c) => [c.id, c]))
  const contaMap = Object.fromEntries(contas.map((c) => [c.id, c]))

  const data = regras.map((r) => ({
    ...r,
    categoria: r.categoriaId ? categoriaMap[r.categoriaId] ?? null : null,
    conta: r.contaId ? contaMap[r.contaId] ?? null : null,
  }))

  return NextResponse.json({ data })
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Dados inválidos' }, { status: 400 })
  }

  const { texto, categoriaId, contaId, descricao } = parsed.data

  const regra = await prisma.regraPreenchi.create({
    data: {
      userId: session.userId,
      texto,
      categoriaId: categoriaId ?? null,
      contaId: contaId ?? null,
      descricao: descricao ?? null,
      ativa: true,
    },
  })

  return NextResponse.json({ data: regra }, { status: 201 })
}
