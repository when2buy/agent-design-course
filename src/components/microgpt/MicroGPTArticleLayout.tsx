import Link from 'next/link'

interface ArticleMeta {
  title: string
  excerpt: string
  tags: string[]
  readingTime: number
  order: number
  prevSlug?: string
  prevTitle?: string
  nextSlug?: string
  nextTitle?: string
}

const SECTION_ARTICLES = [
  { slug: 'tokenizer',          order: 1, title: 'The Dataset & Tokenizer: How LLMs Read Text' },
  { slug: 'softmax-prediction', order: 2, title: 'Softmax & The Prediction Game' },
  { slug: 'loss-backprop',      order: 3, title: 'Loss & Backpropagation: How the Model Learns' },
  { slug: 'attention',          order: 4, title: 'Self-Attention: How Tokens Talk to Each Other' },
  { slug: 'train-your-gpt',     order: 5, title: 'Train Your Own GPT in the Browser' },
]

export function getMicroGPTNav(currentOrder: number) {
  const prev = SECTION_ARTICLES.find(a => a.order === currentOrder - 1) ?? null
  const next = SECTION_ARTICLES.find(a => a.order === currentOrder + 1) ?? null
  return { prev, next }
}

export default function MicroGPTArticleLayout({
  meta,
  children,
}: {
  meta: ArticleMeta
  children: React.ReactNode
}) {
  const { prev, next } = getMicroGPTNav(meta.order)

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-gray-500 mb-8">
        <Link href="/learn" className="hover:text-gray-300">Courses</Link>
        <span>/</span>
        <Link href="/learn?section=microgpt" className="hover:text-gray-300">
          🧬 MicroGPT: How AI Works
        </Link>
        <span>/</span>
        <span className="text-gray-400 truncate max-w-xs">{meta.title}</span>
      </nav>

      {/* Article header */}
      <div className="mb-8">
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <span className="text-xs bg-green-500/10 border border-green-500/20 text-green-400 px-3 py-1 rounded-full">
            Free
          </span>
          <span className="text-gray-500 text-sm">⏱ {meta.readingTime} min read</span>
          <span className="text-xs bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 px-3 py-1 rounded-full">
            ⚡ Interactive
          </span>
        </div>
        <h1 className="text-3xl md:text-4xl font-bold text-white mb-4">{meta.title}</h1>
        <p className="text-gray-400 text-lg leading-relaxed">{meta.excerpt}</p>
        <div className="flex flex-wrap gap-2 mt-4">
          {meta.tags.map(tag => (
            <span key={tag} className="text-xs text-gray-600 bg-gray-800 px-2 py-1 rounded">
              #{tag}
            </span>
          ))}
        </div>
      </div>

      <hr className="border-gray-700 mb-10" />

      {/* Article content */}
      {children}

      {/* Prev / Next navigation */}
      <div className="mt-14 pt-8 border-t border-gray-800 grid grid-cols-2 gap-4">
        <div>
          {prev && (
            <Link href={`/learn/${prev.slug}`}
              className="group flex flex-col bg-gray-800/40 border border-gray-700 rounded-xl p-4 hover:border-indigo-500/40 transition-all">
              <span className="text-xs text-gray-600 mb-1">← Previous</span>
              <span className="font-medium text-white group-hover:text-indigo-400 transition-colors text-sm">
                {prev.title}
              </span>
            </Link>
          )}
        </div>
        <div>
          {next && (
            <Link href={`/learn/${next.slug}`}
              className="group flex flex-col bg-gray-800/40 border border-gray-700 rounded-xl p-4 hover:border-indigo-500/40 transition-all text-right">
              <span className="text-xs text-gray-600 mb-1">Next →</span>
              <span className="font-medium text-white group-hover:text-indigo-400 transition-colors text-sm">
                {next.title}
              </span>
            </Link>
          )}
        </div>
      </div>

      <div className="mt-8">
        <Link href="/learn" className="text-gray-500 hover:text-gray-300 text-sm transition-colors">
          ← Back to curriculum
        </Link>
      </div>
    </div>
  )
}
