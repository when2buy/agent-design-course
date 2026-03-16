import MicroGPTArticleLayout from '@/components/microgpt/MicroGPTArticleLayout'
import LossArticle from '@/components/microgpt/articles/LossArticle'

export default function Page() {
  return (
    <MicroGPTArticleLayout meta={{
      title: 'Loss & Backpropagation: How the Model Learns',
      excerpt: 'Cross-entropy loss measures how surprised the model was. Backpropagation traces that surprise all the way back to every parameter — the same chain rule you learned in calculus, applied 4,192 times per step.',
      tags: ['loss', 'backpropagation', 'autograd', 'microgpt'],
      readingTime: 12,
      order: 3,
    }}>
      <LossArticle />
    </MicroGPTArticleLayout>
  )
}
