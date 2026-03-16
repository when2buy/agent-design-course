'use client'
import { useState } from 'react'

const UCHARS = 'abcdefghijklmnopqrstuvwxyz'.split('')
const BOS_ID = 26
const COLORS = ['#6366f1','#8b5cf6','#ec4899','#f97316','#eab308','#22c55e','#14b8a6','#06b6d4','#3b82f6','#a855f7']
const tokenColor = (id: number) => id === BOS_ID ? '#6b7280' : COLORS[id % COLORS.length]

function tokenize(name: string) {
  const tokens: { char: string; id: number }[] = []
  tokens.push({ char: '<BOS>', id: BOS_ID })
  for (const ch of name.toLowerCase().replace(/[^a-z]/g, '')) {
    const idx = UCHARS.indexOf(ch)
    if (idx >= 0) tokens.push({ char: ch, id: idx })
  }
  tokens.push({ char: '<BOS>', id: BOS_ID })
  return tokens
}

function Callout({ type, children }: { type: 'info' | 'code' | 'key'; children: React.ReactNode }) {
  const styles = {
    info: 'bg-blue-500/5 border-blue-500/20 text-blue-300',
    code: 'bg-gray-900 border-gray-700 text-gray-300 font-mono text-sm',
    key:  'bg-indigo-500/10 border-indigo-500/30 text-indigo-300',
  }
  return (
    <div className={`border rounded-xl p-4 my-4 ${styles[type]}`}>{children}</div>
  )
}

export default function TokenizerArticle() {
  const [input, setInput] = useState('emma')
  const tokens = tokenize(input)

  return (
    <article className="prose-custom">

      {/* ── 1. The dataset ── */}
      <h2>The Dataset: 32,000 Names</h2>
      <p>
        Andrej Karpathy&apos;s microgpt trains on a list of 32,000 human names — one per line.
        <code>emma</code>, <code>olivia</code>, <code>ava</code>, <code>isabella</code>…
        Each name is a <em>document</em>. The model&apos;s job is to learn the statistical patterns
        in these names and generate plausible new ones it has never seen.
      </p>
      <p>
        By the end of training, the model produces names like{' '}
        <span className="text-indigo-400 font-mono">&quot;kamon&quot;</span>,{' '}
        <span className="text-indigo-400 font-mono">&quot;anna&quot;</span>,{' '}
        <span className="text-indigo-400 font-mono">&quot;anton&quot;</span>.
        It learned which characters follow which, which sounds are common at the start vs. the end,
        and how long a typical name runs — purely from statistics.
      </p>
      <p>
        From ChatGPT&apos;s perspective, your conversation is just a document too.
        When you type a prompt, the model&apos;s response is a statistical <em>document completion</em>.
        Same algorithm, just trained on text instead of names.
      </p>

      {/* ── 2. Why numbers? ── */}
      <h2>Neural Networks Can&apos;t Read — Only Count</h2>
      <p>
        Neural networks are, at their core, chains of multiplications and additions.
        They can compute <code>0.3 × 0.7 + 0.1</code> but they cannot process the letter{' '}
        <code>&quot;e&quot;</code>. So we need a way to translate text into numbers
        before any learning can happen.
      </p>
      <p>
        The simplest possible approach: assign one integer to every unique character in the dataset.
        This is what microgpt does.
      </p>

      <Callout type="code">
        <div className="text-gray-500 text-xs mb-2">microgpt.py — the tokenizer (5 lines)</div>
        <pre className="text-sm">{`uchars = sorted(set(''.join(docs)))  # unique chars, sorted
BOS    = len(uchars)                  # special token: beginning of sequence
vocab_size = len(uchars) + 1         # e.g. 26 letters + 1 BOS = 27

# Encoding: char → id
encode = lambda ch: uchars.index(ch)
# Decoding: id → char
decode = lambda id: uchars[id] if id < len(uchars) else '<BOS>'`}</pre>
      </Callout>

      <p>
        The 26 lowercase letters get IDs 0–25.{' '}
        <code>a=0, b=1, c=2, …, z=25</code>.
        Then we add one special token called <strong>BOS</strong> (Beginning of Sequence)
        with ID 26. BOS is placed at both the start <em>and</em> end of every name —
        it tells the model &quot;a name starts here&quot; and &quot;a name ends here&quot;.
      </p>

      <Callout type="key">
        💡 <strong>Key insight:</strong> The integer values carry no magnitude.
        Token 4 is not &quot;more than&quot; token 2. Each token is simply a distinct symbol,
        like assigning a different color to each letter.
        The model learns what each one <em>means</em> purely through training.
      </Callout>

      {/* ── 3. Interactive ── */}
      <h2>Try It: Type a Name, Watch It Tokenize</h2>
      <p>
        Type any name below. Watch each character map to its integer token ID,
        and notice how <code>&lt;BOS&gt;</code> wraps both ends.
      </p>

      <div className="bg-gray-800/50 border border-gray-700 rounded-2xl p-6 my-6 not-prose">
        <div className="mb-5">
          <label className="text-xs text-gray-500 uppercase tracking-widest block mb-2 font-mono">
            Type a name (letters only)
          </label>
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value.toLowerCase().replace(/[^a-z]/g, '').slice(0, 15))}
            placeholder="emma"
            className="bg-gray-900 border border-gray-600 rounded-lg px-4 py-2.5 text-white text-base w-full max-w-xs focus:outline-none focus:border-indigo-500 font-mono"
          />
        </div>

        <div className="flex flex-wrap gap-3 mb-6">
          {tokens.map((t, i) => (
            <div key={i} className="flex flex-col items-center gap-1.5">
              <div className="px-3 py-2 rounded-lg text-sm font-bold"
                style={{ backgroundColor: tokenColor(t.id) + '25', border: `1.5px solid ${tokenColor(t.id)}50`, color: tokenColor(t.id) }}>
                {t.char}
              </div>
              <div className="text-xs text-gray-500 font-mono">id:{t.id}</div>
            </div>
          ))}
        </div>

        <div className="border border-gray-700 rounded-xl overflow-hidden">
          <div className="bg-gray-900/60 px-4 py-2 text-xs text-gray-600 uppercase tracking-widest border-b border-gray-700 font-mono">
            Full vocabulary — 27 tokens
          </div>
          <div className="p-3 flex flex-wrap gap-1.5">
            {UCHARS.map((ch, i) => (
              <div key={ch} className="px-2 py-1 rounded text-xs font-mono border transition-all duration-150"
                style={tokens.some(t => t.char === ch)
                  ? { backgroundColor: tokenColor(i) + '20', borderColor: tokenColor(i) + '50', color: tokenColor(i) }
                  : { backgroundColor: 'transparent', borderColor: '#374151', color: '#4b5563' }}>
                {ch}={i}
              </div>
            ))}
            <div className="px-2 py-1 rounded text-xs font-mono border"
              style={{ backgroundColor: '#6b728015', borderColor: '#6b728040', color: '#9ca3af' }}>
              BOS=26
            </div>
          </div>
        </div>
        <p className="text-xs text-gray-600 mt-3 font-mono">
          Highlighted tokens are those present in your name.
        </p>
      </div>

      {/* ── 4. Production context ── */}
      <h2>Production Tokenizers: The Same Idea, Scaled Up</h2>
      <p>
        Microgpt uses character-level tokenization — every character is its own token.
        Production LLMs like GPT-4 use a more sophisticated approach called{' '}
        <strong>Byte Pair Encoding (BPE)</strong>, where common character sequences get their own tokens.
        The word <code>&quot;tokenization&quot;</code> might become three tokens:{' '}
        <code>&quot;token&quot;</code>, <code>&quot;ization&quot;</code>,
        or even just two: <code>&quot;tokenization&quot;</code> if it&apos;s common enough.
      </p>
      <p>
        GPT-4&apos;s vocabulary has ~100,000 tokens. But the principle is identical:
        text → integers → model → integers → text. Everything else is just efficiency.
      </p>

      <Callout type="code">
        <div className="text-gray-500 text-xs mb-2">GPT-4 tokenizer (tiktoken)</div>
        <pre className="text-sm">{`import tiktoken
enc = tiktoken.get_encoding("cl100k_base")  # GPT-4's tokenizer

enc.encode("hello world")     # → [15339, 1917]
enc.encode("tokenization")    # → [5263, 2065]   (2 tokens)
enc.n_vocab                   # → 100277`}</pre>
      </Callout>

      <Callout type="key">
        🔑 <strong>What this means for agents:</strong> Every time you send a message to an LLM,
        it&apos;s immediately converted to a sequence of integers. The &quot;context window&quot; limit
        (e.g. 128k tokens for GPT-4) is measured in these token IDs, not characters.
        A token is roughly 4 characters of English text.
      </Callout>

      <p className="text-gray-500 text-sm">
        Next up: the model has the tokens. Now what? It needs to predict which token comes next —
        and that requires understanding probabilities.
      </p>
    </article>
  )
}
