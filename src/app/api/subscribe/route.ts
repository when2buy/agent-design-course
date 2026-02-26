import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: '请先登录' }, { status: 401 })
  }

  // In production, this would process payment via Stripe.
  // For demo purposes, we'll activate subscription directly.
  const { plan } = await req.json()

  if (!['pro'].includes(plan)) {
    return NextResponse.json({ error: '无效的订阅计划' }, { status: 400 })
  }

  const endsAt = new Date()
  endsAt.setFullYear(endsAt.getFullYear() + 1)

  await prisma.user.update({
    where: { id: session.user.id },
    data: {
      subscriptionStatus: 'pro',
      subscriptionEndsAt: endsAt,
    },
  })

  return NextResponse.json({ success: true, message: '订阅成功！欢迎加入 Pro 会员' })
}
