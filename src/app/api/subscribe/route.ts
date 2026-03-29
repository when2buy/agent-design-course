import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { updateUser } from '@/lib/db'

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: 'Please sign in first' }, { status: 401 })
  }

  // In production, this would process payment via Stripe.
  // For demo purposes, we'll activate subscription directly.
  const { plan } = await req.json()

  if (!['pro'].includes(plan)) {
    return NextResponse.json({ error: 'Invalid subscription plan' }, { status: 400 })
  }

  const endsAt = new Date()
  endsAt.setFullYear(endsAt.getFullYear() + 1)

  await updateUser(session.user.id, {
    subscriptionStatus: 'pro',
    subscriptionEndsAt: endsAt.toISOString(),
  })

  return NextResponse.json({ success: true, message: 'Subscribed! Welcome to Pro.' })
}
