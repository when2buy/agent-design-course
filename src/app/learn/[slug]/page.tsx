import { notFound } from 'next/navigation'
import Link from 'next/link'
import { auth } from '@/lib/auth'
import { getArticle, findArticleFile, getArticlesForSection, getAllSections } from '@/lib/content'
import { prisma } from '@/lib/db'

export const dynamic = 'force-dynamic'

export default async function ArticlePage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const session = await auth()

  // ✅ SERVER-SIDE: find file first (no content loaded yet)
  const found = findArticleFile(slug)
  if (!found) notFound()

  // Load full article only when needed for auth decision
  const article = await getArticle(slug)
  if (!article) notFound()

  const isPro = session?.user?.subscriptionStatus === 'pro'
  const canRead = !article.isPremium || isPro

  // Get section info
  const sections = getAllSections()
  const section = sections.find((s) => s.slug === article.section)

  // Get next article
  const sectionArticles = getArticlesForSection(article.section)
  const nextArticle = sectionArticles.find((a) => a.order > article.order) ?? null

  // Count premium articles for paywall messaging
  const premiumCount = sections.flatMap((s) => s.articles).filter((a) => a.isPremium).length

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-gray-500 mb-8">
        <Link href="/learn" className="hover:text-gray-300">课程</Link>
        <span>/</span>
        {section && (
          <>
            <Link href={`/learn?section=${section.slug}`} className="hover:text-gray-300">
              {section.icon} {section.name}
            </Link>
            <span>/</span>
          </>
        )}
        <span className="text-gray-400 truncate">{article.title}</span>
      </nav>

      {/* Article Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          {article.isPremium ? (
            <span className="text-xs bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border border-yellow-500/30 text-yellow-400 px-3 py-1 rounded-full font-medium">
              ✨ PRO
            </span>
          ) : (
            <span className="text-xs bg-green-500/10 border border-green-500/20 text-green-400 px-3 py-1 rounded-full">
              免费
            </span>
          )}
          <span className="text-gray-500 text-sm">⏱ {article.readingTime} 分钟阅读</span>
          {article.video && (
            <span className="text-xs text-purple-400 bg-purple-500/10 border border-purple-500/20 px-2 py-0.5 rounded-full">
              🎬 含视频
            </span>
          )}
        </div>

        <h1 className="text-3xl md:text-4xl font-bold text-white mb-4">{article.title}</h1>
        <p className="text-gray-400 text-lg leading-relaxed">{article.excerpt}</p>

        <div className="flex flex-wrap gap-2 mt-4">
          {article.tags.map((tag) => (
            <span key={tag} className="text-xs text-gray-600 bg-gray-800 px-2 py-1 rounded">
              #{tag}
            </span>
          ))}
        </div>
      </div>

      <hr className="border-gray-700 mb-8" />

      {/* ✅ SERVER-SIDE PROTECTION */}
      {canRead ? (
        <>
          {/* Video embed (if present) */}
          {article.video && (
            <div className="mb-10 rounded-xl overflow-hidden border border-gray-700 bg-black aspect-video">
              <iframe
                src={article.video}
                className="w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                title={`Video: ${article.title}`}
              />
            </div>
          )}

          {/* Article content — rendered from markdown, syntax highlighted */}
          <div
            className="prose-custom"
            dangerouslySetInnerHTML={{ __html: article.contentHtml }}
          />

          {/* Next Article */}
          {nextArticle && (
            <div className="mt-14 pt-8 border-t border-gray-800">
              <p className="text-gray-500 text-sm mb-2">下一篇</p>
              <Link
                href={`/learn/${nextArticle.slug}`}
                className="group flex items-center justify-between bg-gray-800/50 border border-gray-700 rounded-xl p-5 hover:border-blue-500/50 transition-all"
              >
                <div className="flex items-center gap-3">
                  {nextArticle.video && <span className="text-purple-400 text-sm">🎬</span>}
                  <span className="font-semibold text-white group-hover:text-blue-400 transition-colors">
                    {nextArticle.title}
                  </span>
                  {nextArticle.isPremium && (
                    <span className="text-xs text-yellow-400 bg-yellow-500/10 px-2 py-0.5 rounded-full border border-yellow-500/20">PRO</span>
                  )}
                </div>
                <span className="text-gray-500 group-hover:text-blue-400 transition-colors text-lg">→</span>
              </Link>
            </div>
          )}
        </>
      ) : (
        /* 🔒 PAYWALL — zero content bytes sent to client */
        <div className="bg-gradient-to-br from-gray-800/80 to-gray-900/80 border border-gray-600 rounded-2xl p-8 text-center">
          <div className="text-5xl mb-5">🔒</div>
          <h2 className="text-2xl font-bold text-white mb-3">这是 Pro 专属内容</h2>
          <p className="text-gray-400 mb-8 max-w-md mx-auto">
            升级 Pro 会员，解锁全部 {premiumCount}+ 篇高级文章，
            包含视频讲解、完整代码示例和生产实战指南。
          </p>

          {!session ? (
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link href="/register" className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-xl font-semibold transition-all">
                免费注册
              </Link>
              <Link href="/pricing" className="bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-400 hover:to-orange-400 text-black px-6 py-3 rounded-xl font-bold transition-all">
                升级 Pro ✨
              </Link>
            </div>
          ) : (
            <Link href="/pricing" className="inline-block bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-400 hover:to-orange-400 text-black px-8 py-3 rounded-xl font-bold transition-all">
              升级 Pro 解锁全部内容 ✨
            </Link>
          )}

          <p className="text-gray-600 text-sm mt-5">按年订阅，随时可取消</p>
        </div>
      )}

      {/* Back */}
      <div className="mt-10">
        <Link href="/learn" className="text-gray-500 hover:text-gray-300 text-sm transition-colors">
          ← 返回课程列表
        </Link>
      </div>
    </div>
  )
}
