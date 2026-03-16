'use client'
import { useState } from 'react'

// Simulated attention weights for "emma" across 4 heads
// rows = query position, cols = key position (causal: upper-right is masked)
const HEADS = [
  // Head 0: attends to recent position
  [[1.0, 0.0, 0.0, 0.0, 0.0],
   [0.3, 0.7, 0.0, 0.0, 0.0],
   [0.1, 0.2, 0.7, 0.0, 0.0],
   [0.05,0.1, 0.15,0.7, 0.0],
   [0.02,0.05,0.08,0.15,0.7]],
  // Head 1: attends to BOS (position 0)
  [[1.0, 0.0, 0.0, 0.0, 0.0],
   [0.7, 0.3, 0.0, 0.0, 0.0],
   [0.65,0.2, 0.15,0.0, 0.0],
   [0.6, 0.15,0.15,0.1, 0.0],
   [0.55,0.15,0.15,0.1, 0.05]],
  // Head 2: spread attention
  [[1.0, 0.0, 0.0, 0.0, 0.0],
   [0.5, 0.5, 0.0, 0.0, 0.0],
   [0.35,0.35,0.3, 0.0, 0.0],
   [0.25,0.25,0.25,0.25,0.0],
   [0.2, 0.2, 0.2, 0.2, 0.2]],
  // Head 3: skip pattern
  [[1.0, 0.0, 0.0, 0.0, 0.0],
   [0.2, 0.8, 0.0, 0.0, 0.0],
   [0.5, 0.1, 0.4, 0.0, 0.0],
   [0.15,0.5, 0.1, 0.25,0.0],
   [0.35,0.1, 0.35,0.1, 0.1]],
]

const TOKENS = ['<BOS>', 'e', 'm', 'm', 'a']

function heatColor(weight: number, masked: boolean): string {
  if (masked) return '#111827'
  const intensity = Math.round(weight * 255)
  return `rgb(${Math.round(99 + (99 - 99) * weight)}, ${Math.round(102 - 102 * weight)}, ${Math.round(241 - 100 * weight)})`
}

export default function AttentionViz() {
  const [activeHead, setActiveHead] = useState(0)
  const weights = HEADS[activeHead]

  return (
    <div className="font-mono">
      <p className="text-xs text-gray-500 mb-4">
        For the sequence &quot;emma&quot;, each position attends to earlier positions.
        The gray region is the causal mask — the future is invisible.
        Switch heads to see different attention patterns.
      </p>

      {/* Head selector */}
      <div className="flex gap-2 mb-5">
        {[0, 1, 2, 3].map(h => (
          <button key={h} onClick={() => setActiveHead(h)}
            className={`px-4 py-1.5 rounded-lg text-xs font-medium transition-all ${
              activeHead === h
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-800 text-gray-500 hover:text-gray-300'
            }`}
          >
            Head {h}
          </button>
        ))}
        <div className="ml-2 text-xs text-gray-600 self-center">
          {activeHead === 0 && '→ attends to recent token'}
          {activeHead === 1 && '→ attends to BOS (sequence start)'}
          {activeHead === 2 && '→ spreads evenly over context'}
          {activeHead === 3 && '→ skip-pattern attention'}
        </div>
      </div>

      {/* Heatmap */}
      <div className="overflow-x-auto">
        <div className="inline-block min-w-full">
          {/* Column headers (keys) */}
          <div className="flex mb-1 ml-16">
            {TOKENS.map((t, j) => (
              <div key={j} className="w-12 text-center text-xs text-gray-600">{t}</div>
            ))}
          </div>

          {weights.map((row, i) => (
            <div key={i} className="flex items-center mb-1">
              {/* Row header (query) */}
              <div className="w-16 text-right pr-3 text-xs text-gray-600 shrink-0">{TOKENS[i]}</div>
              {row.map((w, j) => {
                const masked = j > i
                return (
                  <div key={j}
                    className="w-12 h-10 rounded flex items-center justify-center text-xs transition-all"
                    style={{
                      backgroundColor: masked ? '#111827' : `rgba(99, 102, 241, ${w * 0.8 + 0.05})`,
                      color: masked ? '#1f2937' : w > 0.5 ? 'white' : '#9ca3af',
                      border: masked ? '1px solid #1f2937' : '1px solid rgba(99,102,241,0.2)',
                    }}
                    title={masked ? 'masked (future)' : `attn weight: ${w.toFixed(2)}`}
                  >
                    {masked ? '╳' : w.toFixed(2)}
                  </div>
                )
              })}
            </div>
          ))}

          {/* Legend */}
          <div className="flex items-center gap-2 mt-4 ml-16 text-xs text-gray-600">
            <div className="w-4 h-4 rounded" style={{ background: 'rgba(99,102,241,0.1)' }} />
            <span>0.0</span>
            <div className="flex-1 h-2 rounded" style={{ background: 'linear-gradient(to right, rgba(99,102,241,0.1), rgba(99,102,241,0.9))' }} />
            <span>1.0</span>
            <div className="w-4 h-4 rounded bg-gray-900 border border-gray-800 ml-2" />
            <span>masked</span>
          </div>
        </div>
      </div>

      <p className="text-xs text-gray-600 mt-4">
        4 heads run in parallel, each operating on a 4-dim slice of the 16-dim embedding.
        Their outputs are concatenated and projected back to 16 dims. Different heads learn
        to capture different structural patterns.
      </p>
    </div>
  )
}
