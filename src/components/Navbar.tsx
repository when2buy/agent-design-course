'use client'
import Link from 'next/link'
import { useSession, signOut } from 'next-auth/react'
import { useState } from 'react'

export default function Navbar() {
  const { data: session } = useSession()
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <nav className="border-b border-gray-800 bg-gray-900/80 backdrop-blur-sm sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <span className="text-2xl">🤖</span>
            <span className="font-bold text-white text-lg">AI Agent 课程</span>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-6">
            <Link href="/learn" className="text-gray-400 hover:text-white transition-colors text-sm">
              课程内容
            </Link>
            <Link href="/pricing" className="text-gray-400 hover:text-white transition-colors text-sm">
              订阅方案
            </Link>
            {session ? (
              <>
                <Link
                  href="/dashboard"
                  className="text-gray-400 hover:text-white transition-colors text-sm"
                >
                  我的课程
                </Link>
                {session.user.subscriptionStatus === 'pro' && (
                  <span className="bg-gradient-to-r from-yellow-500 to-orange-500 text-black text-xs font-bold px-2 py-0.5 rounded-full">
                    PRO
                  </span>
                )}
                <div className="flex items-center gap-3">
                  <span className="text-gray-500 text-sm">{session.user.email}</span>
                  <button
                    onClick={() => signOut({ callbackUrl: '/' })}
                    className="text-sm text-gray-400 hover:text-white border border-gray-700 px-3 py-1.5 rounded-lg hover:border-gray-500 transition-all"
                  >
                    退出
                  </button>
                </div>
              </>
            ) : (
              <div className="flex items-center gap-3">
                <Link
                  href="/login"
                  className="text-sm text-gray-400 hover:text-white transition-colors"
                >
                  登录
                </Link>
                <Link
                  href="/register"
                  className="text-sm bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg transition-colors font-medium"
                >
                  免费注册
                </Link>
              </div>
            )}
          </div>

          {/* Mobile menu button */}
          <button
            className="md:hidden text-gray-400 hover:text-white"
            onClick={() => setMenuOpen(!menuOpen)}
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              {menuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>

        {/* Mobile menu */}
        {menuOpen && (
          <div className="md:hidden py-4 space-y-3 border-t border-gray-800">
            <Link href="/learn" className="block text-gray-400 hover:text-white py-2">课程内容</Link>
            <Link href="/pricing" className="block text-gray-400 hover:text-white py-2">订阅方案</Link>
            {session ? (
              <>
                <Link href="/dashboard" className="block text-gray-400 hover:text-white py-2">我的课程</Link>
                <button
                  onClick={() => signOut({ callbackUrl: '/' })}
                  className="block text-gray-400 hover:text-white py-2"
                >
                  退出登录
                </button>
              </>
            ) : (
              <>
                <Link href="/login" className="block text-gray-400 hover:text-white py-2">登录</Link>
                <Link href="/register" className="block text-blue-400 hover:text-blue-300 py-2">免费注册</Link>
              </>
            )}
          </div>
        )}
      </div>
    </nav>
  )
}
