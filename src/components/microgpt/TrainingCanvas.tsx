'use client'
import { useState, useEffect, useRef, useCallback, useMemo } from 'react'

// ── Types ────────────────────────────────────────────────────────────────────
interface Pos { x: number; y: number; w: number; h: number }
interface LossPoint { step: number; loss: number }

const PRESETS = [
  { key: 'names',      label: 'Baby Names',    desc: '2k+ names',    file: '/datasets/names.txt' },
  { key: 'dinos',      label: 'Dinosaurs',     desc: '1.5k species', file: '/datasets/dinos.txt' },
  { key: 'ycstartups', label: 'YC Startups',   desc: '5k startups',  file: '/datasets/ycstartups.txt' },
  { key: 'words',      label: 'English Words', desc: '10k words',    file: '/datasets/words.txt' },
]

const WIRES: [string, string][] = [
  ['dataset', 'config'],
  ['config', 'training'],
  ['training', 'metrics'],
  ['training', 'generate'],
]

// ── Position registry (for wire drawing) ────────────────────────────────────
function useNodePositions() {
  const pos = useRef<Record<string, Pos>>({})
  const [tick, setTick] = useState(0)
  const update = useCallback((id: string, x: number, y: number, w: number, h: number) => {
    pos.current[id] = { x, y, w, h }
    setTick(t => t + 1)
  }, [])
  return { positions: pos.current, update, tick }
}

// ── Draggable hook ───────────────────────────────────────────────────────────
function useDraggable(ix: number, iy: number, id: string, onPos: (id: string, x: number, y: number, w: number, h: number) => void) {
  const [p, setP] = useState({ x: ix, y: iy })
  const dragging = useRef(false)
  const off = useRef({ x: 0, y: 0 })
  const nodeRef = useRef<HTMLDivElement>(null)

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    const tag = (e.target as HTMLElement).tagName
    if (['INPUT', 'TEXTAREA', 'SELECT', 'BUTTON'].includes(tag)) return
    dragging.current = true
    off.current = { x: e.clientX - p.x, y: e.clientY - p.y }
    e.preventDefault()
  }, [p])

  useEffect(() => {
    const mv = (e: MouseEvent) => {
      if (dragging.current) setP({ x: e.clientX - off.current.x, y: e.clientY - off.current.y })
    }
    const up = () => { dragging.current = false }
    window.addEventListener('mousemove', mv)
    window.addEventListener('mouseup', up)
    return () => { window.removeEventListener('mousemove', mv); window.removeEventListener('mouseup', up) }
  }, [])

  useEffect(() => {
    if (nodeRef.current) {
      const r = nodeRef.current.getBoundingClientRect()
      onPos(id, p.x, p.y, r.width, r.height)
    }
  })

  return { p, onMouseDown, nodeRef }
}

// ── Node card ────────────────────────────────────────────────────────────────
function Node({ id, x, y, w, title, active = false, accent = '#333', onPosChange, children }: {
  id: string; x: number; y: number; w: number; title: string
  active?: boolean; accent?: string
  onPosChange: (id: string, x: number, y: number, w: number, h: number) => void
  children: React.ReactNode
}) {
  const { p, onMouseDown, nodeRef } = useDraggable(x, y, id, onPosChange)
  return (
    <div
      ref={nodeRef}
      onMouseDown={onMouseDown}
      style={{
        position: 'absolute', left: p.x, top: p.y, width: w,
        background: '#fff', borderRadius: 3,
        border: `1px solid ${active ? accent : '#e0e0e0'}`,
        boxShadow: active ? `0 2px 12px ${accent}20` : '0 1px 3px rgba(0,0,0,0.04)',
        cursor: 'grab', userSelect: 'none', zIndex: 10,
        transition: 'border-color 0.3s, box-shadow 0.3s',
        fontFamily: "'JetBrains Mono', 'Fira Mono', monospace",
      }}
    >
      <div style={{
        padding: '8px 12px',
        borderBottom: `1px solid ${active ? accent + '20' : '#f0f0f0'}`,
        display: 'flex', alignItems: 'center', gap: 8,
      }}>
        <span style={{
          fontSize: 10, fontWeight: 700, letterSpacing: '1.5px',
          color: active ? '#555' : '#bbb', textTransform: 'uppercase',
          fontFamily: "'JetBrains Mono', monospace",
        }}>{title}</span>
      </div>
      <div style={{ padding: '12px', fontFamily: "'JetBrains Mono', monospace", fontSize: 11 }}>
        {children}
      </div>
    </div>
  )
}

// ── Bezier wires ─────────────────────────────────────────────────────────────
function Wires({ positions, wires, tick: _ }: { positions: Record<string, Pos>; wires: [string, string][]; tick: number }) {
  return (
    <svg style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 5 }}>
      {wires.map(([from, to], i) => {
        const a = positions[from], b = positions[to]
        if (!a || !b) return null
        const aCx = a.x + a.w / 2, aCy = a.y + a.h / 2
        const bCx = b.x + b.w / 2, bCy = b.y + b.h / 2
        const dx = bCx - aCx, dy = bCy - aCy
        let x1, y1, x2, y2
        if (Math.abs(dx) > Math.abs(dy)) {
          if (dx > 0) { x1 = a.x + a.w; y1 = aCy; x2 = b.x; y2 = bCy }
          else { x1 = a.x; y1 = aCy; x2 = b.x + b.w; y2 = bCy }
        } else {
          if (dy > 0) { x1 = aCx; y1 = a.y + a.h; x2 = bCx; y2 = b.y }
          else { x1 = aCx; y1 = a.y; x2 = bCx; y2 = b.y + b.h }
        }
        const mx = (x1 + x2) / 2, my = (y1 + y2) / 2
        const d = Math.abs(dx) > Math.abs(dy)
          ? `M ${x1} ${y1} C ${mx} ${y1}, ${mx} ${y2}, ${x2} ${y2}`
          : `M ${x1} ${y1} C ${x1} ${my}, ${x2} ${my}, ${x2} ${y2}`
        return (
          <g key={i}>
            <path d={d} fill="none" stroke="#d4d4d4" strokeWidth="1.5" strokeDasharray="6,4" />
            <circle cx={x2} cy={y2} r="3" fill="#d4d4d4" />
            <circle cx={x1} cy={y1} r="2.5" fill="none" stroke="#d4d4d4" strokeWidth="1" />
          </g>
        )
      })}
    </svg>
  )
}

// ── Loss chart ───────────────────────────────────────────────────────────────
function LossChart({ data, height = 70 }: { data: LossPoint[]; height?: number }) {
  if (!data.length) return null
  let ema = data[0].loss
  const sm = data.map(d => { ema = 0.95 * ema + 0.05 * d.loss; return ema })
  const mx = Math.max(...sm), mn = Math.min(...sm), rng = mx - mn || 1
  const toY = (l: number) => ((mx - l) / rng) * 90 + 5
  const toX = (i: number) => (i / Math.max(sm.length - 1, 1)) * 100
  return (
    <svg viewBox="0 0 100 100" preserveAspectRatio="none" style={{ width: '100%', height, display: 'block' }}>
      {data.length < 400 && data.map((d, i) => (
        <circle key={i} cx={toX(i)} cy={toY(Math.max(mn, Math.min(mx, d.loss)))} r="0.3" fill="#e8e8e8" vectorEffect="non-scaling-stroke" />
      ))}
      <polyline fill="none" stroke="#333" strokeWidth="1.2"
        points={sm.map((v, i) => `${toX(i)},${toY(v)}`).join(' ')} vectorEffect="non-scaling-stroke" />
      {sm.length > 1 && (
        <circle cx={toX(sm.length - 1)} cy={toY(sm[sm.length - 1])} r="2" fill="#333" vectorEffect="non-scaling-stroke" />
      )}
      <text x="1" y="8" fontSize="5" fill="#ccc" vectorEffect="non-scaling-stroke">{mx.toFixed(2)}</text>
      <text x="1" y="98" fontSize="5" fill="#ccc" vectorEffect="non-scaling-stroke">{mn.toFixed(2)}</text>
    </svg>
  )
}

// ── Step time bar chart ───────────────────────────────────────────────────────
function StepTimeChart({ data, height = 32 }: { data: number[]; height?: number }) {
  if (!data.length) return null
  const mx = Math.max(...data, 1)
  return (
    <svg viewBox={`0 0 ${data.length} 100`} preserveAspectRatio="none" style={{ width: '100%', height, display: 'block' }}>
      {data.map((v, i) => (
        <rect key={i} x={i} y={100 - (v / mx) * 90} width="0.8" height={(v / mx) * 90} fill="#dbeafe" />
      ))}
    </svg>
  )
}

// ── Helpers ───────────────────────────────────────────────────────────────────
const fmt = (ms: number) => ms < 1000 ? ms + 'ms' : (ms / 1000).toFixed(1) + 's'
const fmtN = (n: number) => n > 1e9 ? (n / 1e9).toFixed(1) + 'G' : n > 1e6 ? (n / 1e6).toFixed(1) + 'M' : n > 1e3 ? (n / 1e3).toFixed(0) + 'K' : String(n)

const lbl: React.CSSProperties = { color: '#aaa', marginRight: 6 }
const val: React.CSSProperties = { color: '#333', fontWeight: 600 }
const sep: React.CSSProperties = { borderBottom: '1px solid #f0f0f0', margin: '8px 0' }
const inputStyle: React.CSSProperties = {
  background: 'transparent', border: 'none', outline: 'none',
  fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: '#333',
  width: '100%', padding: '2px 0',
}

// ── Main component ────────────────────────────────────────────────────────────
export default function TrainingCanvas() {
  const workerRef = useRef<Worker | null>(null)
  const { positions, update: updatePos, tick: posTick } = useNodePositions()

  const [dataset, setDataset] = useState<{ vocabSize: number; numDocs: number; sampleDocs: string[] } | null>(null)
  const [selectedPreset, setSelectedPreset] = useState('')
  const [loading, setLoading] = useState(false)
  const [config, setConfig] = useState({ n_embd: 16, n_head: 4, n_layer: 1, block_size: 16, num_steps: 1000, learning_rate: 0.01, seed: 42 })
  const [training, setTraining] = useState(false)
  const [modelReady, setModelReady] = useState(false)
  const [lossHistory, setLossHistory] = useState<LossPoint[]>([])
  const [stepTimes, setStepTimes] = useState<number[]>([])
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

  useEffect(() => {
    const w = new Worker('/microgpt-worker.js')
    workerRef.current = w
    w.onmessage = (e) => {
      const { type, data } = e.data
      if (type === 'dataset_loaded') {
        setDataset(data); setLoading(false)
        const suggested = Math.min(3000, Math.max(500, Math.round(data.numDocs * 3 / 50) * 50))
        setConfig(c => ({ ...c, num_steps: suggested }))
      }
      if (type === 'step') {
        setCurrentStep(data.step); setCurrentLoss(data.loss); setStepTime(data.stepTimeMs); setTotalTime(data.elapsed)
        setLossHistory(prev => [...prev, { step: data.step, loss: data.loss }])
        setStepTimes(prev => [...prev, data.stepTimeMs])
        if (data.sample) setCurrentSample(data.sample)
      }
      if (type === 'complete') {
        setTraining(false); setModelReady(true); setFinalSamples(data.samples); setTotalTime(data.totalTimeMs)
      }
      if (type === 'stopped') setTraining(false)
      if (type === 'generated') { setGenResults(data.samples); setGenerating(false) }
    }
    return () => w.terminate()
  }, [])

  const loadPreset = useCallback(async (key: string) => {
    setSelectedPreset(key); setLoading(true)
    setModelReady(false); setLossHistory([]); setStepTimes([]); setCurrentStep(0); setFinalSamples([]); setGenResults([])
    const preset = PRESETS.find(p => p.key === key)
    if (!preset) return
    try {
      const text = await fetch(preset.file).then(r => r.text())
      workerRef.current?.postMessage({ type: 'load_dataset', data: { text } })
    } catch { setLoading(false) }
  }, [])

  const startTraining = useCallback(() => {
    if (!dataset) return
    setTraining(true); setModelReady(false); setLossHistory([]); setStepTimes([])
    setCurrentStep(0); setCurrentSample(''); setFinalSamples([]); setGenResults([])
    workerRef.current?.postMessage({ type: 'init_model', data: { config } })
    setTimeout(() => workerRef.current?.postMessage({ type: 'train' }), 50)
  }, [dataset, config])

  const stopTraining = useCallback(() => workerRef.current?.postMessage({ type: 'stop' }), [])

  const doGenerate = useCallback(() => {
    setGenerating(true)
    workerRef.current?.postMessage({ type: 'generate', data: { prompt: genPrompt, temperature: genTemp, count: 8 } })
  }, [genPrompt, genTemp])

  const paramCount = useMemo(() => {
    const { n_embd, n_layer, block_size } = config
    const v = dataset?.vocabSize || 28
    return v * n_embd + block_size * n_embd + v * n_embd + n_layer * (4 * n_embd * n_embd * 4)
  }, [config, dataset])

  const progress = config.num_steps > 0 ? (currentStep / config.num_steps) * 100 : 0

  // Compute canvas height dynamically
  const canvasH = 680

  return (
    <div style={{
      position: 'relative', width: '100%', height: canvasH, overflow: 'hidden',
      background: '#fafafa',
      backgroundImage: 'radial-gradient(circle, #d8d8d8 0.8px, transparent 0.8px)',
      backgroundSize: '20px 20px',
      borderRadius: 8, border: '1px solid #e8e8e8',
      fontFamily: "'JetBrains Mono', 'Fira Mono', monospace",
    }}>
      {/* Corner label */}
      <div style={{ position: 'absolute', top: 12, left: 16, fontSize: 9, fontWeight: 700, letterSpacing: '2.5px', color: '#ccc', zIndex: 20 }}>
        MICROGPT TRAINER
      </div>
      <div style={{ position: 'absolute', top: 12, right: 16, fontSize: 9, letterSpacing: '1px', color: '#ccc', zIndex: 20 }}>
        runs in your browser · based on karpathy/microgpt
      </div>

      <Wires positions={positions} wires={WIRES} tick={posTick} />

      {/* ── Dataset node ─── */}
      <Node id="dataset" x={30} y={50} w={240} title="Dataset"
        active={!!dataset || loading} accent="#6366f1" onPosChange={updatePos}>
        <div style={{ marginBottom: 8 }}>
          <div style={{ color: '#aaa', fontSize: 10, marginBottom: 6, letterSpacing: '0.5px' }}>CHOOSE DATASET</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4 }}>
            {PRESETS.map(p => (
              <button key={p.key}
                onClick={() => loadPreset(p.key)}
                style={{
                  background: selectedPreset === p.key ? '#f0f0ff' : '#fafafa',
                  border: `1px solid ${selectedPreset === p.key ? '#6366f1' : '#e8e8e8'}`,
                  borderRadius: 3, padding: '5px 6px', cursor: 'pointer', textAlign: 'left',
                  fontFamily: "'JetBrains Mono', monospace", fontSize: 10,
                  color: selectedPreset === p.key ? '#6366f1' : '#555',
                  transition: 'all 0.15s',
                }}>
                <div style={{ fontWeight: 700 }}>{p.label}</div>
                <div style={{ color: '#aaa', fontSize: 9 }}>{p.desc}</div>
              </button>
            ))}
          </div>
        </div>
        {dataset && (
          <>
            <div style={sep} />
            <div><span style={lbl}>docs</span><span style={val}>{dataset.numDocs.toLocaleString()}</span></div>
            <div><span style={lbl}>vocab</span><span style={val}>{dataset.vocabSize} tokens</span></div>
            <div style={{ marginTop: 6, display: 'flex', flexWrap: 'wrap', gap: 3 }}>
              {dataset.sampleDocs.slice(0, 6).map((d, i) => (
                <span key={i} style={{ background: '#f5f5f5', border: '1px solid #ebebeb', borderRadius: 2, padding: '1px 5px', color: '#888', fontSize: 10 }}>{d}</span>
              ))}
            </div>
          </>
        )}
        {loading && <div style={{ color: '#aaa', marginTop: 6, fontSize: 10 }}>loading...</div>}
      </Node>

      {/* ── Config node ─── */}
      <Node id="config" x={310} y={50} w={220} title="Model Config"
        active={!!dataset} accent="#8b5cf6" onPosChange={updatePos}>
        {([
          { k: 'n_embd',     label: 'embed dim',  min: 8,   max: 64,   step: 4 },
          { k: 'n_head',     label: 'heads',      min: 1,   max: 8,    step: 1 },
          { k: 'n_layer',    label: 'layers',     min: 1,   max: 4,    step: 1 },
          { k: 'block_size', label: 'context',    min: 8,   max: 32,   step: 4 },
          { k: 'num_steps',  label: 'steps',      min: 100, max: 3000, step: 100 },
        ] as const).map(({ k, label, min, max, step }) => (
          <div key={k} style={{ marginBottom: 7 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
              <span style={{ color: '#aaa', fontSize: 10 }}>{label}</span>
              <span style={{ color: '#333', fontWeight: 700, fontSize: 10 }}>{config[k as keyof typeof config]}</span>
            </div>
            <input type="range" min={min} max={max} step={step}
              value={config[k as keyof typeof config]}
              onChange={e => setConfig(c => ({ ...c, [k]: parseInt(e.target.value) }))}
              disabled={training}
              style={{ width: '100%', accentColor: '#8b5cf6', height: '2px', cursor: 'pointer' }}
            />
          </div>
        ))}
        <div style={sep} />
        <div style={{ color: '#aaa', fontSize: 10 }}>
          params: <span style={{ color: '#333', fontWeight: 700 }}>{fmtN(paramCount)}</span>
        </div>
      </Node>

      {/* ── Training node ─── */}
      <Node id="training" x={30} y={380} w={240} title="Training"
        active={training || modelReady} accent={training ? '#ef4444' : '#22c55e'} onPosChange={updatePos}>
        <div style={{ marginBottom: 8 }}>
          {!training ? (
            <button onClick={startTraining} disabled={!dataset}
              style={{
                width: '100%', padding: '7px 0', background: dataset ? '#333' : '#f0f0f0',
                color: dataset ? '#fff' : '#ccc', border: 'none', borderRadius: 3,
                cursor: dataset ? 'pointer' : 'not-allowed', fontSize: 11, fontWeight: 700,
                fontFamily: "'JetBrains Mono', monospace", letterSpacing: '0.5px',
              }}>
              {modelReady ? '▶ retrain' : '▶ train'}
            </button>
          ) : (
            <button onClick={stopTraining}
              style={{
                width: '100%', padding: '7px 0', background: '#fee2e2',
                color: '#ef4444', border: '1px solid #fecaca', borderRadius: 3,
                cursor: 'pointer', fontSize: 11, fontWeight: 700,
                fontFamily: "'JetBrains Mono', monospace",
              }}>
              ⏹ stop
            </button>
          )}
        </div>

        {(training || modelReady) && (
          <>
            {/* Progress bar */}
            <div style={{ background: '#f0f0f0', borderRadius: 2, height: 3, marginBottom: 8, overflow: 'hidden' }}>
              <div style={{ height: '100%', background: training ? '#333' : '#22c55e', width: `${progress}%`, transition: 'width 0.3s' }} />
            </div>
            <div><span style={lbl}>step</span><span style={val}>{currentStep} / {config.num_steps}</span></div>
            <div><span style={lbl}>loss</span><span style={val}>{currentLoss.toFixed(4)}</span></div>
            <div><span style={lbl}>step</span><span style={val}>{stepTime}ms</span></div>
            <div><span style={lbl}>total</span><span style={val}>{fmt(totalTime)}</span></div>
            {currentSample && (
              <>
                <div style={sep} />
                <div style={{ color: '#aaa', fontSize: 10, marginBottom: 2 }}>live sample</div>
                <div style={{ color: '#6366f1', fontWeight: 700 }}>{currentSample}</div>
              </>
            )}
          </>
        )}
      </Node>

      {/* ── Metrics node ─── */}
      <Node id="metrics" x={310} y={340} w={220} title="Loss Curve"
        active={lossHistory.length > 0} accent="#f97316" onPosChange={updatePos}>
        {lossHistory.length > 1 ? (
          <>
            <LossChart data={lossHistory} height={80} />
            <div style={sep} />
            <div><span style={lbl}>start</span><span style={val}>{lossHistory[0]?.loss.toFixed(3)}</span></div>
            <div><span style={lbl}>current</span><span style={val}>{currentLoss.toFixed(3)}</span></div>
            {lossHistory.length > 10 && <div><span style={lbl}>Δ</span><span style={{ ...val, color: currentLoss < lossHistory[0].loss ? '#22c55e' : '#ef4444' }}>
              {(lossHistory[0].loss - currentLoss).toFixed(3)}
            </span></div>}
            <div style={{ marginTop: 6 }}>
              <div style={{ color: '#aaa', fontSize: 9, marginBottom: 2 }}>step times</div>
              <StepTimeChart data={stepTimes.slice(-60)} height={30} />
            </div>
          </>
        ) : (
          <div style={{ color: '#ccc', fontSize: 10, textAlign: 'center', padding: '16px 0' }}>
            loss will appear here
          </div>
        )}
      </Node>

      {/* ── Generate node ─── */}
      <Node id="generate" x={570} y={50} w={210} title="Generate"
        active={modelReady} accent="#06b6d4" onPosChange={updatePos}>
        {modelReady ? (
          <>
            <div>
              <div style={{ color: '#aaa', fontSize: 10, marginBottom: 4 }}>prompt (optional)</div>
              <input
                type="text" value={genPrompt}
                onChange={e => setGenPrompt(e.target.value)}
                placeholder="leave empty..."
                style={{ ...inputStyle, border: '1px solid #e8e8e8', borderRadius: 3, padding: '4px 6px', marginBottom: 6 }}
              />
            </div>
            <div style={{ marginBottom: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                <span style={{ color: '#aaa', fontSize: 10 }}>temperature</span>
                <span style={{ color: '#333', fontWeight: 700, fontSize: 10 }}>{genTemp.toFixed(1)}</span>
              </div>
              <input type="range" min="0.1" max="2" step="0.1" value={genTemp}
                onChange={e => setGenTemp(parseFloat(e.target.value))}
                style={{ width: '100%', accentColor: '#06b6d4', height: '2px', cursor: 'pointer' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, color: '#ccc', marginTop: 2 }}>
                <span>focused</span><span>creative</span>
              </div>
            </div>
            <button onClick={doGenerate} disabled={generating}
              style={{
                width: '100%', padding: '6px 0', background: generating ? '#f0f0f0' : '#06b6d4',
                color: generating ? '#ccc' : '#fff', border: 'none', borderRadius: 3,
                cursor: generating ? 'not-allowed' : 'pointer', fontSize: 11, fontWeight: 700,
                fontFamily: "'JetBrains Mono', monospace",
              }}>
              {generating ? 'generating...' : 'generate ×8'}
            </button>
            {genResults.length > 0 && (
              <>
                <div style={sep} />
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                  {genResults.map((s, i) => (
                    <span key={i} style={{ background: '#ecfeff', border: '1px solid #cffafe', borderRadius: 2, padding: '2px 6px', color: '#0e7490', fontSize: 10 }}>{s}</span>
                  ))}
                </div>
              </>
            )}
            {finalSamples.length > 0 && !genResults.length && (
              <>
                <div style={sep} />
                <div style={{ color: '#aaa', fontSize: 10, marginBottom: 4 }}>training complete</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                  {finalSamples.slice(0, 6).map((s, i) => (
                    <span key={i} style={{ background: '#f0fdf4', border: '1px solid #dcfce7', borderRadius: 2, padding: '2px 6px', color: '#15803d', fontSize: 10 }}>{s}</span>
                  ))}
                </div>
              </>
            )}
          </>
        ) : (
          <div style={{ color: '#ccc', fontSize: 10, textAlign: 'center', padding: '24px 0' }}>
            train a model first
          </div>
        )}
      </Node>
    </div>
  )
}
