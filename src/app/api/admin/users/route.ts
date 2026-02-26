import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function GET(req: NextRequest) {
  const session = await auth()
  if (session?.user?.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const users = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      subscriptionStatus: true,
      subscriptionEndsAt: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json(users)
}

export async function PATCH(req: NextRequest) {
  const session = await auth()
  if (session?.user?.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { userId, subscriptionStatus } = await req.json()

  const user = await prisma.user.update({
    where: { id: userId },
    data: { subscriptionStatus },
    select: { id: true, email: true, subscriptionStatus: true },
  })

  return NextResponse.json(user)
}
