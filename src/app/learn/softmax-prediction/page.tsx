import MicroGPTArticleLayout from '@/components/microgpt/MicroGPTArticleLayout'
import SoftmaxArticle from '@/components/microgpt/articles/SoftmaxArticle'

export default function Page() {
  return (
    <MicroGPTArticleLayout meta={{
      title: 'Softmax & The Prediction Game: From Logits to Probabilities',
      excerpt: 'At every position, the model outputs 27 raw numbers and must convert them into a probability distribution that always sums to 1. The sliding-window prediction game is exactly how every LLM — including GPT-4 — trains.',
      tags: ['softmax', 'logits', 'prediction', 'microgpt'],
      readingTime: 10,
      order: 2,
    }}>
      <SoftmaxArticle />
    </MicroGPTArticleLayout>
  )
}
