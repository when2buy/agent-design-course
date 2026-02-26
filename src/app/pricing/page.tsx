'use client'
import { useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

const features = {
  free: [
    '访问所有免费文章',
    'AI Agent 基础概念',
    'ReAct 框架入门',
  ],
  pro: [
    '✨ 包含所有免费内容',
    '全部 Premium 文章',
    '每篇文章视频讲解',
    '工具设计最佳实践',
    '高级规划框架（ToT、LATS）',
    '多 Agent 系统架构',
    '生产部署完整指南',
    '代码示例下载',
    '新内容第一时间访问',
    '优先技术支持',
  ],
}

export default function PricingPage({
  searchParams,
}: {
  searchParams?: { cancelled?: string }
}) {
  const { data: session } = useSession()
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const isPro = session?.user?.subscriptionStatus === 'pro'

  async function handleCheckout() {
    if (!session) {
      router.push('/register?redirect=/pricing')
      return
    }

    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/stripe/checkout', { method: 'POST' })
      const data = await res.json()

      if (!res.ok) {
        setError(data.error || '创建订单失败，请重试')
        return
      }

      // Redirect to Stripe Checkout
      window.location.href = data.url
    } catch {
      setError('网络错误，请重试')
    } finally {
      setLoading(false)
    }
  }

  async function handlePortal() {
    setLoading(true)
    const res = await fetch('/api/stripe/portal', { method: 'POST' })
    const data = await res.json()
    if (data.url) window.location.href = data.url
    setLoading(false)
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-16">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold text-white mb-4">选择适合你的方案</h1>
        <p className="text-gray-400 text-lg">免费开始，随时升级。按年订阅，随时可取消。</p>
      </div>

      {/* Cancelled notice */}
      {searchParams?.cancelled && (
        <div className="mb-8 bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 px-6 py-4 rounded-xl text-center text-sm">
          订单已取消。如有疑问请联系我们。
        </div>
      )}

      {error && (
        <div className="mb-8 bg-red-500/10 border border-red-500/20 text-red-400 px-6 py-4 rounded-xl text-center text-sm">
          {error}
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto">
        {/* Free */}
        <div className="bg-gray-800/50 border border-gray-700 rounded-2xl p-8">
          <div className="mb-6">
            <h2 className="text-xl font-bold text-white mb-2">免费版</h2>
            <div className="flex items-baseline gap-1">
              <span className="text-4xl font-bold text-white">¥0</span>
              <span className="text-gray-500">/永久</span>
            </div>
          </div>
          <ul className="space-y-3 mb-8">
            {features.free.map((f) => (
              <li key={f} className="flex items-center gap-3 text-gray-300 text-sm">
                <span className="text-green-400 shrink-0">✓</span>{f}
              </li>
            ))}
          </ul>
          {!session ? (
            <Link href="/register" className="block text-center border border-gray-600 hover:border-gray-400 text-gray-300 hover:text-white py-3 rounded-xl font-semibold transition-all">
              免费注册
            </Link>
          ) : isPro ? (
            <div className="text-center text-gray-500 py-3 text-sm">已升级 Pro</div>
          ) : (
            <div className="text-center text-green-400 py-3 text-sm font-medium">✓ 当前方案</div>
          )}
        </div>

        {/* Pro */}
        <div className="relative bg-gradient-to-br from-blue-900/30 to-purple-900/30 border-2 border-blue-500/50 rounded-2xl p-8">
          <div className="absolute -top-3 left-1/2 -translate-x-1/2">
            <span className="bg-gradient-to-r from-blue-500 to-purple-500 text-white text-xs font-bold px-4 py-1 rounded-full">
              最受欢迎
            </span>
          </div>

          <div className="mb-6">
            <h2 className="text-xl font-bold text-white mb-2">Pro 版</h2>
            <div className="flex items-baseline gap-1">
              <span className="text-4xl font-bold text-white">¥299</span>
              <span className="text-gray-400">/年</span>
            </div>
            <p className="text-gray-500 text-sm mt-1">约 ¥25/月 · 通过 Stripe 安全支付</p>
          </div>

          <ul className="space-y-3 mb-8">
            {features.pro.map((f) => (
              <li key={f} className="flex items-center gap-3 text-gray-200 text-sm">
                <span className={f.startsWith('✨') ? 'text-yellow-400 shrink-0' : 'text-blue-400 shrink-0'}>
                  {f.startsWith('✨') ? '✨' : '✓'}
                </span>
                {f.startsWith('✨') ? f.slice(2) : f}
              </li>
            ))}
          </ul>

          {isPro ? (
            <div className="space-y-3">
              <div className="text-center text-green-400 py-2 font-medium">✓ 当前方案</div>
              <button
                onClick={handlePortal}
                disabled={loading}
                className="w-full border border-gray-600 hover:border-gray-400 text-gray-300 hover:text-white py-2.5 rounded-xl text-sm font-medium transition-all disabled:opacity-50"
              >
                {loading ? '跳转中...' : '管理订阅 / 取消'}
              </button>
            </div>
          ) : (
            <button
              onClick={handleCheckout}
              disabled={loading}
              className="w-full bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-400 hover:to-purple-400 disabled:opacity-50 text-white py-3 rounded-xl font-bold text-lg transition-all transform hover:scale-105"
            >
              {loading ? '跳转到 Stripe...' : session ? '立即升级 Pro ✨' : '注册并升级'}
            </button>
          )}

          {/* Stripe trust badge */}
          <div className="flex items-center justify-center gap-2 mt-4 text-gray-600 text-xs">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M10.9 2.1L4.5 5.5C3.6 6 3 6.9 3 7.9v8.2c0 1 .6 1.9 1.5 2.4l6.4 3.4c.9.5 2 .5 2.9 0l6.4-3.4c.9-.5 1.5-1.4 1.5-2.4V7.9c0-1-.6-1.9-1.5-2.4L13.8 2.1c-.9-.5-2-.5-2.9 0z"/>
            </svg>
            通过 Stripe 安全加密支付
          </div>
        </div>
      </div>

      {/* FAQ */}
      <div className="mt-20 max-w-2xl mx-auto">
        <h2 className="text-2xl font-bold text-white text-center mb-8">常见问题</h2>
        <div className="space-y-4">
          {[
            { q: '支持哪些支付方式？', a: '支持信用卡、借记卡（Visa、Mastercard、银联等），通过 Stripe 安全处理，支付信息不经过我们的服务器。' },
            { q: 'Premium 内容真的无法绕过吗？', a: '是的。内容在服务端严格验证，从不发送到前端。即使通过开发者工具也无法获取正文内容。' },
            { q: '可以退款吗？', a: '支持 7 天内无理由退款，发邮件联系客服即可处理，Stripe 会原路退回。' },
            { q: '订阅到期会怎样？', a: '到期后自动续费，你也可以随时在 Stripe 客户门户取消，下个周期不再续费，当前期内容继续可访问。' },
          ].map((item) => (
            <div key={item.q} className="bg-gray-800/40 border border-gray-700/50 rounded-xl p-5">
              <h3 className="font-semibold text-white mb-2">{item.q}</h3>
              <p className="text-gray-400 text-sm">{item.a}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
