'use client'
import { useState, useEffect, useRef, useCallback, useMemo } from 'react'

// ─── Constants ────────────────────────────────────────────────────────────────
const PRESETS: Record<string, { label: string; file: string }> = {
  names:      { label: 'baby names',    file: '/datasets/names.txt' },
  dinos:      { label: 'dinosaurs',     file: '/datasets/dinos.txt' },
  ycstartups: { label: 'yc startups',   file: '/datasets/ycstartups.txt' },
  words:      { label: 'english words', file: '/datasets/words.txt' },
}

const WIRES: [string, string][] = [
  ['dataset', 'tokenizer'],
  ['tokenizer', 'config'],
  ['config', 'training'],
  ['training', 'metrics'],
  ['training', 'generate'],
]

// ─── Node position registry ───────────────────────────────────────────────────
function useNodePositions() {
  const pos = useRef<Record<string, { x: number; y: number; w: number; h: number }>>({})
  const [tick, setTick] = useState(0)
  const update = useCallback((id: string, x: number, y: number, w: number, h: number) => {
    pos.current[id] = { x, y, w, h }
    setTick(t => t + 1)
  }, [])
  return { positions: pos.current, update, tick }
}

// ─── Draggable hook ───────────────────────────────────────────────────────────
function useDraggable(ix: number, iy: number, id: string, onPos: (id: string, x: number, y: number, w: number, h: number) => void) {
  const [p, setP] = useState({ x: ix, y: iy })
  const dragging = useRef(false)
  const off = useRef({ x: 0, y: 0 })
  const ref = useRef<HTMLDivElement>(null)

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    const tag = (e.target as HTMLElement).tagName
    if (['INPUT', 'SELECT', 'TEXTAREA', 'BUTTON', 'OPTION'].includes(tag)) return
    dragging.current = true
    off.current = { x: e.clientX - p.x, y: e.clientY - p.y }
    e.preventDefault()
  }, [p])

  useEffect(() => {
    const mv = (e: MouseEvent) => { if (dragging.current) setP({ x: e.clientX - off.current.x, y: e.clientY - off.current.y }) }
    const up = () => { dragging.current = false }
    window.addEventListener('mousemove', mv)
    window.addEventListener('mouseup', up)
    return () => { window.removeEventListener('mousemove', mv); window.removeEventListener('mouseup', up) }
  }, [])

  useEffect(() => {
    if (ref.current) {
      const r = ref.current.getBoundingClientRect()
      const container = ref.current.offsetParent as HTMLElement
      if (container) {
        const cr = container.getBoundingClientRect()
        onPos(id, p.x, p.y, r.width, r.height)
      }
    }
  })

  return { p, onMouseDown, ref }
}

// ─── Node card ─────────────────────────────────────────────────────────────────
function Node({ id, ix, iy, w, title, onPos, children }: {
  id: string; ix: number; iy: number; w: number; title: string
  onPos: (id: string, x: number, y: number, w: number, h: number) => void
  children: React.ReactNode
}) {
  const { p, onMouseDown, ref } = useDraggable(ix, iy, id, onPos)
  return (
    <div ref={ref} onMouseDown={onMouseDown} style={{
      position: 'absolute', left: p.x, top: p.y, width: w,
      background: '#fff', border: '1px solid #e0e0e0', borderRadius: 2,
      cursor: 'grab', userSelect: 'none', zIndex: 10,
    }}>
      <div style={{ padding: '8px 12px 6px', borderBottom: '1px solid #f0f0f0' }}>
        <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '2.5px', color: '#ccc', textTransform: 'uppercase' }}>
          {title}
        </span>
      </div>
      <div style={{ padding: '10px 12px', fontSize: 11 }}>
        {children}
      </div>
    </div>
  )
}

// ─── Bezier wires ──────────────────────────────────────────────────────────────
function Wires({ positions, tick: _ }: { positions: Record<string, { x: number; y: number; w: number; h: number }>; tick: number }) {
  return (
    <svg style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 5 }}>
      {WIRES.map(([from, to], i) => {
        const a = positions[from]; const b = positions[to]
        if (!a || !b) return null
        const ax = a.x + a.w / 2, ay = a.y + a.h / 2
        const bx = b.x + b.w / 2, by = b.y + b.h / 2
        const dx = bx - ax, dy = by - ay
        let x1: number, y1: number, x2: number, y2: number
        if (Math.abs(dx) >= Math.abs(dy)) {
          if (dx > 0) { x1 = a.x + a.w; y1 = ay; x2 = b.x; y2 = by }
          else { x1 = a.x; y1 = ay; x2 = b.x + b.w; y2 = by }
        } else {
          if (dy > 0) { x1 = ax; y1 = a.y + a.h; x2 = bx; y2 = b.y }
          else { x1 = ax; y1 = a.y; x2 = bx; y2 = b.y + b.h }
        }
        const mx = (x1 + x2) / 2
        const my = (y1 + y2) / 2
        const d = Math.abs(dx) >= Math.abs(dy)
          ? `M ${x1} ${y1} C ${mx} ${y1}, ${mx} ${y2}, ${x2} ${y2}`
          : `M ${x1} ${y1} C ${x1} ${my}, ${x2} ${my}, ${x2} ${y2}`
        return <path key={i} d={d} fill="none" stroke="#d0d0d0" strokeWidth="1" strokeDasharray="5,4" />
      })}
    </svg>
  )
}

// ─── Loss chart ────────────────────────────────────────────────────────────────
function LossChart({ data }: { data: { step: number; loss: number }[] }) {
  if (data.length < 2) return null
  let ema = data[0].loss
  const sm = data.map(d => { ema = 0.95 * ema + 0.05 * d.loss; return ema })
  const mx = Math.max(...sm), mn = Math.min(...sm), rng = mx - mn || 1
  const toY = (l: number) => ((mx - l) / rng) * 80 + 10
  const toX = (i: number) => (i / Math.max(sm.length - 1, 1)) * 100
  return (
    <svg viewBox="0 0 100 100" preserveAspectRatio="none" style={{ width: '100%', height: 80, display: 'block' }}>
      {data.map((d, i) => (
        <circle key={i} cx={toX(i)} cy={toY(Math.max(mn, Math.min(mx, d.loss)))} r="0.4" fill="#e8e8e8" vectorEffect="non-scaling-stroke" />
      ))}
      <polyline fill="none" stroke="#555" strokeWidth="1.2"
        points={sm.map((v, i) => `${toX(i)},${toY(v)}`).join(' ')} vectorEffect="non-scaling-stroke" />
      <circle cx={toX(sm.length - 1)} cy={toY(sm[sm.length - 1])} r="1.8" fill="#555" vectorEffect="non-scaling-stroke" />
      <text x="1" y="9" fontSize="5" fill="#ccc" vectorEffect="non-scaling-stroke">{mx.toFixed(2)}</text>
      <text x="1" y="98" fontSize="5" fill="#ccc" vectorEffect="non-scaling-stroke">{mn.toFixed(2)}</text>
    </svg>
  )
}

// ─── Shared styles ─────────────────────────────────────────────────────────────
const mono: React.CSSProperties = { fontFamily: "'JetBrains Mono','Fira Mono',monospace" }
const lbl: React.CSSProperties = { color: '#bbb', marginRight: 8, fontSize: 10, ...mono }
const val: React.CSSProperties = { color: '#555', fontWeight: 600, fontSize: 10, ...mono }
const placeholder: React.CSSProperties = { color: '#ccc', fontStyle: 'italic', fontSize: 11, ...mono }
const sep: React.CSSProperties = { borderBottom: '1px solid #f0f0f0', margin: '8px 0' }
const fmtN = (n: number) => n > 1e6 ? (n / 1e6).toFixed(1) + 'M' : n > 1e3 ? (n / 1e3).toFixed(0) + 'K' : String(n)
const fmtMs = (ms: number) => ms < 1000 ? ms + 'ms' : (ms / 1000).toFixed(1) + 's'

// ─── Main component ────────────────────────────────────────────────────────────
export default function TrainingCanvas() {
  const workerRef = useRef<Worker | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { positions, update: onPos, tick } = useNodePositions()

  const [dataset, setDataset] = useState<{ vocabSize: number; numDocs: number; sampleDocs: string[] } | null>(null)
  const [selectedPreset, setSelectedPreset] = useState('')
  const [loading, setLoading] = useState(false)
  const [config, setConfig] = useState({ n_embd: 16, n_head: 4, n_layer: 1, block_size: 16, num_steps: 1000, learning_rate: 0.01 })
  const [training, setTraining] = useState(false)
  const [modelReady, setModelReady] = useState(false)
  const [lossHistory, setLossHistory] = useState<{ step: number; loss: number }[]>([])
  const [currentStep, setCurrentStep] = useState(0)
  const [currentLoss, setCurrentLoss] = useState(0)
  const [currentSample, setCurrentSample] = useState('')
  const [stepTime, setStepTime] = useState(0)
  const [totalTime, setTotalTime] = useState(0)
  const [finalSamples, setFinalSamples] = useState<string[]>([])
  const [genPrompt, setGenPrompt] = useState('')
  const [genTemp, setGenTemp] = useState(0.8)
  const [genResults, setGenResults] = useState<string[]>([])
  const [generating, setGenerating] = useState(false)
  const [dragOver, setDragOver] = useState(false)

  useEffect(() => {
    const w = new Worker('/microgpt-worker.js')
    workerRef.current = w
    w.onmessage = (e) => {
      const { type, data } = e.data
      if (type === 'dataset_loaded') {
        setDataset(data); setLoading(false)
        setConfig(c => ({ ...c, num_steps: Math.min(3000, Math.max(500, Math.round(data.numDocs * 3 / 50) * 50)) }))
      }
      if (type === 'step') {
        setCurrentStep(data.step); setCurrentLoss(data.loss); setStepTime(data.stepTimeMs); setTotalTime(data.elapsed)
        setLossHistory(prev => [...prev, { step: data.step, loss: data.loss }])
        if (data.sample) setCurrentSample(data.sample)
      }
      if (type === 'complete') { setTraining(false); setModelReady(true); setFinalSamples(data.samples) }
      if (type === 'stopped') setTraining(false)
      if (type === 'generated') { setGenResults(data.samples); setGenerating(false) }
    }
    return () => w.terminate()
  }, [])

  const loadText = useCallback((text: string, key = 'custom') => {
    setSelectedPreset(key)
    setLoading(true); setDataset(null); setModelReady(false)
    setLossHistory([]); setCurrentStep(0); setFinalSamples([]); setGenResults([])
    workerRef.current?.postMessage({ type: 'load_dataset', data: { text } })
  }, [])

  const loadPreset = useCallback(async (key: string) => {
    if (!key || !PRESETS[key]) return
    setSelectedPreset(key); setLoading(true)
    try {
      const text = await fetch(PRESETS[key].file).then(r => r.text())
      loadText(text, key)
    } catch { setLoading(false) }
  }, [loadText])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setDragOver(false)
    const file = e.dataTransfer?.files[0]; if (!file) return
    const reader = new FileReader()
    reader.onload = ev => loadText(ev.target?.result as string)
    reader.readAsText(file)
  }, [loadText])

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return
    const reader = new FileReader()
    reader.onload = ev => loadText(ev.target?.result as string)
    reader.readAsText(file)
  }, [loadText])

  const startTraining = useCallback(() => {
    if (!dataset) return
    setTraining(true); setModelReady(false); setLossHistory([])
    setCurrentStep(0); setCurrentSample(''); setFinalSamples([]); setGenResults([])
    workerRef.current?.postMessage({ type: 'init_model', data: { config } })
    setTimeout(() => workerRef.current?.postMessage({ type: 'train' }), 50)
  }, [dataset, config])

  const stopTraining = useCallback(() => workerRef.current?.postMessage({ type: 'stop' }), [])

  const paramCount = useMemo(() => {
    const { n_embd, n_layer, block_size } = config
    const v = dataset?.vocabSize || 28
    return v * n_embd + block_size * n_embd + v * n_embd + n_layer * (8 * n_embd * n_embd)
  }, [config, dataset])

  const flopsPerStep = paramCount * config.block_size * 2
  const progress = config.num_steps > 0 ? (currentStep / config.num_steps) * 100 : 0

  return (
    <div style={{
      position: 'relative', width: '100%', height: 580, overflow: 'hidden',
      background: '#fafafa',
      backgroundImage: 'radial-gradient(circle, #e0e0e0 0.8px, transparent 0.8px)',
      backgroundSize: '20px 20px',
      borderRadius: 6, border: '1px solid #ebebeb',
      ...mono,
    }}>
      {/* Corner labels — matching original exactly */}
      <div style={{ position: 'absolute', top: 14, left: 18, fontSize: 9, fontWeight: 700, letterSpacing: '3px', color: '#ccc', zIndex: 20, ...mono }}>
        TRAIN MY OWN GPT
      </div>
      <div style={{ position: 'absolute', top: 14, right: 18, fontSize: 9, letterSpacing: '1px', color: '#ccc', zIndex: 20, ...mono }}>
        based on karpathy&apos;s microgpt · runs in your browser
      </div>

      <Wires positions={positions} tick={tick} />

      {/* ─── DATASET node (top-left) ─── */}
      <Node id="dataset" ix={42} iy={52} w={260} title="Dataset" onPos={onPos}>
        {/* Preset dropdown */}
        <select
          value={selectedPreset}
          onChange={e => loadPreset(e.target.value)}
          disabled={loading}
          style={{
            width: '100%', marginBottom: 8, padding: '5px 8px',
            border: '1px solid #e0e0e0', borderRadius: 2, background: '#fff',
            color: selectedPreset ? '#555' : '#bbb',
            fontSize: 11, cursor: 'pointer',
            fontFamily: "'JetBrains Mono','Fira Mono',monospace",
            appearance: 'auto',
          }}
        >
          <option value="">choose dataset...</option>
          {Object.entries(PRESETS).map(([k, v]) => (
            <option key={k} value={k}>{v.label}</option>
          ))}
        </select>

        {/* File drop zone */}
        <div
          onDrop={handleDrop}
          onDragOver={e => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          onClick={() => fileInputRef.current?.click()}
          style={{
            border: `1.5px dashed ${dragOver ? '#aaa' : '#ddd'}`,
            borderRadius: 2, padding: '12px 8px',
            textAlign: 'center', cursor: 'pointer',
            background: dragOver ? '#f8f8f8' : 'transparent',
            transition: 'all 0.15s',
          }}
        >
          <div style={{ ...placeholder, fontSize: 10 }}>drop or click to upload .txt</div>
          <div style={{ color: '#ddd', fontSize: 9, marginTop: 3, ...mono }}>one entry per line</div>
        </div>
        <input ref={fileInputRef} type="file" accept=".txt" onChange={handleFileInput} style={{ display: 'none' }} />

        {loading && <div style={{ ...placeholder, marginTop: 8, fontSize: 10 }}>loading...</div>}

        {dataset && (
          <>
            <div style={sep} />
            <div style={{ color: '#888', fontSize: 10, ...mono }}>
              <span>{dataset.numDocs.toLocaleString()} entries</span>
              <span style={{ margin: '0 8px', color: '#ddd' }}>·</span>
              <span>{dataset.vocabSize} tokens</span>
            </div>
          </>
        )}
      </Node>

      {/* ─── ARCHITECTURE node (top-center) ─── */}
      <Node id="config" ix={332} iy={52} w={268} title="Architecture" onPos={onPos}>
        {([
          { k: 'n_embd',        label: 'embedding dim',   min: 8,   max: 64,   step: 4,   fmt: (v: number) => String(v) },
          { k: 'n_head',        label: 'attention heads', min: 1,   max: 8,    step: 1,   fmt: (v: number) => String(v) },
          { k: 'n_layer',       label: 'layers',          min: 1,   max: 4,    step: 1,   fmt: (v: number) => String(v) },
          { k: 'block_size',    label: 'context window',  min: 8,   max: 32,   step: 4,   fmt: (v: number) => String(v) },
          { k: 'num_steps',     label: 'training steps',  min: 100, max: 3000, step: 100, fmt: (v: number) => String(v) },
          { k: 'learning_rate', label: 'learning rate',   min: 0.001, max: 0.1, step: 0.001, fmt: (v: number) => v.toFixed(3) },
        ] as const).map(({ k, label, min, max, step, fmt }) => (
          <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
            <div style={{ width: 110, fontSize: 10, color: '#999', flexShrink: 0, ...mono }}>{label}</div>
            <input type="range" min={min} max={max} step={step}
              value={config[k as keyof typeof config]}
              onChange={e => setConfig(c => ({
                ...c,
                [k]: k === 'learning_rate' ? parseFloat(e.target.value) : parseInt(e.target.value)
              }))}
              disabled={training}
              style={{ flex: 1, height: '2px', accentColor: '#999', cursor: 'pointer' }}
            />
            <div style={{ width: 38, textAlign: 'right', fontSize: 11, color: '#333', fontWeight: 600, ...mono }}>
              {fmt(config[k as keyof typeof config] as number)}
            </div>
          </div>
        ))}
        <div style={{ ...sep, marginTop: 6 }} />
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#bbb', ...mono }}>
          <span>params: <span style={{ color: '#777', fontWeight: 600 }}>{paramCount.toLocaleString()}</span></span>
          <span>{fmtN(flopsPerStep)} FLOPs/step</span>
        </div>
      </Node>

      {/* ─── METRICS node (top-right) ─── */}
      <Node id="metrics" ix={632} iy={52} w={240} title="Metrics" onPos={onPos}>
        {lossHistory.length > 1 ? (
          <>
            <LossChart data={lossHistory} />
            <div style={{ ...sep, marginTop: 4 }} />
            <div><span style={lbl}>step</span><span style={val}>{currentStep} / {config.num_steps}</span></div>
            <div><span style={lbl}>loss</span><span style={val}>{currentLoss.toFixed(4)}</span></div>
            <div><span style={lbl}>step time</span><span style={val}>{stepTime}ms</span></div>
            <div><span style={lbl}>elapsed</span><span style={val}>{fmtMs(totalTime)}</span></div>
            {currentSample && (
              <>
                <div style={sep} />
                <div style={{ color: '#bbb', fontSize: 9, ...mono, marginBottom: 3 }}>live sample</div>
                <div style={{ color: '#777', fontWeight: 600, ...mono, fontSize: 11 }}>{currentSample}</div>
              </>
            )}
          </>
        ) : (
          <div style={{ padding: '12px 0' }}>
            <span style={placeholder}>
              {training ? 'training started...' : 'waiting for training...'}
            </span>
          </div>
        )}
      </Node>

      {/* ─── TOKENIZER node (bottom-left) ─── */}
      <Node id="tokenizer" ix={42} iy={340} w={260} title="Tokenizer" onPos={onPos}>
        {dataset ? (
          <>
            <div><span style={lbl}>vocab</span><span style={val}>{dataset.vocabSize} chars + BOS</span></div>
            <div><span style={lbl}>docs</span><span style={val}>{dataset.numDocs.toLocaleString()}</span></div>
            <div style={sep} />
            <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: 3 }}>
              {dataset.sampleDocs.slice(0, 8).map((d, i) => (
                <span key={i} style={{ background: '#f5f5f5', border: '1px solid #ebebeb', borderRadius: 2, padding: '1px 5px', color: '#999', fontSize: 10, ...mono }}>{d}</span>
              ))}
            </div>
          </>
        ) : (
          <div style={{ padding: '12px 0' }}>
            <span style={placeholder}>waiting for dataset...</span>
          </div>
        )}
      </Node>

      {/* ─── TRAINING node (bottom-center) ─── */}
      <Node id="training" ix={332} iy={380} w={268} title="Training" onPos={onPos}>
        {!training ? (
          <button onClick={startTraining} disabled={!dataset}
            style={{
              width: '100%', padding: '9px 0',
              background: dataset ? '#f0f0f0' : '#f8f8f8',
              color: dataset ? '#555' : '#ccc',
              border: '1px solid #e0e0e0', borderRadius: 2,
              cursor: dataset ? 'pointer' : 'not-allowed',
              fontSize: 11, fontWeight: 700, letterSpacing: '1px',
              fontFamily: "'JetBrains Mono','Fira Mono',monospace",
              transition: 'all 0.15s',
            }}
            onMouseEnter={e => { if (dataset) (e.target as HTMLButtonElement).style.background = '#e8e8e8' }}
            onMouseLeave={e => { if (dataset) (e.target as HTMLButtonElement).style.background = '#f0f0f0' }}
          >
            {modelReady ? '▶ retrain' : '▶ train'}
          </button>
        ) : (
          <button onClick={stopTraining}
            style={{
              width: '100%', padding: '9px 0',
              background: '#fff0f0', color: '#cc4444',
              border: '1px solid #fdd', borderRadius: 2,
              cursor: 'pointer', fontSize: 11, fontWeight: 700,
              fontFamily: "'JetBrains Mono','Fira Mono',monospace",
            }}>
            ⏹ stop
          </button>
        )}

        {(training || modelReady) && (
          <>
            <div style={{ background: '#f0f0f0', borderRadius: 1, height: 2, margin: '10px 0 6px', overflow: 'hidden' }}>
              <div style={{ height: '100%', background: modelReady ? '#aaa' : '#888', width: `${progress}%`, transition: 'width 0.3s' }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#aaa', ...mono }}>
              <span>{currentStep.toLocaleString()} / {config.num_steps.toLocaleString()}</span>
              <span>{progress.toFixed(0)}%</span>
            </div>
          </>
        )}
      </Node>

      {/* ─── GENERATE node (bottom-right) ─── */}
      <Node id="generate" ix={632} iy={350} w={240} title="Generate" onPos={onPos}>
        {modelReady ? (
          <>
            <div style={{ marginBottom: 8 }}>
              <input
                type="text" value={genPrompt} onChange={e => setGenPrompt(e.target.value)}
                placeholder="prompt prefix (optional)"
                style={{
                  width: '100%', padding: '5px 6px', fontSize: 11,
                  border: '1px solid #e8e8e8', borderRadius: 2, outline: 'none',
                  background: '#fff', color: '#555',
                  fontFamily: "'JetBrains Mono','Fira Mono',monospace",
                  boxSizing: 'border-box' as const,
                }}
              />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <span style={{ color: '#bbb', fontSize: 10, ...mono, flexShrink: 0 }}>temp</span>
              <input type="range" min="0.1" max="2" step="0.1" value={genTemp}
                onChange={e => setGenTemp(parseFloat(e.target.value))}
                style={{ flex: 1, height: '2px', accentColor: '#999', cursor: 'pointer' }} />
              <span style={{ color: '#555', fontWeight: 600, fontSize: 11, ...mono, width: 28, textAlign: 'right' }}>{genTemp.toFixed(1)}</span>
            </div>
            <button onClick={() => { setGenerating(true); workerRef.current?.postMessage({ type: 'generate', data: { prompt: genPrompt, temperature: genTemp, count: 8 } }) }}
              disabled={generating}
              style={{
                width: '100%', padding: '7px 0', background: '#f0f0f0',
                color: generating ? '#ccc' : '#555', border: '1px solid #e0e0e0',
                borderRadius: 2, cursor: generating ? 'not-allowed' : 'pointer',
                fontSize: 11, fontWeight: 700, letterSpacing: '1px',
                fontFamily: "'JetBrains Mono','Fira Mono',monospace",
              }}>
              {generating ? '...' : '▶ generate'}
            </button>
            {(genResults.length > 0 || finalSamples.length > 0) && (
              <>
                <div style={sep} />
                <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: 4 }}>
                  {(genResults.length ? genResults : finalSamples).slice(0, 8).map((s, i) => (
                    <span key={i} style={{ background: '#f5f5f5', border: '1px solid #ebebeb', borderRadius: 2, padding: '2px 6px', color: '#777', fontSize: 10, ...mono }}>{s}</span>
                  ))}
                </div>
              </>
            )}
          </>
        ) : (
          <div style={{ padding: '12px 0' }}>
            <span style={placeholder}>waiting for model...</span>
          </div>
        )}
      </Node>
    </div>
  )
}
