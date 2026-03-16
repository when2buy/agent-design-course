'use client'
import { useState } from 'react'

function softmax(logits: number[]): number[] {
  const maxVal = Math.max(...logits)
  const exps = logits.map(v => Math.exp(v - maxVal))
  const total = exps.reduce((a, b) => a + b, 0)
  return exps.map(e => e / total)
}

const COLORS = ['#6366f1','#8b5cf6','#ec4899','#f97316','#eab308','#22c55e']
const TOKEN_LABELS = ['a', 'e', 'i', 'm', 'n', 'o']
const INITIAL_LOGITS = [0.2, 2.1, -0.3, 1.8, 0.5, -1.2]

function Callout({ type, children }: { type: 'info' | 'code' | 'key'; children: React.ReactNode }) {
  const styles = {
    info: 'bg-blue-500/5 border-blue-500/20 text-blue-300',
    code: 'bg-gray-900 border-gray-700 text-gray-300 font-mono text-sm',
    key:  'bg-indigo-500/10 border-indigo-500/30 text-indigo-300',
  }
  return <div className={`border rounded-xl p-4 my-4 ${styles[type]}`}>{children}</div>
}

// Sliding window visualization
function SlidingWindow() {
  const tokens = ['<BOS>', 'e', 'm', 'm', 'a', '<BOS>']
  const [step, setStep] = useState(0)
  const maxStep = tokens.length - 2

  return (
    <div className="bg-gray-800/50 border border-gray-700 rounded-2xl p-6 my-6 not-prose">
      <div className="text-xs text-gray-500 uppercase tracking-widest mb-4 font-mono">
        Prediction game — step through the name &quot;emma&quot;
      </div>

      <div className="flex flex-wrap gap-2 mb-6">
        {tokens.map((t, i) => {
          const isContext = i <= step
          const isTarget = i === step + 1
          return (
            <div key={i} className="flex flex-col items-center gap-1">
              <div className={`px-3 py-2 rounded-lg text-sm font-mono font-bold transition-all border ${
                isTarget
                  ? 'bg-green-500/20 border-green-500/50 text-green-400'
                  : isContext
                  ? 'bg-indigo-500/20 border-indigo-500/40 text-indigo-300'
                  : 'bg-gray-800 border-gray-700 text-gray-600'
              }`}>
                {t}
              </div>
              <div className={`text-xs font-mono ${
                isTarget ? 'text-green-500' : isContext ? 'text-indigo-500' : 'text-gray-700'
              }`}>
                {isTarget ? '← predict' : isContext ? 'context' : ''}
              </div>
            </div>
          )
        })}
      </div>

      <div className="bg-gray-900/60 rounded-lg p-3 mb-4 font-mono text-sm border border-gray-700">
        <span className="text-gray-500">Input: </span>
        <span className="text-indigo-400">[{tokens.slice(0, step + 1).join(', ')}]</span>
        <span className="text-gray-500 ml-4">Predict: </span>
        <span className="text-green-400">{tokens[step + 1]}</span>
      </div>

      <div className="flex gap-3 items-center">
        <button onClick={() => setStep(Math.max(0, step - 1))}
          disabled={step === 0}
          className="px-4 py-2 bg-gray-700 hover:bg-gray-600 disabled:opacity-30 text-white rounded-lg text-sm transition-all">
          ← Prev
        </button>
        <div className="text-xs text-gray-600 font-mono flex-1 text-center">
          Step {step + 1} of {maxStep + 1}
        </div>
        <button onClick={() => setStep(Math.min(maxStep, step + 1))}
          disabled={step === maxStep}
          className="px-4 py-2 bg-gray-700 hover:bg-gray-600 disabled:opacity-30 text-white rounded-lg text-sm transition-all">
          Next →
        </button>
      </div>

      <p className="text-xs text-gray-600 mt-3 font-mono">
        For &quot;emma&quot;, this produces 5 training examples. This sliding window is how <em>all</em> language models train.
      </p>
    </div>
  )
}

// Interactive softmax
function SoftmaxInteractive() {
  const [logits, setLogits] = useState(INITIAL_LOGITS)
  const probs = softmax(logits)
  const maxIdx = probs.indexOf(Math.max(...probs))

  return (
    <div className="bg-gray-800/50 border border-gray-700 rounded-2xl p-6 my-6 not-prose">
      <div className="text-xs text-gray-500 uppercase tracking-widest mb-4 font-mono">
        Adjust logits — watch probabilities update in real time
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div>
          <div className="text-xs text-gray-500 mb-3 font-mono">Raw logits (drag sliders)</div>
          <div className="space-y-3">
            {logits.map((v, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-8 text-xs font-bold font-mono text-right" style={{ color: COLORS[i] }}>
                  &apos;{TOKEN_LABELS[i]}&apos;
                </div>
                <input type="range" min={-4} max={6} step={0.1} value={v}
                  onChange={e => { const n = [...logits]; n[i] = parseFloat(e.target.value); setLogits(n) }}
                  className="flex-1 h-1 cursor-pointer" style={{ accentColor: COLORS[i] }} />
                <div className="w-10 text-xs text-right text-gray-400 font-mono">{v.toFixed(1)}</div>
              </div>
            ))}
          </div>
        </div>

        <div>
          <div className="text-xs text-gray-500 mb-3 font-mono">Probabilities (after softmax)</div>
          <div className="space-y-2">
            {probs.map((p, i) => (
              <div key={i} className="flex items-center gap-2">
                <div className="w-8 text-xs font-bold font-mono text-right" style={{ color: COLORS[i] }}>
                  &apos;{TOKEN_LABELS[i]}&apos;
                </div>
                <div className="flex-1 bg-gray-800 rounded-full h-5 relative overflow-hidden">
                  <div className="h-full rounded-full transition-all duration-100"
                    style={{ width: `${p * 100}%`, backgroundColor: COLORS[i] + '50', borderRight: `2px solid ${COLORS[i]}` }} />
                </div>
                <div className="w-14 text-xs text-right font-mono"
                  style={{ color: i === maxIdx ? 'white' : '#6b7280', fontWeight: i === maxIdx ? 700 : 400 }}>
                  {(p * 100).toFixed(1)}%
                </div>
              </div>
            ))}
          </div>
          <div className="mt-3 text-xs font-mono flex justify-between text-gray-600">
            <span>Sum: <span className="text-green-400">{probs.reduce((a,b) => a+b, 0).toFixed(4)}</span></span>
            <span>Predicts: <span className="text-white">&apos;{TOKEN_LABELS[maxIdx]}&apos;</span></span>
          </div>
        </div>
      </div>

      <div className="mt-4 bg-gray-900/60 border border-gray-700 rounded-lg p-3 font-mono text-xs text-gray-400">
        softmax(z)ᵢ = e^(zᵢ − max) / Σⱼ e^(zⱼ − max)
        <span className="text-gray-600 ml-3">← −max prevents overflow, result unchanged</span>
      </div>
    </div>
  )
}

export default function SoftmaxArticle() {
  return (
    <article className="prose-custom">

      <h2>The Prediction Game</h2>
      <p>
        Here&apos;s the entire task microgpt (and every LLM) solves:
        given the tokens seen so far, predict the <em>probability distribution</em> over what comes next.
        Not just one answer — a full probability distribution over all possible next tokens.
      </p>
      <p>
        We slide through the sequence one position at a time. At position 0,
        the model sees only <code>&lt;BOS&gt;</code> and must predict the first letter.
        At position 1, it sees <code>&lt;BOS&gt;, e</code> and must predict <code>m</code>.
        And so on, until the name ends.
      </p>

      <p>
        Step through the sequence below and watch the context grow while the target shifts forward.
        Each step produces one training example.
      </p>

      <SlidingWindow />

      <Callout type="key">
        💡 For the name &quot;emma&quot;, this produces <strong>5 training examples</strong>.
        For a dataset of 32,000 names, it produces hundreds of thousands of examples —
        all from the same sliding window trick. This is how GPT-4 was trained too.
      </Callout>

      {/* ── Logits → probabilities ── */}
      <h2>From Raw Scores to Probabilities: Softmax</h2>
      <p>
        At each position, the model outputs one number per possible next token —
        27 numbers in microgpt, ~100,000 in GPT-4. These raw numbers are called <strong>logits</strong>.
        They can be anything: positive, negative, large, small.
      </p>
      <p>
        We need to convert them into a probability distribution: all positive, all summing to 1.0.
        The function that does this is called <strong>softmax</strong>.
      </p>

      <Callout type="code">
        <div className="text-gray-500 text-xs mb-2">microgpt.py — softmax (3 lines)</div>
        <pre className="text-sm">{`def softmax(logits):
    max_val = max(val.data for val in logits)    # for numerical stability
    exps    = [(val - max_val).exp() for val in logits]
    total   = sum(exps)
    return  [e / total for e in exps]`}</pre>
      </Callout>

      <p>
        The softmax function exponentiates each logit and divides by the total.
        The subtraction of <code>max_val</code> is a stability trick — it doesn&apos;t change
        the result mathematically (dividing numerator and denominator by the same constant cancels),
        but it prevents <code>exp(500)</code> from producing infinity.
      </p>
      <p>
        Adjust the logits below and watch how the probability distribution changes.
        Notice how <strong>one large logit completely dominates</strong> — the exponential amplifies differences.
        A logit of 4.0 vs 2.0 produces a probability ratio of e² ≈ 7.4×.
      </p>

      <SoftmaxInteractive />

      {/* ── Why this matters ── */}
      <h2>Sampling from the Distribution</h2>
      <p>
        During <em>training</em>, we compare the output probabilities against the true next token
        to compute a loss. During <em>inference</em> (generation), we sample from the distribution —
        randomly choosing the next token proportional to its probability.
      </p>
      <p>
        <strong>Temperature</strong> controls how sharp or flat the distribution is.
        Before softmax, divide the logits by the temperature value:
      </p>
      <ul>
        <li><code>temperature = 1.0</code>: sample directly from learned distribution</li>
        <li><code>temperature = 0.5</code>: sharpen distribution — top choices get more probability</li>
        <li><code>temperature = 2.0</code>: flatten distribution — more random, more creative</li>
      </ul>

      <Callout type="code">
        <div className="text-gray-500 text-xs mb-2">microgpt.py — generation with temperature</div>
        <pre className="text-sm">{`temperature = 0.5
probs = softmax([logit / temperature for logit in logits])
next_token = random.choices(range(vocab_size), weights=[p.data for p in probs])[0]`}</pre>
      </Callout>

      <Callout type="key">
        🔑 <strong>What this means for agents:</strong> When you see an LLM give different answers
        to the same question, that&apos;s temperature sampling. A higher temperature = more varied
        but potentially less accurate. <code>temperature=0</code> always picks the most probable token
        (greedy decoding) — deterministic but can get repetitive.
      </Callout>

      <p className="text-gray-500 text-sm">
        Next: we have probabilities. Now we need to measure how wrong they are —
        and more importantly, how to make them less wrong.
      </p>
    </article>
  )
}
