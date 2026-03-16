'use client'
import dynamic from 'next/dynamic'

const COMPONENTS: Record<string, React.ComponentType> = {
  TokenizerArticle:  dynamic(() => import('./articles/TokenizerArticle'),  { ssr: false }),
  SoftmaxArticle:    dynamic(() => import('./articles/SoftmaxArticle'),    { ssr: false }),
  LossArticle:       dynamic(() => import('./articles/LossArticle'),       { ssr: false }),
  AttentionArticle:  dynamic(() => import('./articles/AttentionArticle'),  { ssr: false }),
  TrainingArticle:   dynamic(() => import('./articles/TrainingArticle'),   { ssr: false }),
}

function Skeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-7 bg-gray-800 rounded w-2/3" />
      <div className="space-y-2">
        <div className="h-4 bg-gray-800 rounded w-full" />
        <div className="h-4 bg-gray-800 rounded w-5/6" />
        <div className="h-4 bg-gray-800 rounded w-4/5" />
      </div>
      <div className="h-48 bg-gray-800/50 rounded-2xl border border-gray-700" />
      <div className="space-y-2">
        <div className="h-4 bg-gray-800 rounded w-full" />
        <div className="h-4 bg-gray-800 rounded w-3/4" />
      </div>
    </div>
  )
}

export default function InteractiveArticleRenderer({ componentName }: { componentName: string }) {
  const Comp = COMPONENTS[componentName]
  if (!Comp) return (
    <div className="text-gray-500 text-sm py-8 text-center">
      Component &quot;{componentName}&quot; not found.
    </div>
  )
  return <Comp />
}
