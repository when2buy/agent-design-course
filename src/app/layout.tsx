import type { Metadata } from 'next'
import './globals.css'
import { SessionProvider } from '@/components/SessionProvider'
import Navbar from '@/components/Navbar'

export const metadata: Metadata = {
  title: 'AI Agent 课程 - 从零搭建智能 Agent',
  description: '系统学习如何设计和构建 AI Agent，涵盖工具调用、记忆系统、多 Agent 架构和生产部署。',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="zh-CN">
      <body className="bg-gray-950 text-gray-100 min-h-screen">
        <SessionProvider>
          <Navbar />
          <main>{children}</main>
        </SessionProvider>
      </body>
    </html>
  )
}
