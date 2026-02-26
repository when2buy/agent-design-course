import Stripe from 'stripe'

// Lazy-initialize Stripe to avoid build-time errors when key is missing
let _stripe: Stripe | null = null

export function getStripe(): Stripe {
  if (!_stripe) {
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error('STRIPE_SECRET_KEY is not set')
    }
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2026-02-25.clover',
      typescript: true,
    })
  }
  return _stripe
}

// Convenience export — use getStripe() in route handlers
export const stripe = new Proxy({} as Stripe, {
  get(_, prop) {
    return (getStripe() as any)[prop]
  },
})

export const STRIPE_PRICE_ID = () => process.env.STRIPE_PRICE_ID!

export const PLANS = {
  pro: {
    name: 'Pro',
    getPriceId: () => process.env.STRIPE_PRICE_ID!,
    amount: 29900,
    currency: 'cny',
    interval: 'year' as const,
  },
}
