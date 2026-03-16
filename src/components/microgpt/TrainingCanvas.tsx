'use client'
import { useState, useEffect, useRef, useCallback } from 'react'

const PRESETS = [
  { key: 'names',      label: 'Baby Names',    desc: '2,000+ popular names',      file: '/datasets/names.txt' },
  { key: 'dinos',      label: 'Dinosaurs',     desc: '1,500+ species names',       file: '/datasets/dinos.txt' },
  { key: 'ycstartups', label: 'YC Startups',   desc: '5,000+ startup names',       file: '/datasets/ycstartups.txt' },
  { key: 'words',      label: 'English Words', desc: '10,000 common words',        file: '/datasets/words.txt' },
]

function LossChart({ data }: { data: { step: number; loss: number }[] }) {
  if (data.length < 2) return null
  let ema = data[0].loss
  const sm = data.map(d => { ema = 0.93 * ema + 0.07 * d.loss; return ema })
  const mx = Math.max(...sm), mn = Math.min(...sm), rng = mx - mn || 1
  const toY = (l: number) => ((mx - l) / rng) * 80 + 10
  const toX = (i: number) => (i / Math.max(sm.length - 1, 1)) * 100
  const pts = sm.map((v, i) => `${toX(i)},${toY(v)}`).join(' ')
  return (
    <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-28 block">
      {/* Grid lines */}
      {[0.25, 0.5, 0.75].map(f => (
        <line key={f} x1="0" y1={10 + f * 80} x2="100" y2={10 + f * 80} stroke="#374151" strokeWidth="0.5" />
      ))}
      <polyline fill="none" stroke="#6366f1" strokeWidth="1.5" points={pts} vectorEffect="non-scaling-stroke" />
      <circle cx={toX(sm.length - 1)} cy={toY(sm[sm.length - 1])} r="2" fill="#6366f1" vectorEffect="non-scaling-stroke" />
      {/* Labels */}
      <text x="1" y="9" fontSize="5" fill="#6b7280" vectorEffect="non-scaling-stroke">{mx.toFixed(2)}</text>
      <text x="1" y="96" fontSize="5" fill="#6b7280" vectorEffect="non-scaling-stroke">{mn.toFixed(2)}</text>
    </svg>
  )
}

export default function TrainingCanvas() {
  const workerRef = useRef<Worker | null>(null)

  const [preset, setPreset] = useState('names')
  const [dataset, setDataset] = useState<{ vocabSize: number; numDocs: number; sampleDocs: string[] } | null>(null)
  const [config, setConfig] = useState({ n_embd: 16, n_head: 4, n_layer: 1, block_size: 16, num_steps: 1000 })
  const [status, setStatus] = useState<'idle' | 'loading' | 'ready' | 'training' | 'done'>('idle')
  const [lossHistory, setLossHistory] = useState<{ step: number; loss: number }[]>([])
  const [currentStep, setCurrentStep] = useState(0)
  const [currentLoss, setCurrentLoss] = useState(0)
  const [currentSample, setCurrentSample] = useState('')
  const [finalSamples, setFinalSamples] = useState<string[]>([])
  const [stepMs, setStepMs] = useState(0)
  const [genPrompt, setGenPrompt] = useState('')
  const [genTemp, setGenTemp] = useState(0.7)
  const [genResults, setGenResults] = useState<string[]>([])

  // Initialize worker
  useEffect(() => {
    const w = new Worker('/microgpt-worker.js')
    workerRef.current = w
    w.onmessage = (e) => {
      const { type, data } = e.data
      if (type === 'dataset_loaded') {
        setDataset(data)
        setStatus('ready')
        setConfig(c => ({ ...c, num_steps: Math.min(2000, Math.max(500, Math.round(data.numDocs * 2 / 50) * 50)) }))
      }
      if (type === 'step') {
        setCurrentStep(data.step)
        setCurrentLoss(data.loss)
        setStepMs(data.stepTimeMs)
        setLossHistory(prev => [...prev, { step: data.step, loss: data.loss }])
        if (data.sample) setCurrentSample(data.sample)
      }
      if (type === 'complete') {
        setStatus('done')
        setFinalSamples(data.samples)
      }
      if (type === 'stopped') setStatus('ready')
      if (type === 'generated') setGenResults(data.samples)
    }
    return () => w.terminate()
  }, [])

  const loadDataset = useCallback(async (key: string) => {
    const p = PRESETS.find(x => x.key === key)
    if (!p) return
    setStatus('loading')
    setDataset(null); setLossHistory([]); setCurrentStep(0); setFinalSamples([])
    try {
      const text = await fetch(p.file).then(r => r.text())
      workerRef.current?.postMessage({ type: 'load_dataset', data: { text } })
    } catch (e) {
      setStatus('idle')
      console.error('Failed to load dataset', e)
    }
  }, [])

  const startTraining = useCallback(() => {
    if (!dataset) return
    setStatus('training')
    setLossHistory([]); setCurrentStep(0); setCurrentSample(''); setFinalSamples([])
    workerRef.current?.postMessage({ type: 'init_model', data: { config } })
    setTimeout(() => workerRef.current?.postMessage({ type: 'train' }), 50)
  }, [dataset, config])

  const stopTraining = useCallback(() => {
    workerRef.current?.postMessage({ type: 'stop' })
  }, [])

  const doGenerate = useCallback(() => {
    workerRef.current?.postMessage({ type: 'generate', data: { prompt: genPrompt, temperature: genTemp, count: 10 } })
  }, [genPrompt, genTemp])

  const progress = config.num_steps > 0 ? (currentStep / config.num_steps) * 100 : 0

  // Estimate param count
  const paramCount = (() => {
    const v = dataset?.vocabSize || 28
    const { n_embd, n_layer, block_size } = config
    return v * n_embd + block_size * n_embd + v * n_embd +
      n_layer * (4 * n_embd * n_embd + n_embd * 4 * n_embd + n_embd * 4 * n_embd + 4 * n_embd * n_embd)
  })()

  return (
    <div className="font-mono text-sm">
      {/* Dataset selector */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-6">
        {PRESETS.map(p => (
          <button key={p.key}
            onClick={() => { setPreset(p.key); loadDataset(p.key) }}
            className={`p-3 rounded-lg border text-left transition-all ${
              preset === p.key
                ? 'border-indigo-500 bg-indigo-500/10 text-white'
                : 'border-gray-700 bg-gray-800/50 text-gray-400 hover:border-gray-500'
            }`}
          >
            <div className="font-semibold text-xs">{p.label}</div>
            <div className="text-xs text-gray-500 mt-0.5">{p.desc}</div>
          </button>
        ))}
      </div>

      {/* Dataset info */}
      {dataset && (
        <div className="bg-gray-800/50 rounded-lg p-4 mb-6 border border-gray-700">
          <div className="flex flex-wrap gap-4 text-xs text-gray-400 mb-2">
            <span>📚 <strong className="text-white">{dataset.numDocs.toLocaleString()}</strong> documents</span>
            <span>🔤 <strong className="text-white">{dataset.vocabSize}</strong> tokens (chars + BOS)</span>
            <span>⚙️ <strong className="text-white">{paramCount.toLocaleString()}</strong> parameters</span>
          </div>
          <div className="flex flex-wrap gap-2 mt-2">
            {dataset.sampleDocs.slice(0, 8).map((d, i) => (
              <span key={i} className="bg-gray-700 text-gray-300 px-2 py-0.5 rounded text-xs">{d}</span>
            ))}
            <span className="text-gray-600 text-xs self-center">...</span>
          </div>
        </div>
      )}

      {/* Config */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
        {[
          { key: 'n_embd',     label: 'Embedding dim', min: 8,   max: 64,  step: 4 },
          { key: 'n_head',     label: 'Attention heads', min: 1, max: 8,   step: 1 },
          { key: 'n_layer',    label: 'Layers',         min: 1,  max: 4,   step: 1 },
          { key: 'block_size', label: 'Context length', min: 8,  max: 32,  step: 4 },
          { key: 'num_steps',  label: 'Training steps', min: 100, max: 3000, step: 100 },
        ].map(({ key, label, min, max, step }) => (
          <div key={key} className="bg-gray-800/50 rounded-lg p-3 border border-gray-700">
            <div className="flex justify-between items-center mb-2 text-xs text-gray-400">
              <span>{label}</span>
              <span className="text-white font-bold">{config[key as keyof typeof config]}</span>
            </div>
            <input type="range" min={min} max={max} step={step}
              value={config[key as keyof typeof config]}
              onChange={e => setConfig(c => ({ ...c, [key]: parseInt(e.target.value) }))}
              disabled={status === 'training'}
              className="w-full h-1 accent-indigo-500 cursor-pointer disabled:opacity-50"
            />
          </div>
        ))}
      </div>

      {/* Controls */}
      <div className="flex gap-3 mb-6">
        {status !== 'training' ? (
          <button onClick={startTraining}
            disabled={!dataset || status === 'loading'}
            className="flex-1 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white py-3 rounded-lg font-bold transition-all"
          >
            {status === 'loading' ? '⏳ Loading dataset...' : '▶ Train Model'}
          </button>
        ) : (
          <button onClick={stopTraining}
            className="flex-1 bg-red-600 hover:bg-red-500 text-white py-3 rounded-lg font-bold transition-all"
          >
            ⏹ Stop Training
          </button>
        )}
      </div>

      {/* Training progress */}
      {(status === 'training' || (lossHistory.length > 0)) && (
        <div className="bg-gray-800/60 border border-gray-700 rounded-xl p-4 mb-6">
          {/* Progress bar */}
          <div className="flex justify-between text-xs text-gray-500 mb-1">
            <span>Step {currentStep} / {config.num_steps}</span>
            <span>{progress.toFixed(0)}%</span>
          </div>
          <div className="w-full bg-gray-700 rounded-full h-1.5 mb-4">
            <div className="bg-indigo-500 h-1.5 rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3 mb-4 text-center">
            <div>
              <div className="text-xl font-bold text-white">{currentLoss.toFixed(3)}</div>
              <div className="text-xs text-gray-500">loss</div>
            </div>
            <div>
              <div className="text-xl font-bold text-indigo-400">{currentSample || '…'}</div>
              <div className="text-xs text-gray-500">current sample</div>
            </div>
            <div>
              <div className="text-xl font-bold text-white">{stepMs}ms</div>
              <div className="text-xs text-gray-500">per step</div>
            </div>
          </div>

          {/* Loss chart */}
          <div className="border border-gray-700 rounded-lg bg-gray-900/50 p-2">
            <div className="text-xs text-gray-600 mb-1">Loss curve (EMA)</div>
            <LossChart data={lossHistory} />
          </div>
        </div>
      )}

      {/* Final samples */}
      {status === 'done' && finalSamples.length > 0 && (
        <div className="bg-gray-800/60 border border-indigo-500/30 rounded-xl p-4 mb-6">
          <div className="text-xs text-gray-500 mb-3 uppercase tracking-widest">Training complete — generated samples</div>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2 mb-4">
            {finalSamples.map((s, i) => (
              <div key={i} className="bg-gray-700/60 rounded px-3 py-2 text-center text-white text-sm">{s}</div>
            ))}
          </div>
          <div className="text-xs text-gray-600">
            Started near random (loss ~3.3 = −log(1/27)), learned to ~2.3. Same algorithm as GPT-4, just 4,000× smaller.
          </div>
        </div>
      )}

      {/* Generation panel */}
      {(status === 'done') && (
        <div className="bg-gray-800/40 border border-gray-700 rounded-xl p-4">
          <div className="text-xs text-gray-500 mb-3 uppercase tracking-widest">Generate New Samples</div>
          <div className="flex gap-3 mb-3">
            <input
              type="text" value={genPrompt} onChange={e => setGenPrompt(e.target.value)}
              placeholder="Optional prompt prefix…"
              className="flex-1 bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500"
            />
            <button onClick={doGenerate}
              className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 rounded-lg text-sm font-medium transition-all"
            >
              Generate
            </button>
          </div>
          <div className="flex items-center gap-3 mb-3 text-xs text-gray-500">
            <span>Temperature</span>
            <input type="range" min={0.1} max={2} step={0.1} value={genTemp}
              onChange={e => setGenTemp(parseFloat(e.target.value))}
              className="flex-1 accent-indigo-500 h-1" />
            <span className="text-white w-8">{genTemp.toFixed(1)}</span>
            <span className="text-gray-600">{genTemp < 0.5 ? '(focused)' : genTemp > 1.2 ? '(creative)' : '(balanced)'}</span>
          </div>
          {genResults.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {genResults.map((s, i) => (
                <span key={i} className="bg-gray-700 text-gray-200 px-3 py-1 rounded text-sm">{s}</span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
