'use client'
import dynamic from 'next/dynamic'
import Link from 'next/link'

// Dynamic imports — all components use browser APIs
const TokenizerViz = dynamic(() => import('@/components/microgpt/TokenizerViz'), { ssr: false, loading: () => <ComponentSkeleton /> })
const SoftmaxViz   = dynamic(() => import('@/components/microgpt/SoftmaxViz'),   { ssr: false, loading: () => <ComponentSkeleton /> })
const LossViz      = dynamic(() => import('@/components/microgpt/LossViz'),      { ssr: false, loading: () => <ComponentSkeleton /> })
const AttentionViz = dynamic(() => import('@/components/microgpt/AttentionViz'), { ssr: false, loading: () => <ComponentSkeleton /> })
const TrainingCanvas = dynamic(() => import('@/components/microgpt/TrainingCanvas'), { ssr: false, loading: () => <ComponentSkeleton h={300} /> })

function ComponentSkeleton({ h = 120 }: { h?: number }) {
  return (
    <div className="animate-pulse bg-gray-800/50 rounded-xl border border-gray-700"
      style={{ height: h }} />
  )
}

function Section({ id, step, title, children }: {
  id: string; step: string; title: string; children: React.ReactNode
}) {
  return (
    <section id={id} className="mb-20 scroll-mt-20">
      <div className="flex items-center gap-4 mb-6">
        <div className="w-8 h-8 rounded-full bg-indigo-600/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400 text-sm font-bold font-mono shrink-0">
          {step}
        </div>
        <h2 className="text-xl font-bold text-white">{title}</h2>
      </div>
      <div className="bg-gray-800/30 border border-gray-700/60 rounded-2xl p-6">
        {children}
      </div>
    </section>
  )
}

export default function MicroGPTPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      {/* Header */}
      <div className="mb-14">
        <div className="flex items-center gap-2 text-xs text-gray-600 mb-4 font-mono">
          <Link href="/learn" className="hover:text-gray-400">courses</Link>
          <span>/</span>
          <Link href="/learn?section=microgpt" className="hover:text-gray-400">MicroGPT</Link>
          <span>/</span>
          <span className="text-gray-400">interactive</span>
        </div>

        <h1 className="text-4xl md:text-5xl font-bold text-white mb-4 leading-tight">
          MicroGPT — Interactive
        </h1>
        <p className="text-gray-400 text-lg leading-relaxed mb-6">
          Andrej Karpathy wrote a{' '}
          <a href="https://gist.github.com/karpathy/8627fe009c40f57531cb18360106ce95"
            target="_blank" rel="noopener noreferrer"
            className="text-indigo-400 hover:text-indigo-300 underline">
            200-line Python script
          </a>{' '}
          that trains a GPT from scratch — no libraries, pure math.
          This page makes every step interactive. Watch each algorithm piece work in real time,
          then train the full model in your browser.
        </p>

        {/* Quick nav */}
        <div className="flex flex-wrap gap-2 text-xs font-mono">
          {[
            ['#tokenizer', '1. Tokenizer'],
            ['#softmax', '2. Softmax'],
            ['#loss', '3. Loss'],
            ['#attention', '4. Attention'],
            ['#training', '5. Training Canvas'],
          ].map(([href, label]) => (
            <a key={href} href={href}
              className="bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-400 hover:text-white px-3 py-1 rounded-full transition-all">
              {label}
            </a>
          ))}
        </div>
      </div>

      {/* Section 1: Dataset */}
      <section className="mb-20">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-8 h-8 rounded-full bg-gray-700 border border-gray-600 flex items-center justify-center text-gray-400 text-sm font-bold font-mono shrink-0">0</div>
          <h2 className="text-xl font-bold text-white">The Dataset</h2>
        </div>
        <div className="bg-gray-800/30 border border-gray-700/60 rounded-2xl p-6">
          <p className="text-gray-400 text-sm leading-relaxed mb-4">
            The model trains on 32,000 human names — one per line:{' '}
            <code className="text-indigo-400">emma, olivia, ava, isabella, sophia…</code>
            <br />
            Each name is a document. The model&apos;s job: learn the statistical patterns and generate
            plausible new names that could be real.
          </p>
          <div className="bg-gray-900/60 rounded-xl p-4 font-mono text-sm">
            <div className="text-gray-500 text-xs mb-3 uppercase tracking-widest">input.txt (excerpt)</div>
            <div className="flex flex-wrap gap-2">
              {['emma', 'olivia', 'ava', 'isabella', 'sophia', 'mia', 'charlotte', 'amelia', 'harper', 'evelyn'].map(n => (
                <span key={n} className="text-green-400">{n}</span>
              ))}
              <span className="text-gray-700">…32,000 names</span>
            </div>
          </div>
          <p className="text-gray-500 text-xs mt-4">
            After training, the model produces names like{' '}
            <span className="text-indigo-400">&quot;kamon&quot;, &quot;karai&quot;, &quot;anna&quot;, &quot;anton&quot;</span>.
            It learned which characters tend to follow which — purely from statistics.
          </p>
        </div>
      </section>

      {/* Section 1: Tokenizer */}
      <Section id="tokenizer" step="1" title="Tokenizer — Characters to Numbers">
        <p className="text-gray-400 text-sm leading-relaxed mb-5">
          Neural networks work with numbers, not text. Each unique character gets an integer ID.
          A special{' '}
          <code className="text-indigo-400">BOS</code> (Beginning of Sequence) token wraps every name.
          Type a name below and watch it tokenize.
        </p>
        <TokenizerViz />
      </Section>

      {/* Section 2: Softmax */}
      <Section id="softmax" step="2" title="Softmax — Raw Scores to Probabilities">
        <p className="text-gray-400 text-sm leading-relaxed mb-5">
          At each position, the model outputs 27 raw numbers (logits) — one per possible next token.
          Softmax converts them into probabilities: always positive, always summing to 1.
          One large logit dominates because of the exponential.
        </p>
        <SoftmaxViz />
      </Section>

      {/* Section 3: Loss */}
      <Section id="loss" step="3" title="Cross-Entropy Loss — Measuring Surprise">
        <p className="text-gray-400 text-sm leading-relaxed mb-5">
          Loss = −log(p) where p is the probability assigned to the correct next token.
          Low loss means the model was confident and right. High loss means it was surprised.
          The training loop minimizes this number.
        </p>
        <LossViz />
      </Section>

      {/* Section 4: Attention */}
      <Section id="attention" step="4" title="Self-Attention — How Tokens Talk to Each Other">
        <p className="text-gray-400 text-sm leading-relaxed mb-5">
          Each token computes a Query (&quot;what am I looking for?&quot;), Key (&quot;what do I contain?&quot;),
          and Value (&quot;what do I offer?&quot;). The query is compared against all past keys.
          High dot-product = high attention. The causal mask (╳) prevents peeking at the future.
        </p>
        <AttentionViz />
      </Section>

      {/* Section 5: Training Canvas */}
      <Section id="training" step="5" title="Training Canvas — Train a Real GPT in Your Browser">
        <p className="text-gray-400 text-sm leading-relaxed mb-6">
          This is Karpathy&apos;s microgpt, faithfully ported to JavaScript and running in a Web Worker.
          Same algorithm, same math — just 4,000× smaller than GPT-4.
          Pick a dataset, hit Train, and watch the loss fall in real time.
        </p>
        <div className="bg-gray-900/60 rounded-lg px-4 py-3 mb-6 border border-gray-700 text-xs font-mono">
          <div className="flex flex-wrap gap-4 text-gray-500">
            <span><span className="text-white">Architecture:</span> GPT-2 style (decoder-only)</span>
            <span><span className="text-white">Autograd:</span> custom Value class</span>
            <span><span className="text-white">Optimizer:</span> Adam (β₁=0.85, β₂=0.99)</span>
            <span><span className="text-white">Runtime:</span> CPU, Web Worker, ~10s</span>
          </div>
        </div>
        <TrainingCanvas />
      </Section>

      {/* Footer */}
      <div className="border-t border-gray-800 pt-10 flex flex-col sm:flex-row gap-4 justify-between items-start">
        <div>
          <p className="text-sm text-gray-500">
            Original code by{' '}
            <a href="https://gist.github.com/karpathy/8627fe009c40f57531cb18360106ce95"
              target="_blank" rel="noopener noreferrer"
              className="text-indigo-400 hover:text-indigo-300">
              Andrej Karpathy
            </a>.
            {' '}JS port adapted from{' '}
            <a href="https://github.com/jayyvk/trainmyowngpt"
              target="_blank" rel="noopener noreferrer"
              className="text-indigo-400 hover:text-indigo-300">
              trainmyowngpt
            </a>.
            {' '}Interactive explanations inspired by{' '}
            <a href="https://growingswe.com/blog/microgpt"
              target="_blank" rel="noopener noreferrer"
              className="text-indigo-400 hover:text-indigo-300">
              growingswe.com
            </a>.
          </p>
        </div>
        <Link href="/learn?section=microgpt"
          className="shrink-0 text-sm text-gray-500 hover:text-white border border-gray-700 hover:border-gray-500 px-4 py-2 rounded-lg transition-all">
          ← Back to curriculum
        </Link>
      </div>
    </div>
  )
}
