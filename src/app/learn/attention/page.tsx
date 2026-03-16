import MicroGPTArticleLayout from '@/components/microgpt/MicroGPTArticleLayout'
import AttentionArticle from '@/components/microgpt/articles/AttentionArticle'

export default function Page() {
  return (
    <MicroGPTArticleLayout meta={{
      title: 'Self-Attention: How Tokens Talk to Each Other',
      excerpt: 'Every token asks "what do I need from the past?" via a Query, and every past token answers via a Key. The result is a weighted sum that lets the model gather context across the sequence.',
      tags: ['attention', 'transformer', 'self-attention', 'microgpt'],
      readingTime: 14,
      order: 4,
    }}>
      <AttentionArticle />
    </MicroGPTArticleLayout>
  )
}
