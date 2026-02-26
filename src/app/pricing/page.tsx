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
    '社区讨论（即将上线）',
  ],
  pro: [
    '✨ 包含所有免费内容',
    '全部 Premium 文章',
    '工具设计最佳实践',
    '高级规划框架（ToT、LATS）',
    '多 Agent 系统架构',
    '生产部署完整指南',
    '代码示例下载',
    '优先回答问题',
    '新内容第一时间访问',
  ],
}

export default function PricingPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  const isPro = session?.user?.subscriptionStatus === 'pro'

  async function handleSubscribe() {
    if (!session) {
      router.push('/register')
      return
    }

    setLoading(true)
    const res = await fetch('/api/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ plan: 'pro' }),
    })

    if (res.ok) {
      setSuccess(true)
      setTimeout(() => router.push('/learn'), 2000)
    }
    setLoading(false)
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-16">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold text-white mb-4">选择适合你的方案</h1>
        <p className="text-gray-400 text-lg">
          免费开始，随时升级。所有方案均可随时取消。
        </p>
      </div>

      {success && (
        <div className="mb-8 bg-green-500/10 border border-green-500/20 text-green-400 px-6 py-4 rounded-xl text-center">
          🎉 订阅成功！正在跳转到课程页面...
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto">
        {/* Free Plan */}
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
                <span className="text-green-400 shrink-0">✓</span>
                {f}
              </li>
            ))}
          </ul>

          {!session ? (
            <Link
              href="/register"
              className="block text-center border border-gray-600 hover:border-gray-400 text-gray-300 hover:text-white py-3 rounded-xl font-semibold transition-all"
            >
              免费注册
            </Link>
          ) : !isPro ? (
            <div className="text-center text-green-400 py-3 text-sm font-medium">
              ✓ 当前方案
            </div>
          ) : (
            <div className="text-center text-gray-500 py-3 text-sm">
              已升级 Pro
            </div>
          )}
        </div>

        {/* Pro Plan */}
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
            <p className="text-gray-500 text-sm mt-1">约 ¥25/月</p>
          </div>

          <ul className="space-y-3 mb-8">
            {features.pro.map((f) => (
              <li key={f} className="flex items-center gap-3 text-gray-200 text-sm">
                <span className={f.startsWith('✨') ? 'text-yellow-400' : 'text-blue-400'} style={{minWidth: '16px'}}>
                  {f.startsWith('✨') ? '✨' : '✓'}
                </span>
                {f.startsWith('✨') ? f.slice(2) : f}
              </li>
            ))}
          </ul>

          {isPro ? (
            <div className="text-center text-green-400 py-3 font-medium">
              ✓ 当前方案
            </div>
          ) : (
            <button
              onClick={handleSubscribe}
              disabled={loading}
              className="w-full bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-400 hover:to-purple-400 disabled:opacity-50 text-white py-3 rounded-xl font-bold text-lg transition-all transform hover:scale-105"
            >
              {loading ? '处理中...' : session ? '立即升级 Pro ✨' : '注册并升级'}
            </button>
          )}

          <p className="text-xs text-gray-500 text-center mt-3">
            Demo 模式：点击即可免费激活 Pro（生产环境接入 Stripe）
          </p>
        </div>
      </div>

      {/* FAQ */}
      <div className="mt-20 max-w-2xl mx-auto">
        <h2 className="text-2xl font-bold text-white text-center mb-8">常见问题</h2>
        <div className="space-y-4">
          {[
            {
              q: 'Premium 内容真的无法绕过查看吗？',
              a: '是的。内容在服务端严格验证，从不发送到客户端。即使通过开发者工具或直接请求 API 也无法获取正文内容。',
            },
            {
              q: '支持什么支付方式？',
              a: '生产环境将支持微信支付、支付宝和信用卡（通过 Stripe）。当前为 Demo 模式，点击升级即可体验 Pro 功能。',
            },
            {
              q: '订阅后可以退款吗？',
              a: '支持 7 天内无理由退款，联系客服即可处理。',
            },
            {
              q: '内容多久更新一次？',
              a: 'AI 领域发展迅速，我们每周至少新增 1-2 篇文章，Pro 用户第一时间获得新内容。',
            },
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
