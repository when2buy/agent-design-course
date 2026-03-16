import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { stripe } from '@/lib/stripe'
import { prisma } from '@/lib/db'

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: 'Please sign in first' }, { status: 401 })
  }

  const user = await prisma.user.findUnique({ where: { id: session.user.id } })
  if (!user?.stripeCustomerId) {
    return NextResponse.json({ error: 'No linked Stripe account found' }, { status: 400 })
  }

  const baseUrl = process.env.NEXTAUTH_URL ?? 'http://localhost:3000'

  const portalSession = await stripe.billingPortal.sessions.create({
    customer: user.stripeCustomerId,
    return_url: `${baseUrl}/dashboard`,
  })

  return NextResponse.json({ url: portalSession.url })
}
