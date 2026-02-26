import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { stripe } from '@/lib/stripe'
import { prisma } from '@/lib/db'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  const body = await req.text()
  const sig = req.headers.get('stripe-signature')

  if (!sig) {
    return NextResponse.json({ error: 'Missing Stripe signature' }, { status: 400 })
  }

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch (err: any) {
    console.error('Webhook signature verification failed:', err.message)
    return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 })
  }

  console.log(`[Stripe] Event: ${event.type}`)

  try {
    // Use `any` casts to handle Stripe SDK v20 type changes
    const obj = event.data.object as any

    switch (event.type) {
      case 'checkout.session.completed':
        if (obj.mode === 'subscription' && obj.subscription) {
          await activateSubscription(obj.metadata?.userId, obj.subscription)
        }
        break

      case 'invoice.paid':
        if (obj.subscription) {
          await renewSubscription(obj.subscription)
        }
        break

      case 'invoice.payment_failed':
        console.warn(`[Stripe] ⚠️ Payment failed for subscription ${obj.subscription}`)
        break

      case 'customer.subscription.updated':
        await syncSubscriptionStatus(obj)
        break

      case 'customer.subscription.deleted':
        await cancelSubscription(obj)
        break

      default:
        console.log(`[Stripe] Unhandled event: ${event.type}`)
    }
  } catch (err) {
    console.error('[Stripe] Error handling event:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }

  return NextResponse.json({ received: true })
}

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

function getPeriodEnd(sub: any): Date {
  // Stripe API 2025: current_period_end may be on the subscription or item
  const ts =
    sub.current_period_end ??
    sub.items?.data?.[0]?.current_period_end ??
    Math.floor(Date.now() / 1000) + 365 * 24 * 3600

  return new Date(ts * 1000)
}

async function activateSubscription(userId: string | undefined, subscriptionId: string) {
  if (!userId) return

  const sub = await stripe.subscriptions.retrieve(subscriptionId)
  const subAny = sub as any

  await prisma.user.update({
    where: { id: userId },
    data: {
      subscriptionStatus: 'pro',
      stripeSubscriptionId: sub.id,
      stripePriceId: sub.items.data[0]?.price.id,
      subscriptionEndsAt: getPeriodEnd(subAny),
    },
  })

  console.log(`[Stripe] ✅ Pro activated for user ${userId}`)
}

async function renewSubscription(subscriptionId: string) {
  const sub = await stripe.subscriptions.retrieve(subscriptionId)
  const subAny = sub as any
  const userId = sub.metadata?.userId
  if (!userId) return

  await prisma.user.update({
    where: { id: userId },
    data: {
      subscriptionStatus: 'pro',
      subscriptionEndsAt: getPeriodEnd(subAny),
    },
  })

  console.log(`[Stripe] ✅ Renewed for user ${userId}`)
}

async function syncSubscriptionStatus(sub: any) {
  const userId = sub.metadata?.userId
  if (!userId) return

  const isActive = sub.status === 'active' || sub.status === 'trialing'

  await prisma.user.update({
    where: { id: userId },
    data: {
      subscriptionStatus: isActive ? 'pro' : 'free',
      subscriptionEndsAt: getPeriodEnd(sub),
    },
  })
}

async function cancelSubscription(sub: any) {
  const userId = sub.metadata?.userId
  if (!userId) return

  await prisma.user.update({
    where: { id: userId },
    data: {
      subscriptionStatus: 'free',
      stripeSubscriptionId: null,
      stripePriceId: null,
      subscriptionEndsAt: null,
    },
  })

  console.log(`[Stripe] ❌ Subscription cancelled for user ${userId}`)
}
