import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import crypto from 'crypto'

const schema = z.object({
  nome: z.string().min(1, 'Nome é obrigatório'),
  escopo: z.enum(['read', 'write', 'full']).default('read'),
  expiresAt: z.string().nullable().optional(),
})

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const tokens = await prisma.apiToken.findMany({
    where: { userId: session.userId, ativo: true },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      nome: true,
      escopo: true,
      expiresAt: true,
      lastUsedAt: true,
      ativo: true,
      createdAt: true,
      // Return only last 4 chars of token, never the full value
      token: true,
    },
  })

  const masked = tokens.map((t) => ({
    ...t,
    token: '••••••••' + t.token.slice(-4),
  }))

  return NextResponse.json({ data: masked })
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 })
  }

  const { nome, escopo, expiresAt } = parsed.data

  const token = crypto.randomUUID() + '-' + crypto.randomUUID()

  const apiToken = await prisma.apiToken.create({
    data: {
      userId: session.userId,
      nome,
      token,
      escopo,
      expiresAt: expiresAt ? new Date(expiresAt) : null,
      ativo: true,
    },
  })

  // Return the FULL token only once on creation
  return NextResponse.json(
    {
      data: {
        id: apiToken.id,
        nome: apiToken.nome,
        escopo: apiToken.escopo,
        expiresAt: apiToken.expiresAt,
        lastUsedAt: apiToken.lastUsedAt,
        ativo: apiToken.ativo,
        createdAt: apiToken.createdAt,
        token, // full token — only shown once
      },
    },
    { status: 201 }
  )
}
