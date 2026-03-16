'use client'
import { useState } from 'react'

export default function LossViz() {
  const [prob, setProb] = useState(0.3)
  const loss = -Math.log(Math.max(prob, 1e-6))

  // Build curve data
  const curvePoints = Array.from({ length: 100 }, (_, i) => {
    const p = 0.01 + (i / 99) * 0.99
    const l = Math.min(-Math.log(p), 8)
    return { p, l }
  })
  const maxL = 8
  const toX = (p: number) => p * 100
  const toY = (l: number) => (1 - l / maxL) * 80 + 5

  const dotX = toX(prob)
  const dotY = toY(Math.min(loss, maxL))

  return (
    <div className="font-mono">
      <p className="text-xs text-gray-500 mb-4">
        Cross-entropy loss = −log(p) where p is the probability assigned to the correct next token.
        Drag the slider to see how confident (or wrong) the model is.
      </p>

      {/* Slider */}
      <div className="mb-6">
        <div className="flex justify-between text-xs text-gray-500 mb-2">
          <span>Probability assigned to correct token</span>
          <span className="text-white font-bold">{(prob * 100).toFixed(0)}%</span>
        </div>
        <input type="range" min={0.01} max={0.99} step={0.01} value={prob}
          onChange={e => setProb(parseFloat(e.target.value))}
          className="w-full h-1 accent-indigo-500 cursor-pointer"
        />
        <div className="flex justify-between text-xs text-gray-700 mt-1">
          <span>Very wrong (1%)</span>
          <span>Very confident (99%)</span>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6 items-center">
        {/* Loss curve */}
        <div className="bg-gray-900/60 border border-gray-700 rounded-lg p-3">
          <div className="text-xs text-gray-600 mb-2">Loss = −log(p)</div>
          <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-40 block">
            {/* Axes */}
            <line x1="0" y1="85" x2="100" y2="85" stroke="#374151" strokeWidth="0.5" />
            <line x1="0" y1="5" x2="0" y2="85" stroke="#374151" strokeWidth="0.5" />
            {/* Curve */}
            <polyline
              fill="none" stroke="#6366f1" strokeWidth="1.5"
              points={curvePoints.map(d => `${toX(d.p)},${toY(d.l)}`).join(' ')}
              vectorEffect="non-scaling-stroke"
            />
            {/* Current point */}
            <circle cx={dotX} cy={dotY} r="2.5" fill="#f97316" vectorEffect="non-scaling-stroke" />
            <line x1={dotX} y1={dotY} x2={dotX} y2="85" stroke="#f97316" strokeWidth="0.8" strokeDasharray="3,2" vectorEffect="non-scaling-stroke" />
            <line x1={dotX} y1={dotY} x2="0" y2={dotY} stroke="#f97316" strokeWidth="0.8" strokeDasharray="3,2" vectorEffect="non-scaling-stroke" />
            {/* Axis labels */}
            <text x="50" y="97" fontSize="4.5" fill="#6b7280" textAnchor="middle" vectorEffect="non-scaling-stroke">probability p</text>
            <text x="5" y="9" fontSize="4.5" fill="#6b7280" vectorEffect="non-scaling-stroke">loss</text>
          </svg>
        </div>

        {/* Current values */}
        <div className="space-y-4">
          <div className="bg-gray-800/60 border border-gray-700 rounded-lg p-4 text-center">
            <div className="text-3xl font-bold" style={{ color: loss < 1 ? '#22c55e' : loss < 2.5 ? '#eab308' : '#ef4444' }}>
              {loss.toFixed(3)}
            </div>
            <div className="text-xs text-gray-500 mt-1">cross-entropy loss</div>
          </div>

          <div className="text-xs text-gray-500 space-y-2">
            <div className={`flex justify-between p-2 rounded ${Math.abs(prob - 1) < 0.02 ? 'bg-green-500/10 border border-green-500/20 text-green-400' : 'bg-gray-800/40'}`}>
              <span>p=1.0 (perfect)</span><span>loss = 0.000</span>
            </div>
            <div className={`flex justify-between p-2 rounded ${Math.abs(prob - 0.5) < 0.05 ? 'bg-yellow-500/10 border border-yellow-500/20 text-yellow-400' : 'bg-gray-800/40'}`}>
              <span>p=0.5 (uncertain)</span><span>loss = 0.693</span>
            </div>
            <div className={`flex justify-between p-2 rounded ${prob < 0.05 ? 'bg-red-500/10 border border-red-500/20 text-red-400' : 'bg-gray-800/40'}`}>
              <span>p≈1/27 (random)</span><span>loss ≈ 3.296</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
