import { notFound } from 'next/navigation'
import Link from 'next/link'
import { auth } from '@/lib/auth'
import { getArticle, findArticleFile, getArticlesForSection, getAllSections } from '@/lib/content'
import InteractiveArticleRenderer from '@/components/microgpt/InteractiveArticleRenderer'

export const dynamic = 'force-dynamic'

export default async function ArticlePage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const session = await auth()

  const found = findArticleFile(slug)
  if (!found) notFound()

  const article = await getArticle(slug)
  if (!article) notFound()

  const isPro = session?.user?.subscriptionStatus === 'pro'
  const canRead = !article.isPremium || isPro

  const sections = getAllSections()
  const section = sections.find((s) => s.slug === article.section)

  const sectionArticles = getArticlesForSection(article.section)
  const nextArticle = sectionArticles.find((a) => a.order > article.order) ?? null
  const prevArticle = [...sectionArticles].reverse().find((a) => a.order < article.order) ?? null

  const premiumCount = sections.flatMap((s) => s.articles).filter((a) => a.isPremium).length

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-gray-500 mb-8">
        <Link href="/learn" className="hover:text-gray-300">Courses</Link>
        <span>/</span>
        {section && (
          <>
            <Link href={`/learn?section=${section.slug}`} className="hover:text-gray-300">
              {section.icon} {section.name}
            </Link>
            <span>/</span>
          </>
        )}
        <span className="text-gray-400 truncate max-w-xs">{article.title}</span>
      </nav>

      {/* Header */}
      <div className="mb-8">
        <div className="flex flex-wrap items-center gap-3 mb-4">
          {article.isPremium ? (
            <span className="text-xs bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border border-yellow-500/30 text-yellow-400 px-3 py-1 rounded-full font-medium">
              ✨ PRO
            </span>
          ) : (
            <span className="text-xs bg-green-500/10 border border-green-500/20 text-green-400 px-3 py-1 rounded-full">
              Free
            </span>
          )}
          <span className="text-gray-500 text-sm">⏱ {article.readingTime} min read</span>
          {article.hasInteractive && (
            <span className="text-xs bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 px-3 py-1 rounded-full">
              ⚡ Interactive
            </span>
          )}
          {article.video && (
            <span className="text-xs text-purple-400 bg-purple-500/10 border border-purple-500/20 px-2 py-0.5 rounded-full">
              🎬 Video
            </span>
          )}
          {article.difficulty && (
            <span className={`text-xs px-2 py-0.5 rounded-full border ${
              article.difficulty.includes('Hard')
                ? 'bg-red-500/10 border-red-500/20 text-red-400'
                : 'bg-yellow-500/10 border-yellow-500/20 text-yellow-400'
            }`}>{article.difficulty}</span>
          )}
        </div>

        <h1 className="text-3xl md:text-4xl font-bold text-white mb-4">{article.title}</h1>
        <p className="text-gray-400 text-lg leading-relaxed">{article.excerpt}</p>
        {article.company && (
          <p className="text-sm text-purple-400/80 mt-2">🏢 {article.company}</p>
        )}
        <div className="flex flex-wrap gap-2 mt-4">
          {article.tags.map((tag) => (
            <span key={tag} className="text-xs text-gray-600 bg-gray-800 px-2 py-1 rounded">#{tag}</span>
          ))}
        </div>
      </div>

      <hr className="border-gray-700 mb-10" />

      {/* ── Content: gated by auth ── */}
      {canRead ? (
        <>
          {/* Video embed */}
          {article.video && (
            <div className="mb-10 rounded-xl overflow-hidden border border-gray-700 bg-black aspect-video">
              <iframe src={article.video} className="w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen title={`Video: ${article.title}`} />
            </div>
          )}

          {/* Interactive article component OR markdown */}
          {article.hasInteractive && article.interactiveComponent ? (
            <InteractiveArticleRenderer componentName={article.interactiveComponent} />
          ) : (
            <div className="prose-custom"
              dangerouslySetInnerHTML={{ __html: article.contentHtml }} />
          )}

          {/* Article navigation */}
          <div className="mt-14 pt-8 border-t border-gray-800 grid grid-cols-2 gap-4">
            <div>
              {prevArticle && (
                <Link href={`/learn/${prevArticle.slug}`}
                  className="group flex flex-col bg-gray-800/40 border border-gray-700 rounded-xl p-4 hover:border-indigo-500/40 transition-all">
                  <span className="text-xs text-gray-600 mb-1">← Previous</span>
                  <span className="font-medium text-white group-hover:text-indigo-400 transition-colors text-sm">
                    {prevArticle.title}
                  </span>
                </Link>
              )}
            </div>
            <div>
              {nextArticle && (
                <Link href={`/learn/${nextArticle.slug}`}
                  className="group flex flex-col bg-gray-800/40 border border-gray-700 rounded-xl p-4 hover:border-indigo-500/40 transition-all text-right">
                  <span className="text-xs text-gray-600 mb-1">Next →</span>
                  <span className="font-medium text-white group-hover:text-indigo-400 transition-colors text-sm">
                    {nextArticle.title}
                    {nextArticle.isPremium && <span className="ml-2 text-yellow-400 text-xs">PRO</span>}
                  </span>
                </Link>
              )}
            </div>
          </div>
        </>
      ) : (
        /* 🔒 Paywall */
        <div className="bg-gradient-to-br from-gray-800/80 to-gray-900/80 border border-gray-600 rounded-2xl p-8 text-center">
          <div className="text-5xl mb-5">🔒</div>
          <h2 className="text-2xl font-bold text-white mb-3">Pro Members Only</h2>
          <p className="text-gray-400 mb-8 max-w-md mx-auto">
            Upgrade to Pro to unlock all {premiumCount}+ premium articles,
            video walkthroughs, complete code examples, and production guides.
          </p>
          {!session ? (
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link href="/register" className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-xl font-semibold transition-all">
                Sign Up Free
              </Link>
              <Link href="/pricing" className="bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-400 hover:to-orange-400 text-black px-6 py-3 rounded-xl font-bold transition-all">
                Upgrade to Pro ✨
              </Link>
            </div>
          ) : (
            <Link href="/pricing" className="inline-block bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-400 hover:to-orange-400 text-black px-8 py-3 rounded-xl font-bold transition-all">
              Upgrade to Pro ✨
            </Link>
          )}
          <p className="text-gray-600 text-sm mt-5">Annual subscription · Cancel anytime</p>
        </div>
      )}

      <div className="mt-10">
        <Link href="/learn" className="text-gray-500 hover:text-gray-300 text-sm transition-colors">
          ← Back to curriculum
        </Link>
      </div>
    </div>
  )
}
