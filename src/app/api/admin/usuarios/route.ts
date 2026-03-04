import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: Request) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Nao autorizado' }, { status: 401 })

  const me = await prisma.user.findUnique({ where: { id: session.userId }, select: { role: true } })
  if (!me || me.role !== 'ADMIN') return NextResponse.json({ error: 'Proibido' }, { status: 403 })

  const { searchParams } = new URL(req.url)
  const page = parseInt(searchParams.get('page') ?? '1')
  const limit = parseInt(searchParams.get('limit') ?? '20')
  const search = searchParams.get('search') ?? ''
  const skip = (page - 1) * limit

  const where = search ? {
    OR: [
      { name: { contains: search, mode: 'insensitive' as const } },
      { email: { contains: search, mode: 'insensitive' as const } },
    ]
  } : {}

  const [usuarios, total] = await Promise.all([
    prisma.user.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true, name: true, email: true, role: true, planStatus: true,
        createdAt: true, trialEndsAt: true,
        _count: { select: { lancamentos: true, contas: true } },
      },
    }),
    prisma.user.count({ where }),
  ])

  return NextResponse.json({ usuarios, total, page, totalPages: Math.ceil(total / limit) })
}
