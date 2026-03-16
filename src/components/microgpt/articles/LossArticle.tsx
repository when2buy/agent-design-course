'use client'
import { useState } from 'react'

function Callout({ type, children }: { type: 'info' | 'code' | 'key'; children: React.ReactNode }) {
  const styles = {
    info: 'bg-blue-500/5 border-blue-500/20 text-blue-300',
    code: 'bg-gray-900 border-gray-700 text-gray-300 font-mono text-sm',
    key:  'bg-indigo-500/10 border-indigo-500/30 text-indigo-300',
  }
  return <div className={`border rounded-xl p-4 my-4 ${styles[type]}`}>{children}</div>
}

// Interactive loss curve
function LossVizInteractive() {
  const [prob, setProb] = useState(0.3)
  const loss = -Math.log(Math.max(prob, 1e-6))

  const curvePoints = Array.from({ length: 100 }, (_, i) => {
    const p = 0.01 + (i / 99) * 0.99
    return { p, l: Math.min(-Math.log(p), 6) }
  })
  const maxL = 6
  const toX = (p: number) => p * 100
  const toY = (l: number) => (1 - l / maxL) * 80 + 8

  return (
    <div className="bg-gray-800/50 border border-gray-700 rounded-2xl p-6 my-6 not-prose">
      <div className="text-xs text-gray-500 uppercase tracking-widest mb-4 font-mono">
        Cross-entropy loss — drag to explore
      </div>

      <div className="mb-5">
        <div className="flex justify-between text-sm mb-2">
          <span className="text-gray-400">Probability assigned to correct token</span>
          <span className="text-white font-bold font-mono">{(prob * 100).toFixed(0)}%</span>
        </div>
        <input type="range" min={0.01} max={0.99} step={0.01} value={prob}
          onChange={e => setProb(parseFloat(e.target.value))}
          className="w-full h-1.5 accent-indigo-500 cursor-pointer" />
        <div className="flex justify-between text-xs text-gray-700 mt-1 font-mono">
          <span>confident wrong (1%)</span>
          <span>confident right (99%)</span>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6 items-center">
        <div className="bg-gray-900/60 border border-gray-700 rounded-xl p-4">
          <div className="text-xs text-gray-600 mb-2 font-mono">loss = −log(p)</div>
          <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-36 block">
            <line x1="0" y1="88" x2="100" y2="88" stroke="#374151" strokeWidth="0.4" />
            <line x1="2" y1="8" x2="2" y2="88" stroke="#374151" strokeWidth="0.4" />
            <polyline fill="none" stroke="#6366f1" strokeWidth="1.5"
              points={curvePoints.map(d => `${toX(d.p)},${toY(d.l)}`).join(' ')}
              vectorEffect="non-scaling-stroke" />
            <circle cx={toX(prob)} cy={toY(Math.min(loss, maxL))} r="2.5" fill="#f97316" vectorEffect="non-scaling-stroke" />
            <line x1={toX(prob)} y1={toY(Math.min(loss, maxL))} x2={toX(prob)} y2="88"
              stroke="#f97316" strokeWidth="0.8" strokeDasharray="3,2" vectorEffect="non-scaling-stroke" />
            <line x1={toX(prob)} y1={toY(Math.min(loss, maxL))} x2="2" y2={toY(Math.min(loss, maxL))}
              stroke="#f97316" strokeWidth="0.8" strokeDasharray="3,2" vectorEffect="non-scaling-stroke" />
            <text x="50" y="99" fontSize="4" fill="#6b7280" textAnchor="middle" vectorEffect="non-scaling-stroke">probability p →</text>
          </svg>
        </div>

        <div className="space-y-3">
          <div className="bg-gray-800/80 border border-gray-700 rounded-xl p-4 text-center">
            <div className="text-4xl font-bold font-mono" style={{
              color: loss < 0.8 ? '#22c55e' : loss < 2 ? '#eab308' : loss < 3.5 ? '#f97316' : '#ef4444'
            }}>
              {loss.toFixed(3)}
            </div>
            <div className="text-xs text-gray-500 mt-1">cross-entropy loss</div>
          </div>

          <div className="space-y-2 text-xs font-mono">
            {[
              { p: 0.99, label: 'p=0.99  perfect confidence', color: 'text-green-400' },
              { p: 0.50, label: 'p=0.50  uncertain', color: 'text-yellow-400' },
              { p: 0.037, label: 'p=1/27  random guess', color: 'text-orange-400' },
              { p: 0.01, label: 'p=0.01  confidently wrong', color: 'text-red-400' },
            ].map(({ p, label, color }) => (
              <button key={p} onClick={() => setProb(p)}
                className={`w-full text-left p-2 rounded border border-gray-700 hover:border-gray-500 transition-all ${
                  Math.abs(prob - p) < 0.01 ? 'bg-gray-700 border-gray-500' : 'bg-gray-800/40'
                }`}>
                <span className={color}>{label}</span>
                <span className="text-gray-600 ml-2">→ loss={(-Math.log(Math.max(p, 1e-6))).toFixed(3)}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// Computation graph visualization
function ComputationGraph() {
  const [step, setStep] = useState(0)
  const steps = [
    { code: 'a = Value(2.0)',     highlight: 'a', desc: 'Create node a with data=2.0. No children yet — it\'s a leaf.' },
    { code: 'b = Value(3.0)',     highlight: 'b', desc: 'Create node b with data=3.0. Another leaf.' },
    { code: 'c = a * b',          highlight: 'c', desc: 'Multiply: c.data = 2×3 = 6. Local grads: ∂c/∂a = b = 3, ∂c/∂b = a = 2.' },
    { code: 'L = c + a',          highlight: 'L', desc: 'Add: L.data = 6+2 = 8. Local grads: ∂L/∂c = 1, ∂L/∂a = 1.' },
    { code: 'L.backward()',       highlight: 'backward', desc: 'Run backprop: L.grad=1. Walk reverse topo order, accumulate.' },
    { code: '# c.grad = 1×1 = 1', highlight: 'c_grad', desc: 'c.grad = ∂L/∂c × L.grad = 1 × 1 = 1.' },
    { code: '# a.grad = 3×1 + 1×1 = 4', highlight: 'a_grad', desc: 'a appears TWICE: in c=a*b (∂c/∂a=3) AND in L=c+a (∂L/∂a=1). Sum both paths: 3+1=4.' },
    { code: '# b.grad = 2×1 = 2', highlight: 'b_grad', desc: 'b.grad = ∂c/∂b × c.grad = 2 × 1 = 2.' },
  ]

  const nodeData: Record<string, { label: string; val?: string; grad?: string; active?: boolean }> = {
    a: { label: 'a', val: '2.0', grad: step >= 6 ? '4.0' : step >= 5 ? '?' : '0.0', active: step >= 0 },
    b: { label: 'b', val: '3.0', grad: step >= 7 ? '2.0' : '0.0', active: step >= 1 },
    c: { label: 'c = a×b', val: '6.0', grad: step >= 5 ? '1.0' : '0.0', active: step >= 2 },
    L: { label: 'L = c+a', val: '8.0', grad: step >= 4 ? '1.0' : '0.0', active: step >= 3 },
  }

  return (
    <div className="bg-gray-800/50 border border-gray-700 rounded-2xl p-6 my-6 not-prose">
      <div className="text-xs text-gray-500 uppercase tracking-widest mb-4 font-mono">
        Backpropagation step-through: L = a×b + a  (a=2, b=3)
      </div>

      <div className="font-mono text-sm bg-gray-900 rounded-xl border border-gray-700 p-4 mb-4">
        {steps.map((s, i) => (
          <div key={i} className={`py-0.5 transition-all ${
            i === step ? 'text-green-400 bg-green-400/10 px-2 rounded' :
            i < step ? 'text-gray-600' : 'text-gray-800'
          }`}>
            {s.code}
          </div>
        ))}
      </div>

      <div className="bg-blue-500/5 border border-blue-500/20 rounded-lg p-3 mb-4 text-sm text-blue-300 min-h-[3rem]">
        {steps[step].desc}
      </div>

      {/* Graph nodes */}
      <div className="flex flex-col md:flex-row gap-3 mb-4">
        {Object.entries(nodeData).map(([key, n]) => (
          <div key={key} className={`flex-1 rounded-lg border p-3 text-center font-mono text-sm transition-all ${
            n.active ? 'border-indigo-500/40 bg-indigo-500/10' : 'border-gray-700 bg-gray-800/30 opacity-30'
          }`}>
            <div className="text-white font-bold mb-1">{n.label}</div>
            <div className="text-gray-400 text-xs">data: <span className="text-green-400">{n.val}</span></div>
            <div className="text-gray-400 text-xs">grad: <span className={
              parseFloat(n.grad || '0') > 0 ? 'text-orange-400' : 'text-gray-600'
            }>{n.grad}</span></div>
          </div>
        ))}
      </div>

      <div className="flex gap-3 items-center">
        <button onClick={() => setStep(Math.max(0, step - 1))} disabled={step === 0}
          className="px-4 py-2 bg-gray-700 hover:bg-gray-600 disabled:opacity-30 text-white rounded-lg text-sm transition-all">
          ← Back
        </button>
        <div className="text-xs text-gray-600 font-mono flex-1 text-center">Step {step + 1} / {steps.length}</div>
        <button onClick={() => setStep(Math.min(steps.length - 1, step + 1))} disabled={step === steps.length - 1}
          className="px-4 py-2 bg-gray-700 hover:bg-gray-600 disabled:opacity-30 text-white rounded-lg text-sm transition-all">
          Next →
        </button>
      </div>
    </div>
  )
}

export default function LossArticle() {
  return (
    <article className="prose-custom">

      <h2>Measuring Surprise: Cross-Entropy Loss</h2>
      <p>
        We now have a probability distribution. The model assigned some probability to each of
        the 27 possible next tokens. We need to answer one question:{' '}
        <em>how wrong was the prediction?</em>
      </p>
      <p>
        The answer is <strong>cross-entropy loss</strong>: −log(p), where p is the probability
        the model assigned to the <em>correct</em> next token.
      </p>
      <ul>
        <li>Model said 90% chance → correct. Loss = −log(0.9) = <strong>0.105</strong>. Good.</li>
        <li>Model said 50% chance → correct. Loss = −log(0.5) = <strong>0.693</strong>. Uncertain.</li>
        <li>Model said 1% chance → correct. Loss = −log(0.01) = <strong>4.605</strong>. Very bad.</li>
      </ul>
      <p>
        The curve has two properties that make it useful: it&apos;s zero when the model is
        perfectly confident (p=1), and it goes to infinity as the model assigns
        near-zero probability to the truth (p→0) — it punishes confident wrong answers severely.
      </p>

      <LossVizInteractive />

      <Callout type="code">
        <div className="text-gray-500 text-xs mb-2">microgpt.py — computing loss per position</div>
        <pre className="text-sm">{`for pos in range(n):
    logits   = gpt(tokens[pos], pos, keys, values)
    probs    = softmax(logits)
    loss_pos = probs[tokens[pos + 1]].log().neg()   # −log(p_correct)
    losses.append(loss_pos)

loss = sum(losses) / n   # average over document length
`}</pre>
      </Callout>

      <p>
        A model that randomly guesses among 27 tokens would assign 1/27 ≈ 3.7% probability to
        the correct token, giving a loss of −log(1/27) ≈ <strong>3.3</strong>.
        That&apos;s where microgpt starts. After 1,000 steps, it reaches around{' '}
        <strong>2.37</strong> — meaning the model has learned real patterns.
      </p>

      {/* ── Backpropagation ── */}
      <h2>Backpropagation: Tracing Blame Back to Every Parameter</h2>
      <p>
        We have a loss. Now we need to answer: for each of our 4,192 parameters,
        if I nudge it up by a tiny amount, does the loss go up or down — and by how much?
        That&apos;s the <strong>gradient</strong>, and <strong>backpropagation</strong> computes it.
      </p>
      <p>
        Every mathematical operation is a node in a <em>computation graph</em>.
        Each node remembers its children and its local derivative.
        The backward pass starts at the loss (where the gradient is trivially 1.0)
        and multiplies local derivatives along every path back to the inputs —
        the <strong>chain rule</strong>, applied recursively.
      </p>
      <p>
        Microgpt implements this from scratch with a <code>Value</code> class.
        This is <em>exactly</em> the same algorithm PyTorch&apos;s{' '}
        <code>loss.backward()</code> runs — just on scalars instead of tensors.
      </p>

      <Callout type="code">
        <div className="text-gray-500 text-xs mb-2">microgpt.py — the autograd Value class (key parts)</div>
        <pre className="text-sm">{`class Value:
    def __init__(self, data, children=(), local_grads=()):
        self.data        = data     # scalar computed in forward pass
        self.grad        = 0        # ∂loss/∂self, computed in backward pass
        self._children   = children
        self._local_grads = local_grads

    def __mul__(self, other):
        # c = a * b  →  ∂c/∂a = b.data,  ∂c/∂b = a.data
        return Value(self.data * other.data, (self, other), (other.data, self.data))

    def backward(self):
        # Build topological order, then walk in reverse
        topo = []
        def build(v):
            if v not in visited:
                visited.add(v)
                for child in v._children: build(child)
                topo.append(v)
        build(self)
        self.grad = 1
        for v in reversed(topo):
            for child, local_grad in zip(v._children, v._local_grads):
                child.grad += local_grad * v.grad   # chain rule`}</pre>
      </Callout>

      <p>
        Step through a simple example: <code>L = a×b + a</code> with <code>a=2, b=3</code>.
        Notice that <code>a</code> has a gradient of 4.0, not 3.0 — because it contributes to
        the loss through <em>two paths</em> (the multiply and the add).
        The chain rule sums contributions from all paths.
      </p>

      <ComputationGraph />

      <Callout type="key">
        💡 This is the same algorithm that trains every neural network in the world —
        GPT-4, Stable Diffusion, AlphaFold. The only difference is PyTorch runs it on tensors
        with GPU acceleration instead of on Python scalars. Same math.
      </Callout>

      <h2>The Adam Optimizer</h2>
      <p>
        Gradients tell us <em>which direction</em> to nudge each parameter.
        But plain gradient descent converges slowly.{' '}
        <strong>Adam</strong> (Adaptive Moment Estimation) is smarter:
      </p>
      <ul>
        <li><strong>Momentum (m)</strong>: a running average of recent gradients. If a parameter
          consistently gets pushed in the same direction, take a larger step.</li>
        <li><strong>Adaptive learning rate (v)</strong>: a running average of squared gradients.
          Parameters that have been oscillating get smaller steps.</li>
      </ul>

      <Callout type="code">
        <div className="text-gray-500 text-xs mb-2">microgpt.py — Adam update (per parameter)</div>
        <pre className="text-sm">{`β1, β2, ε = 0.85, 0.99, 1e-8   # Karpathy's hyperparams

m[i] = β1 * m[i] + (1 - β1) * param.grad          # momentum
v[i] = β2 * v[i] + (1 - β2) * param.grad**2       # adaptive lr

m_hat = m[i] / (1 - β1**(step+1))                 # bias correction
v_hat = v[i] / (1 - β2**(step+1))

lr_t = lr * (1 - step / num_steps)                 # linear LR decay
param.data -= lr_t * m_hat / (√v_hat + ε)          # update
param.grad = 0                                      # zero gradient`}</pre>
      </Callout>

      <p className="text-gray-500 text-sm">
        Next: with embeddings, attention, and the MLP in place, we can trace exactly
        how each token decides what to attend to — and why that&apos;s the key to transformers.
      </p>
    </article>
  )
}
