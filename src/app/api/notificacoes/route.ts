import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: Request) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Nao autorizado' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const limite = parseInt(searchParams.get('limite') ?? '20')
  const apenasNaoLidas = searchParams.get('naoLidas') === 'true'

  const where = {
    userId: session.userId,
    ...(apenasNaoLidas ? { lida: false } : {}),
  }

  const [notificacoes, totalNaoLidas] = await Promise.all([
    prisma.notificacao.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limite,
    }),
    prisma.notificacao.count({ where: { userId: session.userId, lida: false } }),
  ])

  return NextResponse.json({ notificacoes, totalNaoLidas })
}

export async function DELETE(req: Request) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Nao autorizado' }, { status: 401 })

  await prisma.notificacao.deleteMany({
    where: { userId: session.userId, lida: true },
  })

  return NextResponse.json({ ok: true })
}
