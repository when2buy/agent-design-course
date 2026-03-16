'use client'
import TrainingCanvas from '../TrainingCanvas'

function Callout({ type, children }: { type: 'info' | 'code' | 'key'; children: React.ReactNode }) {
  const styles = {
    info: 'bg-blue-500/5 border-blue-500/20 text-blue-300',
    code: 'bg-gray-900 border-gray-700 text-gray-300 font-mono text-sm',
    key:  'bg-indigo-500/10 border-indigo-500/30 text-indigo-300',
  }
  return <div className={`border rounded-xl p-4 my-4 ${styles[type]}`}>{children}</div>
}

export default function TrainingArticle() {
  return (
    <article className="prose-custom">

      <h2>The Full Picture: Forward → Loss → Backward → Update</h2>
      <p>
        Let&apos;s put everything together. The training loop repeats one step at a time:
      </p>
      <ol>
        <li><strong>Pick a document</strong>: one name from the dataset</li>
        <li><strong>Tokenize</strong>: wrap with BOS, convert to integer IDs</li>
        <li><strong>Forward pass</strong>: run every token through embeddings → attention → MLP → logits</li>
        <li><strong>Compute loss</strong>: cross-entropy at each position, averaged over the document</li>
        <li><strong>Backward pass</strong>: backpropagate through every operation, accumulate gradients</li>
        <li><strong>Adam update</strong>: nudge each parameter in the direction that reduces loss</li>
        <li><strong>Zero gradients</strong>: reset all <code>.grad</code> fields to 0</li>
        <li>Repeat 1,000 times</li>
      </ol>

      <Callout type="code">
        <div className="text-gray-500 text-xs mb-2">microgpt.py — the full training loop</div>
        <pre className="text-sm">{`for step in range(num_steps):
    doc    = docs[step % len(docs)]
    tokens = [BOS] + [uchars.index(ch) for ch in doc] + [BOS]
    n      = min(block_size, len(tokens) - 1)

    keys, values = [[] for _ in range(n_layer)], [[] for _ in range(n_layer)]
    losses = []
    for pos in range(n):
        logits   = gpt(tokens[pos], pos, keys, values)
        probs    = softmax(logits)
        loss_pos = probs[tokens[pos + 1]].log().neg()   # −log(p)
        losses.append(loss_pos)

    loss = sum(losses) / n
    loss.backward()   # ← computes all 4,192 gradients at once

    lr_t = lr * (1 - step / num_steps)   # linear LR decay
    for i, param in enumerate(params):
        m[i] = β1*m[i] + (1-β1)*param.grad
        v[i] = β2*v[i] + (1-β2)*param.grad**2
        param.data -= lr_t * m_hat / (sqrt(v_hat) + ε)
        param.grad = 0`}</pre>
      </Callout>

      <h2>What Happens During Training?</h2>
      <p>
        At step 0, all parameters are small random numbers. Loss starts around{' '}
        <strong>3.3</strong> — the expected loss when guessing randomly among 27 tokens.
        After 1,000 steps it reaches around <strong>2.37</strong>.
        Generated samples evolve from noise to plausible names.
      </p>

      <div className="bg-gray-800/40 border border-gray-700 rounded-xl p-4 my-4 not-prose">
        <div className="text-xs text-gray-500 uppercase tracking-widest mb-3 font-mono">Training evolution</div>
        <div className="space-y-2 font-mono text-sm">
          {[
            { step: 0,    loss: '3.30', sample: 'xrqkv, zzmbp', note: 'Random noise' },
            { step: 100,  loss: '2.90', sample: 'arnen, emia',  note: 'Learning vowels' },
            { step: 300,  loss: '2.70', sample: 'kamon, anna',  note: 'Name-like patterns' },
            { step: 1000, loss: '2.37', sample: 'karai, anton', note: 'Plausible names' },
          ].map(r => (
            <div key={r.step} className="grid grid-cols-4 gap-3 items-center py-1.5 border-b border-gray-800 last:border-0">
              <div className="text-gray-600 text-xs">step {r.step}</div>
              <div className={`text-xs ${parseFloat(r.loss) < 2.5 ? 'text-green-400' : parseFloat(r.loss) < 2.8 ? 'text-yellow-400' : 'text-orange-400'}`}>
                loss: {r.loss}
              </div>
              <div className="text-indigo-300 text-xs">{r.sample}</div>
              <div className="text-gray-600 text-xs">{r.note}</div>
            </div>
          ))}
        </div>
      </div>

      <h2>Train It Yourself — Right Now</h2>
      <p>
        Karpathy&apos;s microgpt, ported to JavaScript, running entirely in a Web Worker
        in your browser. Pick a dataset, configure the architecture, hit{' '}
        <strong>▶ train</strong>, and watch the loss fall in real time.
        No server. No GPU. About 10 seconds on your CPU.
      </p>

      <div className="not-prose my-8">
        <TrainingCanvas />
      </div>

      <Callout type="key">
        🎓 <strong>What you just did:</strong> Trained a real transformer — same architecture as GPT-2 —
        from random initialization in ~10 seconds on your CPU. GPT-4 differs only in scale:
        ~1.8 trillion parameters vs. ~4,200. Same math. Same training loop. Same algorithm.
      </Callout>

      <h2>What This Means for AI Agents</h2>
      <ul>
        <li>The <strong>context window</strong> is the <code>block_size</code> you just configured — a hard physical limit.</li>
        <li><strong>Temperature</strong> is just dividing logits before softmax.</li>
        <li><strong>Fine-tuning</strong> is running this exact loop starting from pre-trained weights.</li>
        <li><strong>RAG and tool use</strong> are mechanisms to get information <em>into</em> the context window — because the model can only see what&apos;s in those tokens.</li>
      </ul>
    </article>
  )
}
