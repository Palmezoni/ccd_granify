import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Nao autorizado' }, { status: 401 })

  await prisma.notificacao.updateMany({
    where: { userId: session.userId, lida: false },
    data: { lida: true },
  })

  return NextResponse.json({ ok: true })
}
