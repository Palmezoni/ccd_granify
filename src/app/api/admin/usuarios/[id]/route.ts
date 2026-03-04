import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Nao autorizado' }, { status: 401 })

  const me = await prisma.user.findUnique({ where: { id: session.userId }, select: { role: true } })
  if (!me || me.role !== 'ADMIN') return NextResponse.json({ error: 'Proibido' }, { status: 403 })

  const { id } = await params
  const body = await req.json()
  const { role, planStatus } = body

  const updated = await prisma.user.update({
    where: { id },
    data: {
      ...(role && { role }),
      ...(planStatus && { planStatus }),
    },
    select: { id: true, role: true, planStatus: true },
  })

  return NextResponse.json(updated)
}
