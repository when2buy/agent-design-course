import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { listUsers, updateUser } from '@/lib/db'

export async function GET(req: NextRequest) {
  const session = await auth()
  if (session?.user?.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const users = await listUsers()
  return NextResponse.json(users)
}

export async function PATCH(req: NextRequest) {
  const session = await auth()
  if (session?.user?.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { userId, subscriptionStatus } = await req.json()

  const user = await updateUser(userId, { subscriptionStatus })
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  return NextResponse.json({ id: user.id, email: user.email, subscriptionStatus: user.subscriptionStatus })
}
