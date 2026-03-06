import Stripe from 'stripe'

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2026-02-25.clover',
  typescript: true,
})

export const PLANS = {
  monthly: {
    priceId: process.env.STRIPE_PRICE_MONTHLY!,
    label: 'Mensal',
    price: 29.90,
    priceFormatted: 'R$ 29,90',
    period: '/mês',
    billingDescription: 'cobrado mensalmente',
    discount: null,
  },
  semiannual: {
    priceId: process.env.STRIPE_PRICE_SEMIANNUAL!,
    label: 'Semestral',
    price: 23.92,
    priceFormatted: 'R$ 23,92',
    period: '/mês',
    billingDescription: 'R$ 143,52 cobrado a cada 6 meses',
    discount: '-20%',
  },
  annual: {
    priceId: process.env.STRIPE_PRICE_ANNUAL!,
    label: 'Anual',
    price: 20.93,
    priceFormatted: 'R$ 20,93',
    period: '/mês',
    billingDescription: 'R$ 251,16 cobrado anualmente',
    discount: '-30%',
  },
} as const

export type PlanKey = keyof typeof PLANS
