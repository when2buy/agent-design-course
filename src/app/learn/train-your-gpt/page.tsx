import MicroGPTArticleLayout from '@/components/microgpt/MicroGPTArticleLayout'
import TrainingArticle from '@/components/microgpt/articles/TrainingArticle'

export default function Page() {
  return (
    <MicroGPTArticleLayout meta={{
      title: 'Train Your Own GPT in the Browser',
      excerpt: "Karpathy's microgpt, ported to JavaScript and running entirely in your browser. Pick a dataset, hit Train, watch the loss fall. Same algorithm as ChatGPT — just 450 billion parameters smaller.",
      tags: ['training', 'gpt', 'interactive', 'microgpt', 'browser'],
      readingTime: 10,
      order: 5,
    }}>
      <TrainingArticle />
    </MicroGPTArticleLayout>
  )
}
