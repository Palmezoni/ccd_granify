// POST /api/webhooks/stripe — webhook Stripe (sem auth)
import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { prisma } from '@/lib/prisma'
import Stripe from 'stripe'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  const body = await req.text()
  const signature = req.headers.get('stripe-signature')

  if (!signature) {
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 })
  }

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(body, signature, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch (err) {
    console.error('Stripe webhook signature verification failed:', err)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        const metadata = (session.metadata || {}) as Record<string, string>
        let { tenantId, plan } = metadata

        // Fallback: if metadata not on session, fetch subscription metadata
        if (!tenantId && session.subscription) {
          const subscription = await stripe.subscriptions.retrieve(session.subscription as string)
          tenantId = subscription.metadata?.tenantId || ''
          plan = subscription.metadata?.plan || ''
        }

        if (tenantId) {
          await prisma.tenant.update({
            where: { id: tenantId },
            data: {
              plano: 'pro',
              planStatus: 'ACTIVE',
              stripeSubscriptionId: session.subscription as string,
            },
          })
          console.log(`✅ Tenant ${tenantId} activated (plan: ${plan})`)
        } else {
          console.warn('⚠️ checkout.session.completed: no tenantId in metadata', session.id)
        }
        break
      }

      case 'customer.subscription.updated': {
        const sub = event.data.object as Stripe.Subscription
        const tenantId = sub.metadata?.tenantId
        if (tenantId) {
          const status = sub.status === 'active' ? 'ACTIVE' : sub.status === 'canceled' ? 'CANCELLED' : 'SUSPENDED'
          await prisma.tenant.update({
            where: { id: tenantId },
            data: { planStatus: status as 'ACTIVE' | 'CANCELLED' | 'SUSPENDED' },
          })
        }
        break
      }

      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription
        const tenantId = sub.metadata?.tenantId
        if (tenantId) {
          await prisma.tenant.update({
            where: { id: tenantId },
            data: { plano: 'free', planStatus: 'CANCELLED', stripeSubscriptionId: null },
          })
        }
        break
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice
        const customerId = invoice.customer as string
        const tenant = await prisma.tenant.findFirst({ where: { stripeCustomerId: customerId } })
        if (tenant) {
          await prisma.tenant.update({
            where: { id: tenant.id },
            data: { planStatus: 'SUSPENDED' },
          })
        }
        break
      }
    }
  } catch (err) {
    console.error('Webhook handler error:', err)
    return NextResponse.json({ error: 'Handler error' }, { status: 500 })
  }

  return NextResponse.json({ received: true })
}
