'use client'
import dynamic from 'next/dynamic'

const TrainingCanvas = dynamic(() => import('../TrainingCanvas'), {
  ssr: false,
  loading: () => <div className="animate-pulse bg-gray-800/50 rounded-2xl border border-gray-700 h-96" />
})

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

    # Forward pass: collect losses over all positions
    keys, values = [[] for _ in range(n_layer)], [[] for _ in range(n_layer)]
    losses = []
    for pos in range(n):
        logits   = gpt(tokens[pos], pos, keys, values)
        probs    = softmax(logits)
        loss_pos = probs[tokens[pos + 1]].log().neg()
        losses.append(loss_pos)

    loss = sum(losses) / n
    loss.backward()   # ← this single call computes 4,192 gradients at once

    # Adam update (lr decays linearly to 0)
    lr_t = lr * (1 - step / num_steps)
    for i, param in enumerate(params):
        m[i] = β1*m[i] + (1-β1)*param.grad
        v[i] = β2*v[i] + (1-β2)*param.grad**2
        param.data -= lr_t * m_hat / (sqrt(v_hat) + ε)
        param.grad = 0`}</pre>
      </Callout>

      <h2>What Happens During Training?</h2>
      <p>
        At step 0, all parameters are small random numbers. The model has no knowledge of language.
        Every prediction is nearly random — loss starts around <strong>3.3</strong>{' '}
        (−log(1/27) for random guessing among 27 tokens).
      </p>
      <p>
        After a few hundred steps, the model starts learning the most basic statistics:
        that names almost always end at BOS, that double letters exist, that certain
        consonant clusters are common. Loss drops to around 2.8.
      </p>
      <p>
        By step 1,000, the model settles around <strong>2.37</strong>. It has learned
        which characters tend to follow which, which sounds are common at the start vs. end,
        and how long a typical name runs. Generated names sound plausible — not random ASCII.
      </p>

      <div className="bg-gray-800/40 border border-gray-700 rounded-xl p-4 my-4 not-prose">
        <div className="text-xs text-gray-500 uppercase tracking-widest mb-3 font-mono">Training evolution</div>
        <div className="space-y-2 font-mono text-sm">
          {[
            { step: 0, loss: '3.30', sample: 'xrqkv, zzmbp, tvwqx', note: 'Random noise' },
            { step: 100, loss: '2.90', sample: 'arnen, emia, olen', note: 'Learning vowels' },
            { step: 300, loss: '2.70', sample: 'kamon, alir, anna', note: 'Name-like patterns' },
            { step: 1000, loss: '2.37', sample: 'karai, anna, anton', note: 'Plausible names' },
          ].map(r => (
            <div key={r.step} className="grid grid-cols-4 gap-3 items-center py-1.5 border-b border-gray-800 last:border-0">
              <div className="text-gray-600">step {r.step}</div>
              <div className={r.loss < '2.5' ? 'text-green-400' : r.loss < '2.8' ? 'text-yellow-400' : 'text-orange-400'}>
                loss: {r.loss}
              </div>
              <div className="text-indigo-300 col-span-1">{r.sample}</div>
              <div className="text-gray-600 text-xs">{r.note}</div>
            </div>
          ))}
        </div>
      </div>

      <h2>The Architecture in Numbers</h2>
      <div className="not-prose overflow-x-auto my-4">
        <table className="w-full text-sm border-collapse font-mono">
          <thead>
            <tr className="border-b border-gray-700">
              <th className="text-left p-3 text-gray-500">Component</th>
              <th className="text-left p-3 text-gray-500">microgpt</th>
              <th className="text-left p-3 text-gray-500">GPT-4 (est.)</th>
            </tr>
          </thead>
          <tbody className="text-gray-300">
            {[
              ['Parameters', '~4,200', '~1.8 trillion'],
              ['Layers', '1', '96+'],
              ['Embedding dim', '16', '12,288'],
              ['Attention heads', '4', '96'],
              ['Context window', '16 chars', '128k tokens'],
              ['Vocabulary', '27 chars', '~100k subwords'],
              ['Training time', '~10 seconds (CPU)', 'months on thousands of GPUs'],
            ].map(([comp, micro, gpt4]) => (
              <tr key={comp} className="border-b border-gray-800">
                <td className="p-3 text-gray-400">{comp}</td>
                <td className="p-3 text-indigo-400">{micro}</td>
                <td className="p-3 text-gray-600">{gpt4}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="text-xs text-gray-600 mt-2 font-mono">Same algorithm. Same math. Different scale.</div>
      </div>

      {/* ── The interactive training canvas ── */}
      <h2>Train It Yourself — Right Now</h2>
      <p>
        Karpathy&apos;s microgpt, ported to JavaScript by{' '}
        <a href="https://github.com/jayyvk/trainmyowngpt" target="_blank" rel="noopener noreferrer"
          className="text-indigo-400 hover:text-indigo-300">jayyvk</a>,
        and running entirely in a Web Worker in your browser.
        The complete training loop — autograd, attention, backpropagation, Adam — all in JavaScript.
        No server involved. No data leaves your device.
      </p>
      <p>
        Pick a dataset, configure the architecture, hit <strong>Train Model</strong>,
        and watch the loss curve fall in real time. Each time a sample is generated during
        training (every 50 steps), you&apos;ll see the names evolve from gibberish to something
        that sounds plausible.
      </p>

      <div className="not-prose my-6">
        <TrainingCanvas />
      </div>

      <Callout type="key">
        🎓 <strong>What you just did:</strong> You trained a real transformer language model —
        the same architecture as GPT-2 — from random initialization to generating coherent
        sequences, in about 10 seconds on your CPU. The only difference between this and GPT-4
        is scale: 4,200 parameters vs. ~1.8 trillion, 16-char context vs. 128k tokens,
        27-token vocabulary vs. 100k. Same math, same training loop, same algorithm.
      </Callout>

      <h2>What This Means for AI Agents</h2>
      <p>
        Now that you understand how an LLM works at the lowest level, the rest of this course
        makes a lot more sense:
      </p>
      <ul>
        <li>The <strong>context window</strong> is a hard physical limit — it&apos;s the{' '}
          <code>block_size</code> you just configured. Exceeding it means the model literally
          cannot see earlier tokens.</li>
        <li><strong>Temperature</strong> is just dividing logits before softmax. Low temperature =
          the model makes more confident, predictable choices. High temperature = more creative,
          more random.</li>
        <li><strong>Fine-tuning</strong> is running this exact same training loop, but starting
          from a pre-trained model&apos;s parameters instead of random initialization.</li>
        <li><strong>RAG</strong> and <strong>tool use</strong> are mechanisms to get information
          <em>into the context window</em> — because the model can only see what&apos;s in those
          tokens.</li>
      </ul>
      <p className="text-gray-500 text-sm">
        The next section — Agent Building Principles — builds on this foundation to explain
        how production agents are designed.
      </p>
    </article>
  )
}
