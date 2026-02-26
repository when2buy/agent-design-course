import { redirect } from 'next/navigation'
import Link from 'next/link'
import { auth } from '@/lib/auth'
import { getAllSections, getStats } from '@/lib/content'

export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
  const session = await auth()
  if (!session) redirect('/login')

  const isPro = session.user.subscriptionStatus === 'pro'
  const sections = getAllSections()
  const stats = getStats()

  // Recent articles (last 5 across all sections, sorted by section order + article order)
  const recentArticles = sections
    .flatMap((s) => s.articles.map((a) => ({ ...a, sectionName: s.name, sectionIcon: s.icon })))
    .slice(0, 6)

  return (
    <div className="max-w-6xl mx-auto px-4 py-12">
      {/* Header */}
      <div className="mb-10">
        <h1 className="text-3xl font-bold text-white mb-2">
          👋 欢迎回来，{session.user.name || session.user.email}
        </h1>
        <div className="flex items-center gap-3">
          <span className="text-gray-400">{session.user.email}</span>
          {isPro ? (
            <span className="bg-gradient-to-r from-yellow-500 to-orange-500 text-black text-xs font-bold px-3 py-1 rounded-full">
              ✨ PRO 会员
            </span>
          ) : (
            <Link href="/pricing" className="bg-blue-600/20 border border-blue-500/30 text-blue-400 text-xs px-3 py-1 rounded-full hover:bg-blue-600/30 transition-all">
              升级 Pro →
            </Link>
          )}
        </div>
      </div>

      {/* Upgrade banner */}
      {!isPro && (
        <div className="mb-8 bg-gradient-to-r from-blue-900/20 to-purple-900/20 border border-blue-500/20 rounded-xl p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <h3 className="font-semibold text-white">解锁全部 {stats.premium} 篇 Premium 文章 + 视频</h3>
            <p className="text-gray-400 text-sm">升级 Pro，访问完整代码示例、视频讲解、生产部署指南和高级架构内容</p>
          </div>
          <Link href="/pricing" className="shrink-0 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-400 hover:to-purple-400 text-white px-6 py-2.5 rounded-xl font-semibold transition-all">
            查看方案
          </Link>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
        {[
          { label: '全部文章', value: stats.total, icon: '📚' },
          { label: '免费文章', value: stats.free, icon: '🆓', sub: '已解锁' },
          { label: 'Pro 文章', value: stats.premium, icon: '✨', sub: isPro ? '已解锁' : '待解锁' },
          { label: '课程主题', value: stats.sections, icon: '🧭' },
        ].map((s) => (
          <div key={s.label} className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-4 text-center">
            <div className="text-2xl mb-1">{s.icon}</div>
            <div className="text-2xl font-bold text-white">{s.value}</div>
            <div className="text-gray-500 text-sm">{s.label}</div>
            {s.sub && (
              <div className={`text-xs mt-1 ${s.sub === '已解锁' ? 'text-green-400' : 'text-yellow-400'}`}>{s.sub}</div>
            )}
          </div>
        ))}
      </div>

      {/* Sections overview */}
      <div className="mb-10">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-xl font-bold text-white">学习路径</h2>
          <Link href="/learn" className="text-blue-400 hover:text-blue-300 text-sm">查看全部 →</Link>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sections.map((section) => {
            const freeCount = section.articles.filter((a) => !a.isPremium).length
            const proCount = section.articles.filter((a) => a.isPremium).length
            return (
              <Link
                key={section.slug}
                href={`/learn?section=${section.slug}`}
                className="group bg-gray-800/40 border border-gray-700/50 rounded-xl p-4 hover:border-blue-500/40 transition-all"
              >
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-xl">{section.icon}</span>
                  <h3 className="font-medium text-white group-hover:text-blue-400 transition-colors text-sm">{section.name}</h3>
                </div>
                <div className="flex gap-2 text-xs">
                  <span className="text-green-400">{freeCount} 免费</span>
                  <span className="text-gray-600">·</span>
                  <span className={proCount > 0 && !isPro ? 'text-yellow-400' : 'text-gray-400'}>{proCount} Pro</span>
                </div>
              </Link>
            )
          })}
        </div>
      </div>

      {/* Quick links */}
      <div className="grid md:grid-cols-3 gap-4">
        <Link href="/learn/what-is-ai-agent" className="bg-gray-800/40 border border-gray-700/50 rounded-xl p-5 hover:border-blue-500/30 transition-all group">
          <div className="text-2xl mb-2">🚀</div>
          <h3 className="font-semibold text-white group-hover:text-blue-400 transition-colors">从这里开始</h3>
          <p className="text-gray-500 text-sm">什么是 AI Agent？</p>
        </Link>
        <Link href="/learn/react-framework" className="bg-gray-800/40 border border-gray-700/50 rounded-xl p-5 hover:border-blue-500/30 transition-all group">
          <div className="text-2xl mb-2">🗺️</div>
          <h3 className="font-semibold text-white group-hover:text-blue-400 transition-colors">ReAct 框架</h3>
          <p className="text-gray-500 text-sm">最流行的 Agent 规划范式</p>
        </Link>
        <Link href="/pricing" className="bg-gray-800/40 border border-gray-700/50 rounded-xl p-5 hover:border-blue-500/30 transition-all group">
          <div className="text-2xl mb-2">💎</div>
          <h3 className="font-semibold text-white group-hover:text-blue-400 transition-colors">订阅方案</h3>
          <p className="text-gray-500 text-sm">解锁所有 Pro 内容 + 视频</p>
        </Link>
      </div>
    </div>
  )
}
