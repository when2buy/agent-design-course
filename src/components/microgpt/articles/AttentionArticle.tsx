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

// Simulated attention weights for 4 heads
const HEADS = [
  // Head 0: attends to most recent
  [[1.00,0.00,0.00,0.00,0.00],
   [0.28,0.72,0.00,0.00,0.00],
   [0.10,0.18,0.72,0.00,0.00],
   [0.05,0.10,0.15,0.70,0.00],
   [0.03,0.05,0.08,0.16,0.68]],
  // Head 1: attends to BOS (start token)
  [[1.00,0.00,0.00,0.00,0.00],
   [0.72,0.28,0.00,0.00,0.00],
   [0.65,0.20,0.15,0.00,0.00],
   [0.60,0.15,0.15,0.10,0.00],
   [0.55,0.15,0.15,0.10,0.05]],
  // Head 2: uniform over context
  [[1.00,0.00,0.00,0.00,0.00],
   [0.50,0.50,0.00,0.00,0.00],
   [0.35,0.33,0.32,0.00,0.00],
   [0.26,0.25,0.25,0.24,0.00],
   [0.21,0.20,0.20,0.20,0.19]],
  // Head 3: skip / vowel-seeking pattern
  [[1.00,0.00,0.00,0.00,0.00],
   [0.22,0.78,0.00,0.00,0.00],
   [0.48,0.08,0.44,0.00,0.00],
   [0.14,0.52,0.08,0.26,0.00],
   [0.38,0.08,0.38,0.08,0.08]],
]
const TOKENS = ['<BOS>', 'e', 'm', 'm', 'a']
const HEAD_DESCRIPTIONS = [
  'Attends to the most recent token — common for learning local n-gram patterns.',
  'Attends strongly to BOS — helps the model remember "we are generating a name".',
  'Spreads attention evenly — acts like a bag-of-words over past context.',
  'Shows a skip/vowel pattern — may have learned to track vowel positions.',
]

function AttentionHeatmap() {
  const [head, setHead] = useState(0)
  const weights = HEADS[head]

  return (
    <div className="bg-gray-800/50 border border-gray-700 rounded-2xl p-6 my-6 not-prose">
      <div className="text-xs text-gray-500 uppercase tracking-widest mb-4 font-mono">
        Attention weights for &quot;emma&quot; — switch heads to see different patterns
      </div>

      <div className="flex flex-wrap gap-2 mb-5">
        {[0,1,2,3].map(h => (
          <button key={h} onClick={() => setHead(h)}
            className={`px-4 py-1.5 rounded-lg text-sm font-mono font-medium transition-all ${
              head === h ? 'bg-indigo-600 text-white' : 'bg-gray-800 text-gray-500 hover:text-gray-300'
            }`}>
            Head {h}
          </button>
        ))}
      </div>

      <div className="bg-indigo-500/5 border border-indigo-500/20 rounded-lg p-3 mb-5 text-sm text-indigo-300">
        {HEAD_DESCRIPTIONS[head]}
      </div>

      {/* Heatmap */}
      <div className="overflow-x-auto">
        {/* Column headers (key positions) */}
        <div className="flex mb-2 ml-20 gap-1">
          {TOKENS.map((t, j) => (
            <div key={j} className="w-14 text-center text-xs text-gray-500 font-mono">{t}</div>
          ))}
          <div className="text-xs text-gray-700 ml-2 self-center">← keys</div>
        </div>

        {weights.map((row, i) => (
          <div key={i} className="flex items-center gap-1 mb-1">
            <div className="w-20 text-right pr-3 text-xs text-gray-500 font-mono shrink-0">
              {TOKENS[i]} →
            </div>
            {row.map((w, j) => {
              const masked = j > i
              return (
                <div key={j} title={masked ? 'masked' : `${(w*100).toFixed(0)}%`}
                  className="w-14 h-12 rounded flex flex-col items-center justify-center text-xs transition-all duration-300"
                  style={{
                    backgroundColor: masked ? '#0f172a' : `rgba(99,102,241,${w * 0.85 + 0.05})`,
                    color: masked ? '#1e293b' : w > 0.5 ? 'white' : '#94a3b8',
                    border: masked ? '1px solid #1e293b' : '1px solid rgba(99,102,241,0.15)',
                  }}>
                  {masked ? '╳' : (
                    <>
                      <span className="font-mono font-bold">{(w * 100).toFixed(0)}%</span>
                    </>
                  )}
                </div>
              )
            })}
          </div>
        ))}

        <div className="flex items-center gap-2 mt-4 ml-20 text-xs text-gray-600 font-mono">
          <div className="w-4 h-4 rounded" style={{ background: 'rgba(99,102,241,0.1)' }} />
          <span>0%</span>
          <div className="flex-1 h-2 rounded" style={{ background: 'linear-gradient(to right,rgba(99,102,241,0.1),rgba(99,102,241,0.9))' }} />
          <span>100%</span>
          <div className="w-4 h-4 rounded bg-gray-950 border border-gray-900 ml-3" />
          <span>masked (future)</span>
        </div>
      </div>
    </div>
  )
}

export default function AttentionArticle() {
  return (
    <article className="prose-custom">

      <h2>From Token IDs to Meaning: Embeddings</h2>
      <p>
        A raw token ID like <code>4</code> is just an index. The model can&apos;t do
        useful math with bare integers — <code>4 - 2 = 2</code> means nothing semantically.
        So each token looks up a learned vector (a list of 16 numbers) from an{' '}
        <strong>embedding table</strong>.
      </p>
      <p>
        Think of it as each token having a 16-dimensional &quot;personality&quot; that the model
        adjusts during training. Two tokens that behave similarly — say, all vowels — tend
        to end up with similar embedding vectors. The model learns these representations
        from scratch with no prior knowledge of what a vowel is.
      </p>

      <Callout type="code">
        <div className="text-gray-500 text-xs mb-2">microgpt.py — embeddings (3 lines)</div>
        <pre className="text-sm">{`state_dict = {
    'wte': matrix(vocab_size, n_embd),  # token embeddings:    [27 × 16]
    'wpe': matrix(block_size, n_embd),  # position embeddings: [16 × 16]
    ...
}
# In the forward pass:
tok_emb = state_dict['wte'][token_id]   # lookup row token_id
pos_emb = state_dict['wpe'][pos_id]     # lookup row pos_id
x = [t + p for t, p in zip(tok_emb, pos_emb)]   # add them`}</pre>
      </Callout>

      <p>
        Position matters too. The letter &quot;a&quot; at position 0 plays a different role
        than &quot;a&quot; at position 4. So there&apos;s a second embedding table indexed by
        position. The token embedding and position embedding are <strong>added together</strong>{' '}
        to form the input to the transformer layers.
      </p>

      {/* ── Attention ── */}
      <h2>Self-Attention: How Tokens Talk to Each Other</h2>
      <p>
        This is the core innovation in transformers. At each position, the model needs to
        gather information from previous positions. It does this through <strong>attention</strong>.
      </p>
      <p>
        Each token produces three vectors from its embedding:
      </p>
      <ul>
        <li><strong>Query (Q)</strong> — &quot;What am I looking for?&quot;</li>
        <li><strong>Key (K)</strong> — &quot;What do I contain?&quot;</li>
        <li><strong>Value (V)</strong> — &quot;What do I offer if selected?&quot;</li>
      </ul>
      <p>
        The query at the current position is compared against all keys from previous positions
        via dot product. High dot product = high relevance. Softmax converts these scores into
        <strong> attention weights</strong>, and the weighted sum of values is the output.
      </p>

      <Callout type="code">
        <div className="text-gray-500 text-xs mb-2">microgpt.py — one attention head (simplified)</div>
        <pre className="text-sm">{`q = linear(x, W_q)   # query: what am I looking for?
k = linear(x, W_k)   # key:   what do I contain?
v = linear(x, W_v)   # value: what do I offer?

# Score: how relevant is each past token?
attn_logits = [dot(q, k_past) / sqrt(head_dim) for k_past in past_keys]
attn_weights = softmax(attn_logits)

# Output: weighted sum of values
out = sum(w * v_past for w, v_past in zip(attn_weights, past_values))`}</pre>
      </Callout>

      <h2>The Causal Mask: No Peeking at the Future</h2>
      <p>
        The gray cells marked ╳ in the heatmap below are the <strong>causal mask</strong>.
        Position 2 cannot attend to position 4 because position 4 hasn&apos;t happened yet.
        This is what makes the model <strong>autoregressive</strong>: each position only sees
        the past. Without this mask, the model could trivially learn to copy future tokens
        and would learn nothing useful.
      </p>
      <p>
        Switch between the four attention heads to see how different heads specialize in
        different patterns. This specialization emerges naturally from training — nobody
        programmed head 1 to focus on BOS.
      </p>

      <AttentionHeatmap />

      <h2>Multi-Head Attention: Learning Multiple Patterns at Once</h2>
      <p>
        Microgpt has 4 attention heads (<code>n_head = 4</code>).
        Each head operates on a 4-dimensional slice of the 16-dimensional embedding
        (<code>head_dim = n_embd / n_head = 4</code>).
        Their outputs are concatenated and projected back to 16 dimensions.
      </p>

      <Callout type="code">
        <div className="text-gray-500 text-xs mb-2">microgpt.py — multi-head attention loop</div>
        <pre className="text-sm">{`x_attn = []
for h in range(n_head):
    hs  = h * head_dim
    q_h = q[hs : hs+head_dim]
    k_h = [ki[hs : hs+head_dim] for ki in keys[li]]
    v_h = [vi[hs : hs+head_dim] for vi in values[li]]

    attn_logits  = [sum(q_h[j]*k_h[t][j] for j in range(head_dim))
                    / head_dim**0.5 for t in range(len(k_h))]
    attn_weights = softmax(attn_logits)
    head_out     = [sum(attn_weights[t]*v_h[t][j] for t in range(len(v_h)))
                    for j in range(head_dim)]
    x_attn.extend(head_out)   # concatenate heads

x = linear(x_attn, W_o)      # project back to n_embd`}</pre>
      </Callout>

      <h2>The MLP Block: Where Each Token Thinks Independently</h2>
      <p>
        After attention, each token passes through a two-layer feedforward network (MLP).
        If attention is how tokens <em>communicate</em>, the MLP is where each position
        <em>thinks independently</em> — applying non-linear transformations that let the
        model learn complex patterns.
      </p>

      <Callout type="code">
        <div className="text-gray-500 text-xs mb-2">microgpt.py — MLP block</div>
        <pre className="text-sm">{`x = linear(x, state_dict[f'layer{li}.mlp_fc1'])   # expand: 16 → 64
x = [xi.relu() for xi in x]                        # ReLU: zero out negatives
x = linear(x, state_dict[f'layer{li}.mlp_fc2'])   # contract: 64 → 16`}</pre>
      </Callout>

      <Callout type="key">
        💡 <strong>Residual connections</strong> are critical. Without <code>x = attention(x) + x</code>,
        gradients would shrink to near-zero in deep layers and training would stall.
        The residual connection gives gradients a direct shortcut back to early parameters.
        RMSNorm (root-mean-square normalization) prevents activations from growing or shrinking,
        which stabilizes training.
      </Callout>

      <p className="text-gray-500 text-sm">
        Now we have all the pieces. The final article puts them together —
        train a real GPT in your browser and watch it go from random noise to generating
        plausible names in about 10 seconds.
      </p>
    </article>
  )
}
