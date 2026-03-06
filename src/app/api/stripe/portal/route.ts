// POST /api/stripe/portal — abre portal de gerenciamento de assinatura
import { NextRequest, NextResponse } from 'next/server'
import { getSessionFromRequest } from '@/lib/auth'
import { stripe } from '@/lib/stripe'
import { prisma } from '@/lib/prisma'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

export async function POST(req: NextRequest) {
  const session = await getSessionFromRequest(req)
  if (!session) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    include: { tenant: true },
  })

  const customerId = user?.tenant?.stripeCustomerId
  if (!customerId) {
    return NextResponse.json({ error: 'Sem assinatura ativa' }, { status: 400 })
  }

  const portalSession = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: `${APP_URL}/configuracoes`,
  })

  return NextResponse.json({ url: portalSession.url })
}
