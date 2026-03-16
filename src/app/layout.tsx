import type { Metadata } from 'next'
import './globals.css'
import { SessionProvider } from '@/components/SessionProvider'
import Navbar from '@/components/Navbar'

export const metadata: Metadata = {
  title: 'Agent Design Course — Build Real AI Agents',
  description: 'A systematic course on designing and building AI Agents — covering Tool Use, MCP, RAG, Memory, Planning, and real interview questions from top AI labs.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="bg-gray-950 text-gray-100 min-h-screen">
        <SessionProvider>
          <Navbar />
          <main>{children}</main>
        </SessionProvider>
      </body>
    </html>
  )
}
