import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Nao autorizado' }, { status: 401 })

  const { id } = await params

  await prisma.notificacao.updateMany({
    where: { id, userId: session.userId },
    data: { lida: true },
  })

  return NextResponse.json({ ok: true })
}
