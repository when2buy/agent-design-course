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

  const recentArticles = sections
    .flatMap((s) => s.articles.map((a) => ({ ...a, sectionName: s.name, sectionIcon: s.icon })))
    .slice(0, 6)

  return (
    <div className="max-w-6xl mx-auto px-4 py-12">
      {/* Header */}
      <div className="mb-10">
        <h1 className="text-3xl font-bold text-white mb-2">
          👋 Welcome back, {session.user.name || session.user.email}
        </h1>
        <div className="flex items-center gap-3">
          <span className="text-gray-400">{session.user.email}</span>
          {isPro ? (
            <span className="bg-gradient-to-r from-yellow-500 to-orange-500 text-black text-xs font-bold px-3 py-1 rounded-full">
              ✨ PRO Member
            </span>
          ) : (
            <Link href="/pricing" className="bg-blue-600/20 border border-blue-500/30 text-blue-400 text-xs px-3 py-1 rounded-full hover:bg-blue-600/30 transition-all">
              Upgrade to Pro →
            </Link>
          )}
        </div>
      </div>

      {/* Upgrade banner */}
      {!isPro && (
        <div className="mb-8 bg-gradient-to-r from-blue-900/20 to-purple-900/20 border border-blue-500/20 rounded-xl p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <h3 className="font-semibold text-white">Unlock all {stats.premium} Pro articles + videos</h3>
            <p className="text-gray-400 text-sm">Get full code examples, video walkthroughs, production guides, and real interview solutions</p>
          </div>
          <Link href="/pricing" className="shrink-0 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-400 hover:to-purple-400 text-white px-6 py-2.5 rounded-xl font-semibold transition-all">
            View Plans
          </Link>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
        {[
          { label: 'Total Articles', value: stats.total, icon: '📚' },
          { label: 'Free Articles', value: stats.free, icon: '🆓', sub: 'Unlocked' },
          { label: 'Pro Articles', value: stats.premium, icon: '✨', sub: isPro ? 'Unlocked' : 'Locked' },
          { label: 'Tracks', value: stats.sections, icon: '🧭' },
        ].map((s) => (
          <div key={s.label} className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-4 text-center">
            <div className="text-2xl mb-1">{s.icon}</div>
            <div className="text-2xl font-bold text-white">{s.value}</div>
            <div className="text-gray-500 text-sm">{s.label}</div>
            {s.sub && (
              <div className={`text-xs mt-1 ${s.sub === 'Unlocked' ? 'text-green-400' : 'text-yellow-400'}`}>{s.sub}</div>
            )}
          </div>
        ))}
      </div>

      {/* Sections overview */}
      <div className="mb-10">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-xl font-bold text-white">Learning Tracks</h2>
          <Link href="/learn" className="text-blue-400 hover:text-blue-300 text-sm">View all →</Link>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
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
                  <span className="text-green-400">{freeCount} free</span>
                  <span className="text-gray-600">·</span>
                  <span className={proCount > 0 && !isPro ? 'text-yellow-400' : 'text-gray-400'}>{proCount} pro</span>
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
          <h3 className="font-semibold text-white group-hover:text-blue-400 transition-colors">Start here</h3>
          <p className="text-gray-500 text-sm">What is an AI Agent?</p>
        </Link>
        <Link href="/learn/react-framework" className="bg-gray-800/40 border border-gray-700/50 rounded-xl p-5 hover:border-blue-500/30 transition-all group">
          <div className="text-2xl mb-2">🗺️</div>
          <h3 className="font-semibold text-white group-hover:text-blue-400 transition-colors">ReAct Framework</h3>
          <p className="text-gray-500 text-sm">The most popular agent planning paradigm</p>
        </Link>
        <Link href="/pricing" className="bg-gray-800/40 border border-gray-700/50 rounded-xl p-5 hover:border-blue-500/30 transition-all group">
          <div className="text-2xl mb-2">💎</div>
          <h3 className="font-semibold text-white group-hover:text-blue-400 transition-colors">Go Pro</h3>
          <p className="text-gray-500 text-sm">Unlock all Pro content + interview solutions</p>
        </Link>
      </div>
    </div>
  )
}
