'use client'
import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function RegisterPage() {
  const [form, setForm] = useState({ name: '', email: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const res = await fetch('/api/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })

    const data = await res.json()

    if (!res.ok) {
      setError(data.error || '注册失败')
      setLoading(false)
      return
    }

    // Auto-login after registration
    await signIn('credentials', {
      email: form.email,
      password: form.password,
      redirect: false,
    })
    router.push('/dashboard')
    router.refresh()
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <span className="text-5xl">🚀</span>
          <h1 className="text-2xl font-bold text-white mt-4">开始学习之旅</h1>
          <p className="text-gray-400 mt-2">免费注册，立即访问基础课程</p>
        </div>

        <div className="bg-gray-800/50 border border-gray-700 rounded-2xl p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">姓名</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
                className="w-full bg-gray-900 border border-gray-600 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors"
                placeholder="你的名字"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">邮箱</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                required
                className="w-full bg-gray-900 border border-gray-600 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">密码</label>
              <input
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                required
                minLength={6}
                className="w-full bg-gray-900 border border-gray-600 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors"
                placeholder="至少 6 位"
              />
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-xl text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white py-3 rounded-xl font-semibold transition-all"
            >
              {loading ? '注册中...' : '免费注册'}
            </button>
          </form>

          <p className="text-center text-gray-500 text-sm mt-6">
            已有账号？{' '}
            <Link href="/login" className="text-blue-400 hover:text-blue-300">
              立即登录
            </Link>
          </p>

          <p className="text-xs text-gray-600 text-center mt-4">
            注册即代表同意我们的服务条款和隐私政策
          </p>
        </div>
      </div>
    </div>
  )
}
