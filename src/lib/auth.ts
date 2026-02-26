import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Credentials({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null

        const user = await prisma.user.findUnique({
          where: { email: credentials.email as string },
        })

        if (!user) return null

        const valid = await bcrypt.compare(
          credentials.password as string,
          user.passwordHash
        )
        if (!valid) return null

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          subscriptionStatus: user.subscriptionStatus,
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.role = (user as any).role
        token.subscriptionStatus = (user as any).subscriptionStatus
      }
      // Refresh subscription status on every request
      if (token.id) {
        const dbUser = await prisma.user.findUnique({
          where: { id: token.id as string },
          select: { subscriptionStatus: true, role: true },
        })
        if (dbUser) {
          token.subscriptionStatus = dbUser.subscriptionStatus
          token.role = dbUser.role
        }
      }
      return token
    },
    async session({ session, token }) {
      session.user.id = token.id as string
      session.user.role = token.role as string
      session.user.subscriptionStatus = token.subscriptionStatus as string
      return session
    },
  },
  pages: {
    signIn: '/login',
    error: '/login',
  },
  session: { strategy: 'jwt' },
  // Trust all hosts (needed for Cloudflare tunnel / reverse proxy)
  trustHost: true,
})
