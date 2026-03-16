'use client'
import { useState } from 'react'

const UCHARS = 'abcdefghijklmnopqrstuvwxyz'.split('')
const BOS_ID = 26

function tokenize(name: string) {
  const tokens: { char: string; id: number; isBOS: boolean }[] = []
  tokens.push({ char: '<BOS>', id: BOS_ID, isBOS: true })
  for (const ch of name.toLowerCase()) {
    const idx = UCHARS.indexOf(ch)
    if (idx >= 0) tokens.push({ char: ch, id: idx, isBOS: false })
  }
  tokens.push({ char: '<BOS>', id: BOS_ID, isBOS: true })
  return tokens
}

const COLORS = [
  '#6366f1','#8b5cf6','#ec4899','#f97316','#eab308',
  '#22c55e','#14b8a6','#06b6d4','#3b82f6','#a855f7',
]
const tokenColor = (id: number) => id === BOS_ID ? '#6b7280' : COLORS[id % COLORS.length]

export default function TokenizerViz() {
  const [input, setInput] = useState('emma')
  const tokens = tokenize(input)

  return (
    <div className="font-mono">
      <div className="mb-4">
        <label className="text-xs text-gray-500 uppercase tracking-widest block mb-2">Type a name</label>
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value.toLowerCase().replace(/[^a-z]/g, '').slice(0, 15))}
          placeholder="emma"
          className="bg-gray-900 border border-gray-600 rounded-lg px-4 py-2 text-white text-sm w-full max-w-xs focus:outline-none focus:border-indigo-500 font-mono"
        />
      </div>

      {/* Token chips */}
      <div className="flex flex-wrap gap-2 mb-6">
        {tokens.map((t, i) => (
          <div key={i} className="flex flex-col items-center gap-1">
            <div
              className="px-3 py-1.5 rounded-lg text-sm font-bold text-white"
              style={{ backgroundColor: tokenColor(t.id) + '30', border: `1px solid ${tokenColor(t.id)}60`, color: tokenColor(t.id) }}
            >
              {t.char}
            </div>
            <div className="text-xs text-gray-600">id:{t.id}</div>
          </div>
        ))}
      </div>

      {/* Vocab table */}
      <div className="border border-gray-700 rounded-lg overflow-hidden">
        <div className="bg-gray-800/60 px-4 py-2 text-xs text-gray-500 uppercase tracking-widest border-b border-gray-700">
          Character Vocabulary (27 tokens total)
        </div>
        <div className="p-3 flex flex-wrap gap-1.5">
          {UCHARS.map((ch, i) => (
            <div key={ch}
              className="px-2 py-1 rounded text-xs font-mono border transition-all"
              style={
                tokens.some(t => t.char === ch)
                  ? { backgroundColor: tokenColor(i) + '25', borderColor: tokenColor(i) + '60', color: tokenColor(i) }
                  : { backgroundColor: 'transparent', borderColor: '#374151', color: '#6b7280' }
              }
            >
              {ch}={i}
            </div>
          ))}
          <div className="px-2 py-1 rounded text-xs font-mono border"
            style={{ backgroundColor: '#6b728025', borderColor: '#6b728060', color: '#9ca3af' }}>
            BOS={BOS_ID}
          </div>
        </div>
      </div>

      <p className="text-xs text-gray-600 mt-3">
        The integer values carry no magnitude — token 4 is not "more than" token 2.
        Each token is simply a distinct symbol. The model learns what each one means through training.
      </p>
    </div>
  )
}
