import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Nao autorizado' }, { status: 401 })

  const me = await prisma.user.findUnique({ where: { id: session.userId }, select: { role: true } })
  if (!me || me.role !== 'ADMIN') return NextResponse.json({ error: 'Proibido' }, { status: 403 })

  const [
    totalUsuarios,
    usuariosAtivos,
    usuariosAdmin,
    totalLancamentos,
    totalContas,
    totalCartoes,
    novosUltimos30dias,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { planStatus: 'ACTIVE' } }),
    prisma.user.count({ where: { role: 'ADMIN' } }),
    prisma.lancamento.count(),
    prisma.conta.count(),
    prisma.cartaoCredito.count(),
    prisma.user.count({
      where: { createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } }
    }),
  ])

  return NextResponse.json({
    totalUsuarios,
    usuariosAtivos,
    usuariosAdmin,
    totalLancamentos,
    totalContas,
    totalCartoes,
    novosUltimos30dias,
  })
}
