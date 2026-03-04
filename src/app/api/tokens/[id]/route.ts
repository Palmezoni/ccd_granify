import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

async function getTokenOrFail(id: string, userId: string) {
  return prisma.apiToken.findFirst({ where: { id, userId, ativo: true } })
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { id } = await params
  const apiToken = await getTokenOrFail(id, session.userId)
  if (!apiToken) return NextResponse.json({ error: 'Token não encontrado' }, { status: 404 })

  // Revoke by setting ativo=false (soft delete)
  await prisma.apiToken.update({
    where: { id },
    data: { ativo: false },
  })

  return NextResponse.json({ message: 'Token revogado' })
}
