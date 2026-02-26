import Link from 'next/link'
import { getAllSections } from '@/lib/content'
import { auth } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export default async function LearnPage({
  searchParams,
}: {
  searchParams: Promise<{ section?: string }>
}) {
  const params = await searchParams
  const session = await auth()
  const sections = getAllSections()
  const isPro = session?.user?.subscriptionStatus === 'pro'

  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      <div className="mb-10">
        <h1 className="text-4xl font-bold text-white mb-3">课程内容</h1>
        <p className="text-gray-400">
          系统学习 AI Agent 开发，从基础到生产部署
          {!session && (
            <span className="ml-2 text-blue-400">
              — <Link href="/register" className="underline">免费注册</Link> 解锁免费内容
            </span>
          )}
          {session && !isPro && (
            <span className="ml-2 text-yellow-400">
              — <Link href="/pricing" className="underline">升级 Pro</Link> 解锁全部内容
            </span>
          )}
        </p>
      </div>

      {/* Section filter */}
      <div className="flex flex-wrap gap-2 mb-10">
        <Link
          href="/learn"
          className={`px-4 py-1.5 rounded-full text-sm transition-all ${
            !params.section ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-400 hover:text-white'
          }`}
        >
          全部
        </Link>
        {sections.map((s) => (
          <Link
            key={s.slug}
            href={`/learn?section=${s.slug}`}
            className={`px-4 py-1.5 rounded-full text-sm transition-all ${
              params.section === s.slug ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-400 hover:text-white'
            }`}
          >
            {s.icon} {s.name}
          </Link>
        ))}
      </div>

      {/* Articles by section */}
      <div className="space-y-14">
        {sections
          .filter((s) => !params.section || s.slug === params.section)
          .map((section) => (
            <section key={section.slug}>
              <div className="flex items-center gap-3 mb-6">
                <span className="text-2xl">{section.icon}</span>
                <div>
                  <h2 className="text-xl font-bold text-white">{section.name}</h2>
                  <p className="text-gray-500 text-sm">{section.description}</p>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                {section.articles.map((article) => {
                  const isLocked = article.isPremium && !isPro
                  return (
                    <Link
                      key={article.slug}
                      href={isLocked ? '/pricing' : `/learn/${article.slug}`}
                      className={`group block bg-gray-800/50 border rounded-xl p-5 transition-all ${
                        isLocked
                          ? 'border-gray-700/50 opacity-75 hover:opacity-90'
                          : 'border-gray-700/50 hover:border-blue-500/50 hover:bg-gray-800'
                      }`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <h3 className="font-semibold text-white group-hover:text-blue-400 transition-colors flex-1 pr-4">
                          {article.title}
                        </h3>
                        <div className="flex items-center gap-2 shrink-0">
                          {article.video && (
                            <span className="text-xs text-purple-400" title="包含视频">🎬</span>
                          )}
                          {article.isPremium ? (
                            <span className="text-xs bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border border-yellow-500/30 text-yellow-400 px-2 py-0.5 rounded-full">
                              PRO
                            </span>
                          ) : (
                            <span className="text-xs bg-green-500/10 border border-green-500/20 text-green-400 px-2 py-0.5 rounded-full">
                              免费
                            </span>
                          )}
                          {isLocked && <span className="text-gray-500">🔒</span>}
                        </div>
                      </div>
                      <p className="text-gray-500 text-sm mb-3 leading-relaxed">{article.excerpt}</p>
                      <div className="flex items-center gap-3 text-xs text-gray-600">
                        <span>⏱ {article.readingTime} 分钟</span>
                        {article.tags.slice(0, 2).map((t) => (
                          <span key={t}>#{t}</span>
                        ))}
                      </div>
                    </Link>
                  )
                })}
              </div>
            </section>
          ))}
      </div>
    </div>
  )
}
