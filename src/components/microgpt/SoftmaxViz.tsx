'use client'
import { useState } from 'react'

const INITIAL_LOGITS = [2.1, 0.5, -0.3, 1.8, -1.2, 0.9]
const TOKEN_LABELS = ['a', 'e', 'i', 'm', 'n', 'o']

function softmax(logits: number[]): number[] {
  const maxVal = Math.max(...logits)
  const exps = logits.map(v => Math.exp(v - maxVal))
  const total = exps.reduce((a, b) => a + b, 0)
  return exps.map(e => e / total)
}

const COLORS = ['#6366f1','#8b5cf6','#ec4899','#f97316','#eab308','#22c55e']

export default function SoftmaxViz() {
  const [logits, setLogits] = useState(INITIAL_LOGITS)
  const probs = softmax(logits)
  const maxProb = Math.max(...probs)

  return (
    <div className="font-mono">
      <p className="text-xs text-gray-500 mb-4">
        Adjust the raw logits — watch how softmax converts them to a probability distribution
        that always sums to 1.0.
      </p>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Sliders */}
        <div>
          <div className="text-xs text-gray-500 uppercase tracking-widest mb-3">Logits (raw model outputs)</div>
          <div className="space-y-3">
            {logits.map((v, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-8 text-xs text-right font-bold" style={{ color: COLORS[i] }}>
                  &apos;{TOKEN_LABELS[i]}&apos;
                </div>
                <input type="range" min={-4} max={6} step={0.1} value={v}
                  onChange={e => {
                    const next = [...logits]; next[i] = parseFloat(e.target.value); setLogits(next)
                  }}
                  className="flex-1 h-1 cursor-pointer"
                  style={{ accentColor: COLORS[i] }}
                />
                <div className="w-10 text-xs text-right text-gray-400">{v.toFixed(1)}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Bar chart */}
        <div>
          <div className="text-xs text-gray-500 uppercase tracking-widest mb-3">Probabilities (after softmax)</div>
          <div className="space-y-2">
            {probs.map((p, i) => (
              <div key={i} className="flex items-center gap-2">
                <div className="w-8 text-xs text-right font-bold" style={{ color: COLORS[i] }}>
                  &apos;{TOKEN_LABELS[i]}&apos;
                </div>
                <div className="flex-1 bg-gray-800 rounded-full h-5 relative overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-150"
                    style={{ width: `${p * 100}%`, backgroundColor: COLORS[i] + '60', borderRight: `2px solid ${COLORS[i]}` }}
                  />
                </div>
                <div className="w-14 text-xs text-right"
                  style={{ color: p === maxProb ? 'white' : '#6b7280', fontWeight: p === maxProb ? 700 : 400 }}>
                  {(p * 100).toFixed(1)}%
                </div>
              </div>
            ))}
          </div>
          <div className="mt-3 text-xs text-gray-600 flex justify-between">
            <span>Sum: <span className="text-green-400">{probs.reduce((a, b) => a + b, 0).toFixed(4)}</span></span>
            <span>Max: <span className="text-white">&apos;{TOKEN_LABELS[probs.indexOf(maxProb)]}&apos; ({(maxProb * 100).toFixed(1)}%)</span></span>
          </div>
        </div>
      </div>

      {/* Formula */}
      <div className="mt-4 bg-gray-900/60 border border-gray-700 rounded-lg p-3 text-xs text-gray-400">
        <span className="text-indigo-400">softmax</span>(z)ᵢ = e^(zᵢ - max) / Σⱼ e^(zⱼ - max)
        <span className="text-gray-600 ml-4">← subtracting max prevents overflow, doesn't change result</span>
      </div>
    </div>
  )
}
