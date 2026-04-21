import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Maximize2, Loader2, TrendingDown, Target, AlertTriangle, X, ExternalLink } from 'lucide-react'
import GraphModal from './GraphModal'

// ── Live Chart Component ────────────────────────────────────
function LiveLineChart({ data, color, gradientId, label, formatValue, yDomain }) {
  if (!data || data.length === 0) return null

  const width = 280
  const height = 80
  const padding = { top: 8, right: 12, bottom: 4, left: 12 }
  const chartW = width - padding.left - padding.right
  const chartH = height - padding.top - padding.bottom

  const yMin = yDomain ? yDomain[0] : Math.min(...data) * 0.9
  const yMax = yDomain ? yDomain[1] : Math.max(...data) * 1.1
  const yRange = yMax - yMin || 1

  const points = data.map((v, i) => {
    const x = padding.left + (data.length > 1 ? (i / (data.length - 1)) * chartW : chartW / 2)
    const y = padding.top + chartH - ((v - yMin) / yRange) * chartH
    return [x, y]
  })

  const pathD = points.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x},${y}`).join(' ')
  const areaD = `${pathD} L${points[points.length - 1][0]},${height - padding.bottom} L${points[0][0]},${height - padding.bottom} Z`

  const lastPoint = points[points.length - 1]
  const lastValue = data[data.length - 1]

  return (
    <svg width="100%" height="100%" viewBox={`0 0 ${width} ${height}`} className="overflow-visible">
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0.02" />
        </linearGradient>
      </defs>

      {/* Area fill */}
      <motion.path
        d={areaD}
        fill={`url(#${gradientId})`}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4 }}
      />

      {/* Line */}
      <motion.path
        d={pathD}
        fill="none"
        stroke={color}
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: 1 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
      />

      {/* Data points */}
      {points.map(([x, y], i) => (
        <motion.circle
          key={i}
          cx={x}
          cy={y}
          r="3"
          fill={color}
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: i * 0.1, duration: 0.3 }}
        />
      ))}

      {/* Pulsing dot on latest point */}
      <motion.circle
        cx={lastPoint[0]}
        cy={lastPoint[1]}
        r="5"
        fill={color}
        opacity="0.4"
        animate={{ r: [5, 9, 5], opacity: [0.4, 0.1, 0.4] }}
        transition={{ duration: 1.5, repeat: Infinity }}
      />

      {/* Value label at last point */}
      <text
        x={lastPoint[0]}
        y={lastPoint[1] - 10}
        textAnchor="middle"
        fill={color}
        fontSize="10"
        fontWeight="bold"
        fontFamily="monospace"
      >
        {formatValue(lastValue)}
      </text>
    </svg>
  )
}

// ── Live Training Loss Card ──────────────────────────────────
function LiveTrainingLossCard({ data, currentEpoch, totalEpochs }) {
  const latest = data && data.length > 0 ? data[data.length - 1] : null
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="glass-panel p-5 rounded-xl relative"
    >
      <div className="flex justify-between items-start mb-2">
        <div className="flex items-center gap-1.5">
          <TrendingDown size={13} className="text-primary/60" />
          <span className="text-[10px] uppercase font-bold text-outline tracking-widest">Training Loss</span>
        </div>
        <div className="flex items-center gap-2">
          {latest !== null && <span className="text-xs text-primary font-mono font-bold">{latest.toFixed(4)}</span>}
          <span className="text-[9px] text-on-surface-variant/50 font-mono">
            {currentEpoch}/{totalEpochs}
          </span>
        </div>
      </div>
      <div className="h-24 relative">
        {data && data.length > 0 ? (
          <LiveLineChart
            data={data}
            color="rgb(129, 236, 255)"
            gradientId="lossGrad"
            label="Loss"
            formatValue={(v) => v.toFixed(4)}
          />
        ) : (
          <div className="h-full flex items-center justify-center">
            <Loader2 size={16} className="text-primary/40 animate-spin" />
            <span className="text-xs text-on-surface-variant/40 ml-2">Waiting for epoch 1...</span>
          </div>
        )}
      </div>
      {/* Progress bar */}
      <div className="mt-2 w-full h-1 bg-surface-container rounded-full overflow-hidden">
        <motion.div
          className="h-full bg-primary/60 rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${totalEpochs > 0 ? (currentEpoch / totalEpochs) * 100 : 0}%` }}
          transition={{ duration: 0.5 }}
        />
      </div>
    </motion.div>
  )
}

// ── Live Top-1 Accuracy Card ─────────────────────────────────
function LiveAccuracyCard({ data, currentEpoch, totalEpochs }) {
  const latest = data && data.length > 0 ? data[data.length - 1] : null
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.1 }}
      className="glass-panel p-5 rounded-xl relative"
    >
      <div className="flex justify-between items-start mb-2">
        <div className="flex items-center gap-1.5">
          <Target size={13} className="text-tertiary/60" />
          <span className="text-[10px] uppercase font-bold text-outline tracking-widest">Top-1 Accuracy</span>
        </div>
        <div className="flex items-center gap-2">
          {latest !== null && <span className="text-xs text-tertiary font-mono font-bold">{latest.toFixed(2)}%</span>}
          <span className="text-[9px] text-on-surface-variant/50 font-mono">
            {currentEpoch}/{totalEpochs}
          </span>
        </div>
      </div>
      <div className="h-24 relative">
        {data && data.length > 0 ? (
          <LiveLineChart
            data={data}
            color="rgb(170, 255, 220)"
            gradientId="accGrad"
            label="Accuracy"
            formatValue={(v) => `${v.toFixed(1)}%`}
            yDomain={[0, 100]}
          />
        ) : (
          <div className="h-full flex items-center justify-center">
            <Loader2 size={16} className="text-tertiary/40 animate-spin" />
            <span className="text-xs text-on-surface-variant/40 ml-2">Waiting for epoch 1...</span>
          </div>
        )}
      </div>
      <div className="mt-2 w-full h-1 bg-surface-container rounded-full overflow-hidden">
        <motion.div
          className="h-full bg-tertiary/60 rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${totalEpochs > 0 ? (currentEpoch / totalEpochs) * 100 : 0}%` }}
          transition={{ duration: 0.5 }}
        />
      </div>
    </motion.div>
  )
}

// ── Live Val Error Card ──────────────────────────────────────
function LiveValErrorCard({ data, currentEpoch, totalEpochs }) {
  const latest = data && data.length > 0 ? data[data.length - 1] : null
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.2 }}
      className="glass-panel p-5 rounded-xl relative"
    >
      <div className="flex justify-between items-start mb-2">
        <div className="flex items-center gap-1.5">
          <AlertTriangle size={13} className="text-error/60" />
          <span className="text-[10px] uppercase font-bold text-outline tracking-widest">Val Error</span>
        </div>
        <div className="flex items-center gap-2">
          {latest !== null && <span className="text-xs text-error font-mono font-bold">{latest.toFixed(2)}%</span>}
          <span className="text-[9px] text-on-surface-variant/50 font-mono">
            {currentEpoch}/{totalEpochs}
          </span>
        </div>
      </div>
      <div className="h-24 relative">
        {data && data.length > 0 ? (
          <LiveLineChart
            data={data}
            color="rgb(255, 113, 108)"
            gradientId="errGrad"
            label="Error"
            formatValue={(v) => `${v.toFixed(1)}%`}
            yDomain={[0, 100]}
          />
        ) : (
          <div className="h-full flex items-center justify-center">
            <Loader2 size={16} className="text-error/40 animate-spin" />
            <span className="text-xs text-on-surface-variant/40 ml-2">Waiting for epoch 1...</span>
          </div>
        )}
      </div>
      <div className="mt-2 w-full h-1 bg-surface-container rounded-full overflow-hidden">
        <motion.div
          className="h-full bg-error/60 rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${totalEpochs > 0 ? (currentEpoch / totalEpochs) * 100 : 0}%` }}
          transition={{ duration: 0.5 }}
        />
      </div>
    </motion.div>
  )
}

// ── Static cards (for completed results & hardcoded experiments) ──
function TrainingLossCard({ value, onClick }) {
  const barHeights = [80, 70, 65, 50, 45, 30, 25, 20]
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.5 }}
      whileHover={{ y: -4, boxShadow: '0 0 20px rgba(129,236,255,0.1)' }}
      onClick={onClick}
      className="glass-panel p-5 rounded-xl cursor-pointer group relative"
    >
      <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
        <Maximize2 size={14} className="text-primary/40" />
      </div>
      <div className="flex justify-between items-start mb-4">
        <span className="text-[10px] uppercase font-bold text-outline tracking-widest">Training Loss</span>
        <span className="text-xs text-primary font-mono">{value}</span>
      </div>
      <div className="h-24 flex items-end gap-1">
        {barHeights.map((h, i) => (
          <motion.div
            key={i}
            initial={{ height: 0 }}
            animate={{ height: `${h}%` }}
            transition={{ duration: 0.6, delay: 0.7 + i * 0.05, ease: 'easeOut' }}
            whileHover={{ backgroundColor: 'rgb(129, 236, 255)' }}
            className="bg-primary/20 transition-colors flex-1 rounded-t-sm"
          />
        ))}
      </div>
    </motion.div>
  )
}

function Top1AccuracyCard({ value, onClick }) {
  const points = [
    [0, 40], [10, 35], [20, 38], [30, 30], [40, 25],
    [50, 28], [60, 18], [70, 15], [80, 12], [90, 10], [100, 8],
  ]
  const pathD = points.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x},${y}`).join(' ')
  const areaD = `${pathD} L100,40 L0,40 Z`

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.6 }}
      whileHover={{ y: -4, boxShadow: '0 0 20px rgba(170,255,220,0.1)' }}
      onClick={onClick}
      className="glass-panel p-5 rounded-xl cursor-pointer group relative"
    >
      <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
        <Maximize2 size={14} className="text-tertiary/40" />
      </div>
      <div className="flex justify-between items-start mb-4">
        <span className="text-[10px] uppercase font-bold text-outline tracking-widest">Top-1 Accuracy</span>
        <span className="text-xs text-tertiary font-mono">{value}%</span>
      </div>
      <div className="h-24 relative overflow-hidden">
        <svg className="w-full h-full stroke-tertiary fill-tertiary/5 stroke-2" viewBox="0 0 100 40">
          <motion.path d={areaD} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 1, delay: 0.8 }} />
          <motion.path d={pathD} fill="none" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1.5, delay: 0.8, ease: 'easeOut' }} />
        </svg>
      </div>
    </motion.div>
  )
}

function ValErrorCard({ value, onClick }) {
  const bars = [60, 55, 48, 42]
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.8 }}
      whileHover={{ y: -4, boxShadow: '0 0 20px rgba(255,113,108,0.1)' }}
      onClick={onClick}
      className="glass-panel p-5 rounded-xl cursor-pointer group relative"
    >
      <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
        <Maximize2 size={14} className="text-error/40" />
      </div>
      <div className="flex justify-between items-start mb-4">
        <span className="text-[10px] uppercase font-bold text-outline tracking-widest">Val Error</span>
        <span className="text-xs text-error font-mono">{value}%</span>
      </div>
      <div className="h-24 grid grid-cols-4 items-end gap-2">
        {bars.map((h, i) => (
          <motion.div
            key={i}
            initial={{ height: 0 }}
            animate={{ height: `${h}%` }}
            transition={{ duration: 0.5, delay: 1.0 + i * 0.1, ease: 'easeOut' }}
            className="bg-error/10 border-t border-error"
          />
        ))}
      </div>
    </motion.div>
  )
}

// Placeholder card shown before training
function PlaceholderCard({ label, colorClass }) {
  return (
    <div className="glass-panel p-5 rounded-xl relative">
      <div className="flex justify-between items-start mb-4">
        <span className="text-[10px] uppercase font-bold text-outline tracking-widest">{label}</span>
        <span className={`text-xs ${colorClass} font-mono`}>—</span>
      </div>
      <div className="h-24 flex items-center justify-center">
        <span className="text-xs text-on-surface-variant/40 font-body italic">Train model to see results</span>
      </div>
    </div>
  )
}



// ── Dual-line SVG chart (train + val on same plot) ─────────────
function DualLineChart({ data1, data2, label1, label2, color1, color2, title, yLabel, animDelay = 0 }) {
  const width = 400
  const height = 220
  const pad = { top: 20, right: 16, bottom: 30, left: 45 }
  const chartW = width - pad.left - pad.right
  const chartH = height - pad.top - pad.bottom

  const allVals = [...(data1 || []), ...(data2 || [])]
  if (allVals.length === 0) return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: animDelay }} className="glass-panel p-4 rounded-xl">
      <h3 className="text-[11px] uppercase font-bold text-primary tracking-widest mb-3">{title}</h3>
      <div className="flex items-center justify-center h-[200px] text-on-surface-variant/30 text-xs font-mono">Waiting for data...</div>
    </motion.div>
  )

  const yMin = Math.floor(Math.min(...allVals) * 10) / 10
  const yMax = Math.ceil(Math.max(...allVals) * 10) / 10
  const yRange = yMax - yMin || 1
  const numPoints = Math.max((data1 || []).length, (data2 || []).length)

  const toX = (i) => pad.left + (numPoints > 1 ? (i / (numPoints - 1)) * chartW : chartW / 2)
  const toY = (v) => pad.top + chartH - ((v - yMin) / yRange) * chartH

  const yTicks = []
  const tickCount = 5
  for (let i = 0; i <= tickCount; i++) {
    yTicks.push(Math.round((yMin + (yRange * i / tickCount)) * 100) / 100)
  }

  const makePath = (arr) => (arr || []).map((v, i) => `${i === 0 ? 'M' : 'L'}${toX(i)},${toY(v)}`).join(' ')

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: animDelay }}
      className="glass-panel p-4 rounded-xl"
    >
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-[11px] uppercase font-bold text-primary tracking-widest">{title}</h3>
        <div className="flex gap-3">
          {data1 && data1.length > 0 && (
            <span className="text-[10px] font-mono font-bold" style={{ color: color1 }}>{label1}: {data1[data1.length - 1].toFixed(4)}</span>
          )}
          {data2 && data2.length > 0 && (
            <span className="text-[10px] font-mono font-bold" style={{ color: color2 }}>{label2}: {data2[data2.length - 1].toFixed(4)}</span>
          )}
        </div>
      </div>
      <svg width="100%" viewBox={`0 0 ${width} ${height}`} className="overflow-visible">
        {yTicks.map((v, i) => (
          <g key={i}>
            <line x1={pad.left} y1={toY(v)} x2={width - pad.right} y2={toY(v)} stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
            <text x={pad.left - 6} y={toY(v) + 3} textAnchor="end" fill="rgba(255,255,255,0.35)" fontSize="8" fontFamily="monospace">{v.toFixed(2)}</text>
          </g>
        ))}

        <text x={pad.left + chartW / 2} y={height - 2} textAnchor="middle" fill="rgba(255,255,255,0.35)" fontSize="8" fontFamily="monospace">Epochs</text>
        <text x={10} y={pad.top + chartH / 2} textAnchor="middle" fill="rgba(255,255,255,0.35)" fontSize="8" fontFamily="monospace" transform={`rotate(-90, 10, ${pad.top + chartH / 2})`}>{yLabel}</text>

        {/* X-axis ticks */}
        {(() => {
          const xTickCount = Math.min(numPoints, 6)
          const xTicks = []
          for (let i = 0; i < xTickCount; i++) {
            const idx = Math.round(i * (numPoints - 1) / (xTickCount - 1))
            xTicks.push(idx)
          }
          return xTicks.map((idx) => (
            <g key={`xt-${idx}`}>
              <line x1={toX(idx)} y1={pad.top + chartH} x2={toX(idx)} y2={pad.top + chartH + 3} stroke="rgba(255,255,255,0.2)" strokeWidth="1" />
              <text x={toX(idx)} y={pad.top + chartH + 12} textAnchor="middle" fill="rgba(255,255,255,0.35)" fontSize="7" fontFamily="monospace">{idx + 1}</text>
            </g>
          ))
        })()}

        {data1 && data1.length > 0 && (
          <motion.path d={makePath(data1)} fill="none" stroke={color1} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
            initial={{ pathLength: 0, opacity: 0 }} animate={{ pathLength: 1, opacity: 1 }} transition={{ duration: 1.2, delay: animDelay, ease: 'easeOut' }} />
        )}
        {data2 && data2.length > 0 && (
          <motion.path d={makePath(data2)} fill="none" stroke={color2} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="4 2"
            initial={{ pathLength: 0, opacity: 0 }} animate={{ pathLength: 1, opacity: 1 }} transition={{ duration: 1.2, delay: animDelay + 0.2, ease: 'easeOut' }} />
        )}
      </svg>
      <div className="flex gap-4 mt-2">
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-0.5 rounded-full" style={{ backgroundColor: color1 }} />
          <span className="text-[9px] text-on-surface-variant/60 font-mono">{label1}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-0.5 rounded-full border-t border-dashed" style={{ borderColor: color2 }} />
          <span className="text-[9px] text-on-surface-variant/60 font-mono">{label2}</span>
        </div>
      </div>
    </motion.div>
  )
}

// ── Single-line SR/Steps chart ──────────────────────────────────
function SROverallChart({ steps, values, title, animDelay = 0 }) {
  const width = 400
  const height = 220
  const pad = { top: 20, right: 16, bottom: 30, left: 45 }
  const chartW = width - pad.left - pad.right
  const chartH = height - pad.top - pad.bottom

  if (!values || values.length === 0) return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: animDelay }} className="glass-panel p-4 rounded-xl">
      <h3 className="text-[11px] uppercase font-bold text-primary tracking-widest mb-3">{title}</h3>
      <div className="flex items-center justify-center h-[200px] text-on-surface-variant/30 text-xs font-mono">Waiting for data...</div>
    </motion.div>
  )

  const yMin = Math.floor(Math.min(...values) * 10) / 10
  const yMax = Math.ceil(Math.max(...values) * 10) / 10
  const yRange = yMax - yMin || 1
  const numPoints = values.length

  const toX = (i) => pad.left + (numPoints > 1 ? (i / (numPoints - 1)) * chartW : chartW / 2)
  const toY = (v) => pad.top + chartH - ((v - yMin) / yRange) * chartH

  const yTicks = []
  const tickCount = 5
  for (let i = 0; i <= tickCount; i++) {
    yTicks.push(Math.round((yMin + (yRange * i / tickCount)) * 100) / 100)
  }

  const pathD = values.map((v, i) => `${i === 0 ? 'M' : 'L'}${toX(i)},${toY(v)}`).join(' ')

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: animDelay }}
      className="glass-panel p-4 rounded-xl"
    >
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-[11px] uppercase font-bold text-primary tracking-widest">{title}</h3>
        <span className="text-[10px] font-mono font-bold text-[#a78bfa]">Final: {values[values.length - 1].toFixed(4)}</span>
      </div>
      <svg width="100%" viewBox={`0 0 ${width} ${height}`} className="overflow-visible">
        {yTicks.map((v, i) => (
          <g key={i}>
            <line x1={pad.left} y1={toY(v)} x2={width - pad.right} y2={toY(v)} stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
            <text x={pad.left - 6} y={toY(v) + 3} textAnchor="end" fill="rgba(255,255,255,0.35)" fontSize="8" fontFamily="monospace">{v.toFixed(2)}</text>
          </g>
        ))}

        <text x={pad.left + chartW / 2} y={height - 2} textAnchor="middle" fill="rgba(255,255,255,0.35)" fontSize="8" fontFamily="monospace">Training Steps</text>
        <text x={10} y={pad.top + chartH / 2} textAnchor="middle" fill="rgba(255,255,255,0.35)" fontSize="8" fontFamily="monospace" transform={`rotate(-90, 10, ${pad.top + chartH / 2})`}>Avg Stable Rank</text>

        {/* X-axis ticks */}
        {(() => {
          const xTickCount = Math.min(numPoints, 6)
          const xTicks = []
          for (let i = 0; i < xTickCount; i++) {
            const idx = Math.round(i * (numPoints - 1) / (xTickCount - 1))
            xTicks.push(idx)
          }
          return xTicks.map((idx) => (
            <g key={`xt-${idx}`}>
              <line x1={toX(idx)} y1={pad.top + chartH} x2={toX(idx)} y2={pad.top + chartH + 3} stroke="rgba(255,255,255,0.2)" strokeWidth="1" />
              <text x={toX(idx)} y={pad.top + chartH + 12} textAnchor="middle" fill="rgba(255,255,255,0.35)" fontSize="7" fontFamily="monospace">{steps[idx]}</text>
            </g>
          ))
        })()}

        <motion.path d={pathD} fill="none" stroke="#a78bfa" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
          initial={{ pathLength: 0, opacity: 0 }} animate={{ pathLength: 1, opacity: 1 }} transition={{ duration: 1.2, delay: animDelay, ease: 'easeOut' }} />
      </svg>
    </motion.div>
  )
}

// ── SR/Layer chart (reuses LAYER_COLORS, same style as Exp5) ────
function SRPerLayerChart({ srPerLayer, srSteps, title, animDelay = 0 }) {
  const width = 400
  const height = 220
  const pad = { top: 20, right: 16, bottom: 30, left: 45 }
  const chartW = width - pad.left - pad.right
  const chartH = height - pad.top - pad.bottom

  if (!srPerLayer || Object.keys(srPerLayer).length === 0) return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: animDelay }} className="glass-panel p-4 rounded-xl">
      <h3 className="text-[11px] uppercase font-bold text-primary tracking-widest mb-3">{title}</h3>
      <div className="flex items-center justify-center h-[200px] text-on-surface-variant/30 text-xs font-mono">Waiting for data...</div>
    </motion.div>
  )

  const numLayers = Object.keys(srPerLayer).length
  const numPoints = (srPerLayer.layer_0 || []).length

  let allVals = []
  for (let i = 0; i < numLayers; i++) {
    allVals.push(...(srPerLayer[`layer_${i}`] || []))
  }
  const yMin = Math.floor(Math.min(...allVals) * 10) / 10
  const yMax = Math.ceil(Math.max(...allVals) * 10) / 10
  const yRange = yMax - yMin || 1

  const toX = (i) => pad.left + (numPoints > 1 ? (i / (numPoints - 1)) * chartW : chartW / 2)
  const toY = (v) => pad.top + chartH - ((v - yMin) / yRange) * chartH

  const yTicks = []
  const tickStep = yRange <= 1 ? 0.2 : 0.5
  for (let v = yMin; v <= yMax + 0.01; v += tickStep) {
    yTicks.push(Math.round(v * 10) / 10)
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: animDelay }}
      className="glass-panel p-4 rounded-xl"
    >
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-[11px] uppercase font-bold text-primary tracking-widest">{title}</h3>
        <span className="text-[10px] font-mono font-bold text-[#a78bfa]">Avg: {(Array.from({ length: numLayers }).reduce((s, _, i) => { const d = srPerLayer[`layer_${i}`] || []; return s + (d.length ? d[d.length - 1] : 0) }, 0) / numLayers).toFixed(4)}</span>
      </div>
      <svg width="100%" viewBox={`0 0 ${width} ${height}`} className="overflow-visible">
        {yTicks.map((v, i) => (
          <g key={i}>
            <line x1={pad.left} y1={toY(v)} x2={width - pad.right} y2={toY(v)} stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
            <text x={pad.left - 6} y={toY(v) + 3} textAnchor="end" fill="rgba(255,255,255,0.35)" fontSize="8" fontFamily="monospace">{v.toFixed(1)}</text>
          </g>
        ))}
        <text x={pad.left + chartW / 2} y={height - 2} textAnchor="middle" fill="rgba(255,255,255,0.35)" fontSize="8" fontFamily="monospace">Training Steps</text>
        <text x={10} y={pad.top + chartH / 2} textAnchor="middle" fill="rgba(255,255,255,0.35)" fontSize="8" fontFamily="monospace" transform={`rotate(-90, 10, ${pad.top + chartH / 2})`}>Stable Rank</text>

        {/* X-axis ticks */}
        {(() => {
          const xTickCount = Math.min(numPoints, 6)
          const xTicks = []
          for (let i = 0; i < xTickCount; i++) {
            const idx = Math.round(i * (numPoints - 1) / (xTickCount - 1))
            xTicks.push(idx)
          }
          return xTicks.map((idx) => (
            <g key={`xt-${idx}`}>
              <line x1={toX(idx)} y1={pad.top + chartH} x2={toX(idx)} y2={pad.top + chartH + 3} stroke="rgba(255,255,255,0.2)" strokeWidth="1" />
              <text x={toX(idx)} y={pad.top + chartH + 12} textAnchor="middle" fill="rgba(255,255,255,0.35)" fontSize="7" fontFamily="monospace">{srSteps && srSteps[idx] ? srSteps[idx] : idx}</text>
            </g>
          ))
        })()}

        {Array.from({ length: numLayers }).map((_, layerIdx) => {
          const layerData = srPerLayer[`layer_${layerIdx}`] || []
          const color = LAYER_COLORS[layerIdx % LAYER_COLORS.length]
          const pathD = layerData.map((v, i) => `${i === 0 ? 'M' : 'L'}${toX(i)},${toY(v)}`).join(' ')

          return (
            <motion.path key={layerIdx} d={pathD} fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
              initial={{ pathLength: 0, opacity: 0 }} animate={{ pathLength: 1, opacity: 1 }} transition={{ duration: 1.2, delay: animDelay + layerIdx * 0.15, ease: 'easeOut' }} />
          )
        })}
      </svg>
      <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2">
        {Array.from({ length: numLayers }).map((_, i) => (
          <div key={i} className="flex items-center gap-1">
            <div className="w-2.5 h-0.5 rounded-full" style={{ backgroundColor: LAYER_COLORS[i % LAYER_COLORS.length] }} />
            <span className="text-[9px] text-on-surface-variant/60 font-mono">L{i}</span>
          </div>
        ))}
      </div>
    </motion.div>
  )
}

// ── Experiment 1 (Vanilla ViT — 4 plots) ──────────────────────
function Experiment1Block({ metrics, loading, status, progress, onTrain, onCancel, hyperparams }) {
  const hasResults = status === 'completed' && metrics
  const isTraining = status === 'training'
  const [notebookOpen, setNotebookOpen] = useState(false)

  // Use progress data during training, metrics data when complete
  const plotData = isTraining && progress ? {
    trainLoss: progress.trainLoss,
    valLoss: progress.valLoss,
    trainAcc: progress.trainAcc,
    valAcc: progress.valAcc,
    srPerLayer: progress.srPerLayer,
    srOverall: progress.srOverall,
    srSteps: progress.srSteps,
  } : hasResults ? metrics : null

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.3 }}
      className="col-span-12"
    >
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-baseline gap-4">
          <h2 className="text-xl font-headline font-bold text-primary uppercase tracking-wider">
            Experiment 1
          </h2>
          <p className="text-sm text-on-surface-variant font-body">
            {isTraining && progress
              ? `Training — Epoch ${progress.currentEpoch} / ${progress.totalEpochs}`
              : 'Vanilla Transformer — No residual, no LayerNorm.'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setNotebookOpen(true)}
            className="bg-[#20beff]/10 hover:bg-[#20beff]/20 text-[#20beff] border border-[#20beff]/20 px-4 py-2.5 font-black rounded-lg transition-all hover:shadow-[0_0_20px_rgba(32,190,255,0.15)] active:scale-95 uppercase tracking-widest text-xs flex items-center gap-2 whitespace-nowrap"
          >
            <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="#20beff">
              <path d="M18.825 23.859c-.022.092-.117.141-.281.141h-3.139c-.187 0-.351-.082-.492-.248l-5.178-6.589-1.448 1.374v5.111c0 .235-.117.352-.351.352H5.505c-.236 0-.354-.117-.354-.352V.353c0-.233.118-.353.354-.353h2.431c.234 0 .351.12.351.353v14.343l6.203-6.272c.165-.165.33-.246.495-.246h3.239c.144 0 .236.06.281.18.046.149.034.233-.07.352l-6.871 7.058 7.261 7.669c.093.117.117.2.07.282z"/>
            </svg>
            NOTEBOOK
          </button>
          {loading ? (
            <button
              onClick={onCancel}
              className="bg-error hover:bg-red-600 text-white px-6 py-2.5 font-black rounded-lg transition-all hover:shadow-[0_0_25px_rgba(255,113,108,0.3)] active:scale-95 uppercase tracking-widest text-xs flex items-center gap-2 whitespace-nowrap"
            >
              <Loader2 size={14} className="animate-spin" />
              STOP TRAINING
            </button>
          ) : (
            <button
              onClick={onTrain}
              className="bg-primary hover:bg-primary-dim text-on-primary px-6 py-2.5 font-black rounded-lg transition-all hover:shadow-[0_0_25px_rgba(129,236,255,0.3)] active:scale-95 uppercase tracking-widest text-xs flex items-center gap-2 whitespace-nowrap"
            >
              EXP1 : TRAIN MODEL
            </button>
          )}
        </div>
      </div>

      {/* Kaggle Notebook Modal */}
      {notebookOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={() => setNotebookOpen(false)}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="glass-panel rounded-2xl border border-outline/10 shadow-2xl w-full max-w-lg mx-4 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b border-outline/10">
              <h2 className="text-sm font-headline font-bold text-on-surface uppercase tracking-wider">
                Experiment 1 — Kaggle Notebook
              </h2>
              <button
                onClick={() => setNotebookOpen(false)}
                className="p-2 text-on-surface-variant/60 hover:text-on-surface-variant hover:bg-surface-container rounded-lg transition-all"
              >
                <X size={18} />
              </button>
            </div>
            <div className="p-6 flex flex-col items-center justify-center gap-5">
              <div className="w-16 h-16 rounded-2xl bg-[#20beff]/10 border border-[#20beff]/20 flex items-center justify-center">
                <svg viewBox="0 0 24 24" className="w-8 h-8" fill="#20beff">
                  <path d="M18.825 23.859c-.022.092-.117.141-.281.141h-3.139c-.187 0-.351-.082-.492-.248l-5.178-6.589-1.448 1.374v5.111c0 .235-.117.352-.351.352H5.505c-.236 0-.354-.117-.354-.352V.353c0-.233.118-.353.354-.353h2.431c.234 0 .351.12.351.353v14.343l6.203-6.272c.165-.165.33-.246.495-.246h3.239c.144 0 .236.06.281.18.046.149.034.233-.07.352l-6.871 7.058 7.261 7.669c.093.117.117.2.07.282z"/>
                </svg>
              </div>
              <div className="text-center">
                <p className="text-on-surface text-base font-headline font-bold mb-1">Kaggle Notebook</p>
                <p className="text-on-surface-variant/60 text-xs font-body max-w-xs">
                  View the full training code, outputs, and visualizations for Experiment 1 on Kaggle.
                </p>
              </div>
              <div className="flex flex-wrap gap-2 justify-center">
                {['Python', 'PyTorch', 'CIFAR-10', 'GPU T4'].map((tag) => (
                  <span key={tag} className="px-3 py-1 rounded-full bg-[#20beff]/10 border border-[#20beff]/20 text-[10px] font-mono text-[#20beff] uppercase tracking-wider">
                    {tag}
                  </span>
                ))}
              </div>
              <a
                href="https://www.kaggle.com/code/ssimranjit302/experiment1"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 bg-[#20beff] hover:bg-[#18a8e6] text-white px-6 py-3 rounded-lg font-bold text-sm uppercase tracking-wide transition-all hover:shadow-[0_0_25px_rgba(32,190,255,0.3)] hover:scale-105 active:scale-95"
              >
                <ExternalLink size={16} />
                Open Notebook in Kaggle
              </a>
              <p className="text-[10px] text-on-surface-variant/30 font-mono">experiment1</p>
            </div>
          </motion.div>
        </motion.div>
      )}

      {plotData ? (
        <section className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-5">
          <DualLineChart
            data1={plotData.trainLoss} data2={plotData.valLoss}
            label1="Train Loss" label2="Val Loss"
            color1="#ff716c" color2="#ffb74d"
            title="Loss" yLabel="Loss"
            animDelay={0.1}
          />
          <DualLineChart
            data1={plotData.trainAcc} data2={plotData.valAcc}
            label1="Train Acc" label2="Val Acc"
            color1="#81ecff" color2="#4caf50"
            title="Accuracy" yLabel="Accuracy (%)"
            animDelay={0.2}
          />
          <SRPerLayerChart
            srPerLayer={plotData.srPerLayer}
            srSteps={plotData.srSteps}
            title="Stable Rank / Layer"
            animDelay={0.3}
          />
          <SROverallChart
            steps={plotData.srSteps}
            values={plotData.srOverall}
            title="Stable Rank / Steps"
            animDelay={0.4}
          />
        </section>
      ) : (
        <section className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-5">
          {['Loss', 'Accuracy', 'Stable Rank / Layer', 'Stable Rank / Steps'].map((label) => (
            <PlaceholderCard key={label} label={label} colorClass="text-primary" />
          ))}
        </section>
      )}

      {hasResults && hyperparams && (
        <div className="glass-panel p-4 rounded-xl mb-2">
          <h3 className="text-[10px] uppercase font-bold text-outline tracking-widest mb-3">Hyperparameters</h3>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <div className="flex flex-col">
              <span className="text-[9px] uppercase tracking-wider text-on-surface-variant/50 mb-0.5">Embeddings</span>
              <span className="text-sm font-mono font-bold text-primary">{hyperparams.n_embd}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-[9px] uppercase tracking-wider text-on-surface-variant/50 mb-0.5">Heads</span>
              <span className="text-sm font-mono font-bold text-tertiary">{hyperparams.n_head}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-[9px] uppercase tracking-wider text-on-surface-variant/50 mb-0.5">Layers</span>
              <span className="text-sm font-mono font-bold text-secondary">{hyperparams.n_layer}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-[9px] uppercase tracking-wider text-on-surface-variant/50 mb-0.5">Learning Rate</span>
              <span className="text-sm font-mono font-bold text-[#ffb74d]">{hyperparams.learning_rate}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-[9px] uppercase tracking-wider text-on-surface-variant/50 mb-0.5">Epochs</span>
              <span className="text-sm font-mono font-bold text-[#a78bfa]">{hyperparams.epochs}</span>
            </div>
          </div>
        </div>
      )}

      {status === 'failed' && (
        <div className="glass-panel p-4 rounded-xl mb-2 border border-error/30">
          <p className="text-sm text-error font-body">Training failed. Please check the backend logs and try again.</p>
        </div>
      )}

      {status === 'cancelled' && (
        <div className="glass-panel p-4 rounded-xl mb-2 border border-yellow-500/30">
          <p className="text-sm text-yellow-400 font-body">Training was stopped by user. Click "EXP1 : TRAIN MODEL" to start a new run.</p>
        </div>
      )}
    </motion.div>
  )
}

// ── Experiment 2 (dynamic / live) ──────────────────────────────
function Experiment2Block({ metrics, loading, status, progress, onTrain, onCancel, hyperparams }) {
  const hasResults = status === 'completed' && metrics
  const isTraining = status === 'training'
  const [notebookOpen, setNotebookOpen] = useState(false)

  const plotData = isTraining && progress ? {
    trainLoss: progress.trainLoss,
    valLoss: progress.valLoss,
    trainAcc: progress.trainAcc,
    valAcc: progress.valAcc,
    srPerLayer: progress.srPerLayer,
    srOverall: progress.srOverall,
    srSteps: progress.srSteps,
  } : hasResults ? metrics : null

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.45 }}
      className="col-span-12"
    >
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-baseline gap-4">
          <h2 className="text-xl font-headline font-bold text-primary uppercase tracking-wider">
            Experiment 2
          </h2>
          <p className="text-sm text-on-surface-variant font-body">
            {isTraining && progress
              ? `Training — Epoch ${progress.currentEpoch} / ${progress.totalEpochs}`
              : 'Pre-LayerNorm Transformer with residual connections.'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setNotebookOpen(true)}
            className="bg-[#20beff]/10 hover:bg-[#20beff]/20 text-[#20beff] border border-[#20beff]/20 px-4 py-2.5 font-black rounded-lg transition-all hover:shadow-[0_0_20px_rgba(32,190,255,0.15)] active:scale-95 uppercase tracking-widest text-xs flex items-center gap-2 whitespace-nowrap"
          >
            <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="#20beff">
              <path d="M18.825 23.859c-.022.092-.117.141-.281.141h-3.139c-.187 0-.351-.082-.492-.248l-5.178-6.589-1.448 1.374v5.111c0 .235-.117.352-.351.352H5.505c-.236 0-.354-.117-.354-.352V.353c0-.233.118-.353.354-.353h2.431c.234 0 .351.12.351.353v14.343l6.203-6.272c.165-.165.33-.246.495-.246h3.239c.144 0 .236.06.281.18.046.149.034.233-.07.352l-6.871 7.058 7.261 7.669c.093.117.117.2.07.282z"/>
            </svg>
            NOTEBOOK
          </button>
          {loading ? (
            <button
              onClick={onCancel}
              className="bg-error hover:bg-red-600 text-white px-6 py-2.5 font-black rounded-lg transition-all hover:shadow-[0_0_25px_rgba(255,113,108,0.3)] active:scale-95 uppercase tracking-widest text-xs flex items-center gap-2 whitespace-nowrap"
            >
              <Loader2 size={14} className="animate-spin" />
              STOP TRAINING
            </button>
          ) : (
            <button
              onClick={onTrain}
              className="bg-primary hover:bg-primary-dim text-on-primary px-6 py-2.5 font-black rounded-lg transition-all hover:shadow-[0_0_25px_rgba(129,236,255,0.3)] active:scale-95 uppercase tracking-widest text-xs flex items-center gap-2 whitespace-nowrap"
            >
              EXP2 : TRAIN MODEL
            </button>
          )}
        </div>
      </div>

      {/* Kaggle Notebook Modal */}
      {notebookOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={() => setNotebookOpen(false)}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="glass-panel rounded-2xl border border-outline/10 shadow-2xl w-full max-w-lg mx-4 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b border-outline/10">
              <h2 className="text-sm font-headline font-bold text-on-surface uppercase tracking-wider">
                Experiment 2 — Kaggle Notebook
              </h2>
              <button onClick={() => setNotebookOpen(false)} className="p-2 text-on-surface-variant/60 hover:text-on-surface-variant hover:bg-surface-container rounded-lg transition-all">
                <X size={18} />
              </button>
            </div>
            <div className="p-6 flex flex-col items-center justify-center gap-5">
              <div className="w-16 h-16 rounded-2xl bg-[#20beff]/10 border border-[#20beff]/20 flex items-center justify-center">
                <svg viewBox="0 0 24 24" className="w-8 h-8" fill="#20beff">
                  <path d="M18.825 23.859c-.022.092-.117.141-.281.141h-3.139c-.187 0-.351-.082-.492-.248l-5.178-6.589-1.448 1.374v5.111c0 .235-.117.352-.351.352H5.505c-.236 0-.354-.117-.354-.352V.353c0-.233.118-.353.354-.353h2.431c.234 0 .351.12.351.353v14.343l6.203-6.272c.165-.165.33-.246.495-.246h3.239c.144 0 .236.06.281.18.046.149.034.233-.07.352l-6.871 7.058 7.261 7.669c.093.117.117.2.07.282z"/>
                </svg>
              </div>
              <div className="text-center">
                <p className="text-on-surface text-base font-headline font-bold mb-1">Kaggle Notebook</p>
                <p className="text-on-surface-variant/60 text-xs font-body max-w-xs">
                  View the full training code, outputs, and visualizations for Experiment 2 on Kaggle.
                </p>
              </div>
              <div className="flex flex-wrap gap-2 justify-center">
                {['Python', 'PyTorch', 'CIFAR-10', 'GPU T4'].map((tag) => (
                  <span key={tag} className="px-3 py-1 rounded-full bg-[#20beff]/10 border border-[#20beff]/20 text-[10px] font-mono text-[#20beff] uppercase tracking-wider">
                    {tag}
                  </span>
                ))}
              </div>
              <a
                href="https://www.kaggle.com/code/ssimranjit302/experiment2"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 bg-[#20beff] hover:bg-[#18a8e6] text-white px-6 py-3 rounded-lg font-bold text-sm uppercase tracking-wide transition-all hover:shadow-[0_0_25px_rgba(32,190,255,0.3)] hover:scale-105 active:scale-95"
              >
                <ExternalLink size={16} />
                Open Notebook in Kaggle
              </a>
              <p className="text-[10px] text-on-surface-variant/30 font-mono">experiment2</p>
            </div>
          </motion.div>
        </motion.div>
      )}

      {plotData ? (
        <section className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-5">
          <DualLineChart
            data1={plotData.trainLoss} data2={plotData.valLoss}
            label1="Train Loss" label2="Val Loss"
            color1="#ff716c" color2="#ffb74d"
            title="Loss" yLabel="Loss"
            animDelay={0.1}
          />
          <DualLineChart
            data1={plotData.trainAcc} data2={plotData.valAcc}
            label1="Train Acc" label2="Val Acc"
            color1="#81ecff" color2="#4caf50"
            title="Accuracy" yLabel="Accuracy (%)"
            animDelay={0.2}
          />
          <SRPerLayerChart
            srPerLayer={plotData.srPerLayer}
            srSteps={plotData.srSteps}
            title="Stable Rank / Layer"
            animDelay={0.3}
          />
          <SROverallChart
            steps={plotData.srSteps}
            values={plotData.srOverall}
            title="Stable Rank / Steps"
            animDelay={0.4}
          />
        </section>
      ) : (
        <section className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-5">
          {['Loss', 'Accuracy', 'Stable Rank / Layer', 'Stable Rank / Steps'].map((label) => (
            <PlaceholderCard key={label} label={label} colorClass="text-primary" />
          ))}
        </section>
      )}

      {(hasResults || isTraining) && hyperparams && (
        <div className="glass-panel p-4 rounded-xl mb-2">
          <h3 className="text-[10px] uppercase font-bold text-outline tracking-widest mb-3">Hyperparameters</h3>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <div className="flex flex-col">
              <span className="text-[9px] uppercase tracking-wider text-on-surface-variant/50 mb-0.5">Embeddings</span>
              <span className="text-sm font-mono font-bold text-primary">{hyperparams.n_embd}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-[9px] uppercase tracking-wider text-on-surface-variant/50 mb-0.5">Heads</span>
              <span className="text-sm font-mono font-bold text-tertiary">{hyperparams.n_head}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-[9px] uppercase tracking-wider text-on-surface-variant/50 mb-0.5">Layers</span>
              <span className="text-sm font-mono font-bold text-secondary">{hyperparams.n_layer}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-[9px] uppercase tracking-wider text-on-surface-variant/50 mb-0.5">Learning Rate</span>
              <span className="text-sm font-mono font-bold text-[#ffb74d]">{hyperparams.learning_rate}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-[9px] uppercase tracking-wider text-on-surface-variant/50 mb-0.5">Epochs</span>
              <span className="text-sm font-mono font-bold text-[#a78bfa]">{hyperparams.epochs}</span>
            </div>
          </div>
        </div>
      )}

      {status === 'failed' && (
        <div className="glass-panel p-4 rounded-xl mb-2 border border-error/30">
          <p className="text-sm text-error font-body">Training failed. Check backend logs.</p>
        </div>
      )}

      {status === 'cancelled' && (
        <div className="glass-panel p-4 rounded-xl mb-2 border border-yellow-500/30">
          <p className="text-sm text-yellow-400 font-body">Training was stopped by user. Click "EXP2 : TRAIN MODEL" to start a new run.</p>
        </div>
      )}
    </motion.div>
  )
}

// ── Experiment 3 (dynamic / live) ──────────────────────────────
function Experiment3Block({ metrics, loading, status, progress, onTrain, onCancel, hyperparams }) {
  const hasResults = status === 'completed' && metrics
  const isTraining = status === 'training'
  const [notebookOpen, setNotebookOpen] = useState(false)

  const plotData = isTraining && progress ? {
    trainLoss: progress.trainLoss,
    valLoss: progress.valLoss,
    trainAcc: progress.trainAcc,
    valAcc: progress.valAcc,
    srPerLayer: progress.srPerLayer,
    srOverall: progress.srOverall,
    srSteps: progress.srSteps,
  } : hasResults ? metrics : null

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.6 }}
      className="col-span-12"
    >
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-baseline gap-4">
          <h2 className="text-xl font-headline font-bold text-primary uppercase tracking-wider">
            Experiment 3
          </h2>
          <p className="text-sm text-on-surface-variant font-body">
            {isTraining && progress
              ? `Training — Epoch ${progress.currentEpoch} / ${progress.totalEpochs}`
              : 'Differential attention with RMSNorm, SwiGLU FFN, and lambda-based attention.'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setNotebookOpen(true)}
            className="bg-[#20beff]/10 hover:bg-[#20beff]/20 text-[#20beff] border border-[#20beff]/20 px-4 py-2.5 font-black rounded-lg transition-all hover:shadow-[0_0_20px_rgba(32,190,255,0.15)] active:scale-95 uppercase tracking-widest text-xs flex items-center gap-2 whitespace-nowrap"
          >
            <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="#20beff">
              <path d="M18.825 23.859c-.022.092-.117.141-.281.141h-3.139c-.187 0-.351-.082-.492-.248l-5.178-6.589-1.448 1.374v5.111c0 .235-.117.352-.351.352H5.505c-.236 0-.354-.117-.354-.352V.353c0-.233.118-.353.354-.353h2.431c.234 0 .351.12.351.353v14.343l6.203-6.272c.165-.165.33-.246.495-.246h3.239c.144 0 .236.06.281.18.046.149.034.233-.07.352l-6.871 7.058 7.261 7.669c.093.117.117.2.07.282z"/>
            </svg>
            NOTEBOOK
          </button>
          {loading ? (
            <button
              onClick={onCancel}
              className="bg-error hover:bg-red-600 text-white px-6 py-2.5 font-black rounded-lg transition-all hover:shadow-[0_0_25px_rgba(255,113,108,0.3)] active:scale-95 uppercase tracking-widest text-xs flex items-center gap-2 whitespace-nowrap"
            >
              <Loader2 size={14} className="animate-spin" />
              STOP TRAINING
            </button>
          ) : (
            <button
              onClick={onTrain}
              className="bg-primary hover:bg-primary-dim text-on-primary px-6 py-2.5 font-black rounded-lg transition-all hover:shadow-[0_0_25px_rgba(129,236,255,0.3)] active:scale-95 uppercase tracking-widest text-xs flex items-center gap-2 whitespace-nowrap"
            >
              EXP3 : TRAIN MODEL
            </button>
          )}
        </div>
      </div>

      {/* Kaggle Notebook Modal */}
      {notebookOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={() => setNotebookOpen(false)}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="glass-panel rounded-2xl border border-outline/10 shadow-2xl w-full max-w-lg mx-4 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b border-outline/10">
              <h2 className="text-sm font-headline font-bold text-on-surface uppercase tracking-wider">
                Experiment 3 — Kaggle Notebook
              </h2>
              <button onClick={() => setNotebookOpen(false)} className="p-2 text-on-surface-variant/60 hover:text-on-surface-variant hover:bg-surface-container rounded-lg transition-all">
                <X size={18} />
              </button>
            </div>
            <div className="p-6 flex flex-col items-center justify-center gap-5">
              <div className="w-16 h-16 rounded-2xl bg-[#20beff]/10 border border-[#20beff]/20 flex items-center justify-center">
                <svg viewBox="0 0 24 24" className="w-8 h-8" fill="#20beff">
                  <path d="M18.825 23.859c-.022.092-.117.141-.281.141h-3.139c-.187 0-.351-.082-.492-.248l-5.178-6.589-1.448 1.374v5.111c0 .235-.117.352-.351.352H5.505c-.236 0-.354-.117-.354-.352V.353c0-.233.118-.353.354-.353h2.431c.234 0 .351.12.351.353v14.343l6.203-6.272c.165-.165.33-.246.495-.246h3.239c.144 0 .236.06.281.18.046.149.034.233-.07.352l-6.871 7.058 7.261 7.669c.093.117.117.2.07.282z"/>
                </svg>
              </div>
              <div className="text-center">
                <p className="text-on-surface text-base font-headline font-bold mb-1">Kaggle Notebook</p>
                <p className="text-on-surface-variant/60 text-xs font-body max-w-xs">
                  View the full training code, outputs, and visualizations for Experiment 3 on Kaggle.
                </p>
              </div>
              <div className="flex flex-wrap gap-2 justify-center">
                {['Python', 'PyTorch', 'CIFAR-10', 'GPU T4'].map((tag) => (
                  <span key={tag} className="px-3 py-1 rounded-full bg-[#20beff]/10 border border-[#20beff]/20 text-[10px] font-mono text-[#20beff] uppercase tracking-wider">
                    {tag}
                  </span>
                ))}
              </div>
              <a
                href="https://www.kaggle.com/code/ssimranjit302/experiment3"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 bg-[#20beff] hover:bg-[#18a8e6] text-white px-6 py-3 rounded-lg font-bold text-sm uppercase tracking-wide transition-all hover:shadow-[0_0_25px_rgba(32,190,255,0.3)] hover:scale-105 active:scale-95"
              >
                <ExternalLink size={16} />
                Open Notebook in Kaggle
              </a>
              <p className="text-[10px] text-on-surface-variant/30 font-mono">experiment3</p>
            </div>
          </motion.div>
        </motion.div>
      )}

      {plotData ? (
        <section className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-5">
          <DualLineChart
            data1={plotData.trainLoss} data2={plotData.valLoss}
            label1="Train Loss" label2="Val Loss"
            color1="#ff716c" color2="#ffb74d"
            title="Loss" yLabel="Loss"
            animDelay={0.1}
          />
          <DualLineChart
            data1={plotData.trainAcc} data2={plotData.valAcc}
            label1="Train Acc" label2="Val Acc"
            color1="#81ecff" color2="#4caf50"
            title="Accuracy" yLabel="Accuracy (%)"
            animDelay={0.2}
          />
          <SRPerLayerChart
            srPerLayer={plotData.srPerLayer}
            srSteps={plotData.srSteps}
            title="Stable Rank / Layer"
            animDelay={0.3}
          />
          <SROverallChart
            steps={plotData.srSteps}
            values={plotData.srOverall}
            title="Stable Rank / Steps"
            animDelay={0.4}
          />
        </section>
      ) : (
        <section className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-5">
          {['Loss', 'Accuracy', 'Stable Rank / Layer', 'Stable Rank / Steps'].map((label) => (
            <PlaceholderCard key={label} label={label} colorClass="text-primary" />
          ))}
        </section>
      )}

      {(hasResults || isTraining) && hyperparams && (
        <div className="glass-panel p-4 rounded-xl mb-2">
          <h3 className="text-[10px] uppercase font-bold text-outline tracking-widest mb-3">Hyperparameters</h3>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <div className="flex flex-col">
              <span className="text-[9px] uppercase tracking-wider text-on-surface-variant/50 mb-0.5">Embeddings</span>
              <span className="text-sm font-mono font-bold text-primary">{hyperparams.n_embd}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-[9px] uppercase tracking-wider text-on-surface-variant/50 mb-0.5">Heads</span>
              <span className="text-sm font-mono font-bold text-tertiary">{hyperparams.n_head}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-[9px] uppercase tracking-wider text-on-surface-variant/50 mb-0.5">Layers</span>
              <span className="text-sm font-mono font-bold text-secondary">{hyperparams.n_layer}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-[9px] uppercase tracking-wider text-on-surface-variant/50 mb-0.5">Learning Rate</span>
              <span className="text-sm font-mono font-bold text-[#ffb74d]">{hyperparams.learning_rate}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-[9px] uppercase tracking-wider text-on-surface-variant/50 mb-0.5">Epochs</span>
              <span className="text-sm font-mono font-bold text-[#a78bfa]">{hyperparams.epochs}</span>
            </div>
          </div>
        </div>
      )}

      {status === 'failed' && (
        <div className="glass-panel p-4 rounded-xl mb-2 border border-error/30">
          <p className="text-sm text-error font-body">Training failed. Check backend logs.</p>
        </div>
      )}

      {status === 'cancelled' && (
        <div className="glass-panel p-4 rounded-xl mb-2 border border-yellow-500/30">
          <p className="text-sm text-yellow-400 font-body">Training was stopped by user. Click "EXP3 : TRAIN MODEL" to start a new run.</p>
        </div>
      )}
    </motion.div>
  )
}

// ── Experiment 4 (dynamic / live) ──────────────────────────────
function Experiment4Block({ metrics, loading, status, progress, onTrain, onCancel, hyperparams }) {
  const hasResults = status === 'completed' && metrics
  const isTraining = status === 'training'
  const [notebookOpen, setNotebookOpen] = useState(false)

  const plotData = isTraining && progress ? {
    trainLoss: progress.trainLoss,
    valLoss: progress.valLoss,
    trainAcc: progress.trainAcc,
    valAcc: progress.valAcc,
    srPerLayer: progress.srPerLayer,
    srOverall: progress.srOverall,
    srSteps: progress.srSteps,
  } : hasResults ? metrics : null

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.75 }}
      className="col-span-12"
    >
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-baseline gap-4">
          <h2 className="text-xl font-headline font-bold text-primary uppercase tracking-wider">
            Experiment 4
          </h2>
          <p className="text-sm text-on-surface-variant font-body">
            {isTraining && progress
              ? `Training — Epoch ${progress.currentEpoch} / ${progress.totalEpochs}`
              : 'MTG-inspired attention: score-centering & variance-normalized with residuals.'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setNotebookOpen(true)}
            className="bg-[#20beff]/10 hover:bg-[#20beff]/20 text-[#20beff] border border-[#20beff]/20 px-4 py-2.5 font-black rounded-lg transition-all hover:shadow-[0_0_20px_rgba(32,190,255,0.15)] active:scale-95 uppercase tracking-widest text-xs flex items-center gap-2 whitespace-nowrap"
          >
            <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="#20beff">
              <path d="M18.825 23.859c-.022.092-.117.141-.281.141h-3.139c-.187 0-.351-.082-.492-.248l-5.178-6.589-1.448 1.374v5.111c0 .235-.117.352-.351.352H5.505c-.236 0-.354-.117-.354-.352V.353c0-.233.118-.353.354-.353h2.431c.234 0 .351.12.351.353v14.343l6.203-6.272c.165-.165.33-.246.495-.246h3.239c.144 0 .236.06.281.18.046.149.034.233-.07.352l-6.871 7.058 7.261 7.669c.093.117.117.2.07.282z"/>
            </svg>
            NOTEBOOK
          </button>
          {loading ? (
            <button
              onClick={onCancel}
              className="bg-error hover:bg-red-600 text-white px-6 py-2.5 font-black rounded-lg transition-all hover:shadow-[0_0_25px_rgba(255,113,108,0.3)] active:scale-95 uppercase tracking-widest text-xs flex items-center gap-2 whitespace-nowrap"
            >
              <Loader2 size={14} className="animate-spin" />
              STOP TRAINING
            </button>
          ) : (
            <button
              onClick={onTrain}
              className="bg-primary hover:bg-primary-dim text-on-primary px-6 py-2.5 font-black rounded-lg transition-all hover:shadow-[0_0_25px_rgba(129,236,255,0.3)] active:scale-95 uppercase tracking-widest text-xs flex items-center gap-2 whitespace-nowrap"
            >
              EXP4 : TRAIN MODEL
            </button>
          )}
        </div>
      </div>

      {/* Kaggle Notebook Modal */}
      {notebookOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={() => setNotebookOpen(false)}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="glass-panel rounded-2xl border border-outline/10 shadow-2xl w-full max-w-lg mx-4 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b border-outline/10">
              <h2 className="text-sm font-headline font-bold text-on-surface uppercase tracking-wider">
                Experiment 4 — Kaggle Notebook
              </h2>
              <button onClick={() => setNotebookOpen(false)} className="p-2 text-on-surface-variant/60 hover:text-on-surface-variant hover:bg-surface-container rounded-lg transition-all">
                <X size={18} />
              </button>
            </div>
            <div className="p-6 flex flex-col items-center justify-center gap-5">
              <div className="w-16 h-16 rounded-2xl bg-[#20beff]/10 border border-[#20beff]/20 flex items-center justify-center">
                <svg viewBox="0 0 24 24" className="w-8 h-8" fill="#20beff">
                  <path d="M18.825 23.859c-.022.092-.117.141-.281.141h-3.139c-.187 0-.351-.082-.492-.248l-5.178-6.589-1.448 1.374v5.111c0 .235-.117.352-.351.352H5.505c-.236 0-.354-.117-.354-.352V.353c0-.233.118-.353.354-.353h2.431c.234 0 .351.12.351.353v14.343l6.203-6.272c.165-.165.33-.246.495-.246h3.239c.144 0 .236.06.281.18.046.149.034.233-.07.352l-6.871 7.058 7.261 7.669c.093.117.117.2.07.282z"/>
                </svg>
              </div>
              <div className="text-center">
                <p className="text-on-surface text-base font-headline font-bold mb-1">Kaggle Notebook</p>
                <p className="text-on-surface-variant/60 text-xs font-body max-w-xs">
                  View the full training code, outputs, and visualizations for Experiment 4 on Kaggle.
                </p>
              </div>
              <div className="flex flex-wrap gap-2 justify-center">
                {['Python', 'PyTorch', 'CIFAR-10', 'GPU T4'].map((tag) => (
                  <span key={tag} className="px-3 py-1 rounded-full bg-[#20beff]/10 border border-[#20beff]/20 text-[10px] font-mono text-[#20beff] uppercase tracking-wider">
                    {tag}
                  </span>
                ))}
              </div>
              <a
                href="https://www.kaggle.com/code/ssimranjit302/experiment4"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 bg-[#20beff] hover:bg-[#18a8e6] text-white px-6 py-3 rounded-lg font-bold text-sm uppercase tracking-wide transition-all hover:shadow-[0_0_25px_rgba(32,190,255,0.3)] hover:scale-105 active:scale-95"
              >
                <ExternalLink size={16} />
                Open Notebook in Kaggle
              </a>
              <p className="text-[10px] text-on-surface-variant/30 font-mono">experiment4</p>
            </div>
          </motion.div>
        </motion.div>
      )}

      {plotData ? (
        <section className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-5">
          <DualLineChart
            data1={plotData.trainLoss} data2={plotData.valLoss}
            label1="Train Loss" label2="Val Loss"
            color1="#ff716c" color2="#ffb74d"
            title="Loss" yLabel="Loss"
            animDelay={0.1}
          />
          <DualLineChart
            data1={plotData.trainAcc} data2={plotData.valAcc}
            label1="Train Acc" label2="Val Acc"
            color1="#81ecff" color2="#4caf50"
            title="Accuracy" yLabel="Accuracy (%)"
            animDelay={0.2}
          />
          <SRPerLayerChart
            srPerLayer={plotData.srPerLayer}
            srSteps={plotData.srSteps}
            title="Stable Rank / Layer"
            animDelay={0.3}
          />
          <SROverallChart
            steps={plotData.srSteps}
            values={plotData.srOverall}
            title="Stable Rank / Steps"
            animDelay={0.4}
          />
        </section>
      ) : (
        <section className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-5">
          {['Loss', 'Accuracy', 'Stable Rank / Layer', 'Stable Rank / Steps'].map((label) => (
            <PlaceholderCard key={label} label={label} colorClass="text-primary" />
          ))}
        </section>
      )}

      {(hasResults || isTraining) && hyperparams && (
        <div className="glass-panel p-4 rounded-xl mb-2">
          <h3 className="text-[10px] uppercase font-bold text-outline tracking-widest mb-3">Hyperparameters</h3>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <div className="flex flex-col">
              <span className="text-[9px] uppercase tracking-wider text-on-surface-variant/50 mb-0.5">Embeddings</span>
              <span className="text-sm font-mono font-bold text-primary">{hyperparams.n_embd}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-[9px] uppercase tracking-wider text-on-surface-variant/50 mb-0.5">Heads</span>
              <span className="text-sm font-mono font-bold text-tertiary">{hyperparams.n_head}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-[9px] uppercase tracking-wider text-on-surface-variant/50 mb-0.5">Layers</span>
              <span className="text-sm font-mono font-bold text-secondary">{hyperparams.n_layer}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-[9px] uppercase tracking-wider text-on-surface-variant/50 mb-0.5">Learning Rate</span>
              <span className="text-sm font-mono font-bold text-[#ffb74d]">{hyperparams.learning_rate}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-[9px] uppercase tracking-wider text-on-surface-variant/50 mb-0.5">Epochs</span>
              <span className="text-sm font-mono font-bold text-[#a78bfa]">{hyperparams.epochs}</span>
            </div>
          </div>
        </div>
      )}

      {status === 'failed' && (
        <div className="glass-panel p-4 rounded-xl mb-2 border border-error/30">
          <p className="text-sm text-error font-body">Training failed. Check backend logs.</p>
        </div>
      )}

      {status === 'cancelled' && (
        <div className="glass-panel p-4 rounded-xl mb-2 border border-yellow-500/30">
          <p className="text-sm text-yellow-400 font-body">Training was stopped by user. Click "EXP4 : TRAIN MODEL" to start a new run.</p>
        </div>
      )}
    </motion.div>
  )
}

// ── Stable Rank SVG Chart ──────────────────────────────────────
const LAYER_COLORS = [
  'rgb(129, 236, 255)',  // cyan
  'rgb(170, 255, 220)',  // green
  'rgb(255, 183, 77)',   // orange
  'rgb(255, 113, 108)',  // red
  'rgb(167, 139, 250)',  // purple
  'rgb(255, 213, 79)',   // yellow
]

function StableRankChart({ data, title, animDelay = 0 }) {
  if (!data || !data.per_layer_sr) return null

  const width = 400
  const height = 220
  const pad = { top: 20, right: 16, bottom: 30, left: 45 }
  const chartW = width - pad.left - pad.right
  const chartH = height - pad.top - pad.bottom

  const numLayers = Object.keys(data.per_layer_sr).length
  const steps = data.sr_steps || []
  const numPoints = steps.length

  // Calculate y domain from all layers
  let allVals = []
  for (let i = 0; i < numLayers; i++) {
    const layerData = data.per_layer_sr[`layer_${i}`] || []
    allVals.push(...layerData)
  }
  const yMin = Math.floor(Math.min(...allVals) * 10) / 10
  const yMax = Math.ceil(Math.max(...allVals) * 10) / 10
  const yRange = yMax - yMin || 1

  const toX = (i) => pad.left + (numPoints > 1 ? (i / (numPoints - 1)) * chartW : chartW / 2)
  const toY = (v) => pad.top + chartH - ((v - yMin) / yRange) * chartH

  // Y-axis ticks
  const yTicks = []
  const tickStep = yRange <= 1 ? 0.2 : 0.5
  for (let v = yMin; v <= yMax + 0.01; v += tickStep) {
    yTicks.push(Math.round(v * 10) / 10)
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: animDelay }}
      className="glass-panel p-4 rounded-xl"
    >
      <h3 className="text-[11px] uppercase font-bold text-primary tracking-widest mb-3">{title}</h3>
      <svg width="100%" viewBox={`0 0 ${width} ${height}`} className="overflow-visible">
        {/* Grid lines */}
        {yTicks.map((v, i) => (
          <g key={i}>
            <line x1={pad.left} y1={toY(v)} x2={width - pad.right} y2={toY(v)} stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
            <text x={pad.left - 6} y={toY(v) + 3} textAnchor="end" fill="rgba(255,255,255,0.35)" fontSize="8" fontFamily="monospace">{v.toFixed(1)}</text>
          </g>
        ))}

        {/* X axis label */}
        <text x={pad.left + chartW / 2} y={height - 4} textAnchor="middle" fill="rgba(255,255,255,0.35)" fontSize="8" fontFamily="monospace">Training Steps</text>

        {/* Y axis label */}
        <text x={10} y={pad.top + chartH / 2} textAnchor="middle" fill="rgba(255,255,255,0.35)" fontSize="8" fontFamily="monospace" transform={`rotate(-90, 10, ${pad.top + chartH / 2})`}>Stable Rank</text>

        {/* Layer lines */}
        {Array.from({ length: numLayers }).map((_, layerIdx) => {
          const layerData = data.per_layer_sr[`layer_${layerIdx}`] || []
          const color = LAYER_COLORS[layerIdx % LAYER_COLORS.length]
          const pathD = layerData.map((v, i) => `${i === 0 ? 'M' : 'L'}${toX(i)},${toY(v)}`).join(' ')

          return (
            <motion.path
              key={layerIdx}
              d={pathD}
              fill="none"
              stroke={color}
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 1 }}
              transition={{ duration: 1.2, delay: animDelay + layerIdx * 0.15, ease: 'easeOut' }}
            />
          )
        })}
      </svg>

      {/* Legend */}
      <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2">
        {Array.from({ length: numLayers }).map((_, i) => (
          <div key={i} className="flex items-center gap-1">
            <div className="w-2.5 h-0.5 rounded-full" style={{ backgroundColor: LAYER_COLORS[i % LAYER_COLORS.length] }} />
            <span className="text-[9px] text-on-surface-variant/60 font-mono">L{i}</span>
          </div>
        ))}
      </div>
    </motion.div>
  )
}

// ── Experiment 5 (Stable Rank Analysis) ────────────────────────
function Experiment5Block({ data, loading, status, onRun }) {
  const hasResults = status === 'completed' && data

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.9 }}
      className="col-span-12"
    >
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-baseline gap-4">
          <h2 className="text-xl font-headline font-bold text-primary uppercase tracking-wider">
            Experiment 5
          </h2>
          <p className="text-sm text-on-surface-variant font-body">
            {loading
              ? 'Loading stable rank data...'
              : 'Stable rank per layer analysis across 4 attention mechanisms.'}
          </p>
        </div>
        <button
          onClick={onRun}
          disabled={loading}
          className={`${loading ? 'bg-primary/50 cursor-wait' : 'bg-primary hover:bg-primary-dim'} text-on-primary px-6 py-2.5 font-black rounded-lg transition-all hover:shadow-[0_0_25px_rgba(129,236,255,0.3)] active:scale-95 uppercase tracking-widest text-xs flex items-center gap-2 whitespace-nowrap`}
        >
          {loading && <Loader2 size={14} className="animate-spin" />}
          EXP5 : TRAIN MODEL
        </button>
      </div>

      {loading && !hasResults && (
        <div className="glass-panel p-8 rounded-xl flex items-center justify-center">
          <Loader2 size={20} className="text-primary/60 animate-spin" />
          <span className="text-sm text-on-surface-variant/50 ml-3 font-body">Fetching stable rank data...</span>
        </div>
      )}

      {hasResults && (
        <AnimatePresence>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-5">
            <StableRankChart data={data.vanilla} title="Vanilla Attention" animDelay={0.1} />
            <StableRankChart data={data.residual} title="Residual Attention" animDelay={0.25} />
            <StableRankChart data={data.differential} title="Differential Attention" animDelay={0.4} />
            <StableRankChart data={data.mind_the_gap} title="Mind the Gap Attention" animDelay={0.55} />
          </div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.8 }}
            className="glass-panel p-4 rounded-xl mb-2"
          >
            <h3 className="text-[10px] uppercase font-bold text-outline tracking-widest mb-2">Summary</h3>
            <p className="text-sm text-on-surface-variant font-body leading-relaxed">
              Stable rank analysis across 4 attention mechanisms (6 layers, 5 epochs, CIFAR-10).
              Vanilla attention collapses to rank ~1.0 in deeper layers (signal death).
              Residual connections maintain moderate rank (~1.2–1.7).
              Differential attention achieves higher diversity (~1.5–1.9).
              Mind the Gap shows the highest stable rank (~2.0–2.7), indicating the richest signal propagation.
            </p>
          </motion.div>
        </AnimatePresence>
      )}

      {!loading && !hasResults && status === 'idle' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-5">
          {['Vanilla Attention', 'Residual Attention', 'Differential Attention', 'Mind the Gap Attention'].map((label) => (
            <div key={label} className="glass-panel p-4 rounded-xl">
              <h3 className="text-[11px] uppercase font-bold text-primary/40 tracking-widest mb-3">{label}</h3>
              <div className="h-[180px] flex items-center justify-center">
                <span className="text-xs text-on-surface-variant/40 font-body italic">Click "EXP5 : TRAIN MODEL" to plot</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {status === 'failed' && (
        <div className="glass-panel p-4 rounded-xl mb-2 border border-error/30">
          <p className="text-sm text-error font-body">Failed to load stable rank data. Check backend logs.</p>
        </div>
      )}
    </motion.div>
  )
}

// ── Main Section ───────────────────────────────────────────────
function MetricsSection({
  exp1Metrics, exp1Loading, exp1Status, exp1Progress, onTrainExp1, onCancelExp1, exp1Hyperparams,
  exp2Metrics, exp2Loading, exp2Status, exp2Progress, onTrainExp2, onCancelExp2, exp2Hyperparams,
  exp3Metrics, exp3Loading, exp3Status, exp3Progress, onTrainExp3, onCancelExp3, exp3Hyperparams,
  exp4Metrics, exp4Loading, exp4Status, exp4Progress, onTrainExp4, onCancelExp4, exp4Hyperparams,
  exp5Data, exp5Loading, exp5Status, onRunExp5,
}) {
  return (
    <div className="col-span-12 space-y-8">
      <Experiment1Block
        metrics={exp1Metrics}
        loading={exp1Loading}
        status={exp1Status}
        progress={exp1Progress}
        onTrain={onTrainExp1}
        onCancel={onCancelExp1}
        hyperparams={exp1Hyperparams}
      />
      <Experiment2Block
        metrics={exp2Metrics}
        loading={exp2Loading}
        status={exp2Status}
        progress={exp2Progress}
        onTrain={onTrainExp2}
        onCancel={onCancelExp2}
        hyperparams={exp2Hyperparams}
      />
      <Experiment3Block
        metrics={exp3Metrics}
        loading={exp3Loading}
        status={exp3Status}
        progress={exp3Progress}
        onTrain={onTrainExp3}
        onCancel={onCancelExp3}
        hyperparams={exp3Hyperparams}
      />
      <Experiment4Block
        metrics={exp4Metrics}
        loading={exp4Loading}
        status={exp4Status}
        progress={exp4Progress}
        onTrain={onTrainExp4}
        onCancel={onCancelExp4}
        hyperparams={exp4Hyperparams}
      />
      <Experiment5Block
        data={exp5Data}
        loading={exp5Loading}
        status={exp5Status}
        onRun={onRunExp5}
      />
    </div>
  )
}

export default MetricsSection

