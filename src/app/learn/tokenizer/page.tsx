import MicroGPTArticleLayout from '@/components/microgpt/MicroGPTArticleLayout'
import TokenizerArticle from '@/components/microgpt/articles/TokenizerArticle'

export default function Page() {
  return (
    <MicroGPTArticleLayout meta={{
      title: 'The Dataset & Tokenizer: How LLMs Read Text',
      excerpt: 'Neural networks can\'t process letters — they only understand numbers. See how Karpathy\'s microgpt converts names into token sequences, and why this tiny decision cascades through every LLM in production.',
      tags: ['tokenizer', 'tokens', 'vocabulary', 'microgpt'],
      readingTime: 8,
      order: 1,
    }}>
      <TokenizerArticle />
    </MicroGPTArticleLayout>
  )
}
