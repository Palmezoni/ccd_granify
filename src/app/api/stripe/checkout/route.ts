// POST /api/stripe/checkout — cria sessão de checkout Stripe
import { NextRequest, NextResponse } from 'next/server'
import { getSessionFromRequest } from '@/lib/auth'
import { stripe, PLANS, PlanKey } from '@/lib/stripe'
import { prisma } from '@/lib/prisma'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

export async function POST(req: NextRequest) {
  const session = await getSessionFromRequest(req)
  if (!session) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  const { plan } = await req.json() as { plan: PlanKey }

  if (!PLANS[plan]) {
    return NextResponse.json({ error: 'Plano inválido' }, { status: 400 })
  }

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    include: { tenant: true },
  })

  if (!user) {
    return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 })
  }

  // Usa stripeCustomerId existente ou cria novo
  let customerId = user.tenant?.stripeCustomerId

  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email,
      name: user.name || undefined,
      metadata: { userId: user.id, tenantId: user.tenantId || '' },
    })
    customerId = customer.id

    if (user.tenantId) {
      await prisma.tenant.update({
        where: { id: user.tenantId },
        data: { stripeCustomerId: customerId },
      })
    }
  }

  const checkoutSession = await stripe.checkout.sessions.create({
    customer: customerId,
    payment_method_types: ['card'],
    line_items: [{ price: PLANS[plan].priceId, quantity: 1 }],
    mode: 'subscription',
    // metadata at session level for checkout.session.completed webhook:
    metadata: {
      userId: user.id,
      tenantId: user.tenantId || '',
      plan,
    },
    success_url: `${APP_URL}/dashboard?payment=success`,
    cancel_url: `${APP_URL}/#planos`,
    allow_promotion_codes: true,
    subscription_data: {
      metadata: { userId: user.id, tenantId: user.tenantId || '', plan },
    },
    locale: 'pt-BR',
  })

  return NextResponse.json({ url: checkoutSession.url })
}
