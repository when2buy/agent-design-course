import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/db'

export async function POST(req: NextRequest) {
  try {
    const { email, password, name } = await req.json()

    if (!email || !password || !name) {
      return NextResponse.json({ error: '请填写所有必填字段' }, { status: 400 })
    }

    if (password.length < 6) {
      return NextResponse.json({ error: '密码至少需要6位' }, { status: 400 })
    }

    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing) {
      return NextResponse.json({ error: '该邮箱已注册' }, { status: 409 })
    }

    const passwordHash = await bcrypt.hash(password, 10)
    const user = await prisma.user.create({
      data: { email, name, passwordHash },
      select: { id: true, email: true, name: true },
    })

    return NextResponse.json({ success: true, user })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: '服务器错误' }, { status: 500 })
  }
}
