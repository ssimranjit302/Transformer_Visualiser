import React from 'react'
import { motion } from 'framer-motion'
import { SlidersHorizontal } from 'lucide-react'

function HyperparameterPanel({ hyperparams, setHyperparams, loading }) {
  const update = (key, value) => {
    setHyperparams((prev) => ({ ...prev, [key]: value }))
  }

  const computePercent = 66

  return (
    <motion.section
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.3 }}
      className="col-span-12 lg:col-span-4 glass-panel p-6 rounded-xl flex flex-col gap-6"
    >
      <div className="flex items-center gap-2 text-primary">
        <SlidersHorizontal size={18} />
        <h2 className="font-headline font-bold uppercase tracking-wider text-sm">Hyperparameters</h2>
      </div>

      <div className="space-y-4">
        <div className="space-y-1.5">
          <label className="text-[10px] uppercase font-bold text-outline tracking-widest">Dataset</label>
          <select
            value={hyperparams.dataset}
            onChange={(e) => update('dataset', e.target.value)}
            disabled={loading}
            className="w-full bg-surface-container-lowest border border-outline-variant/20 rounded px-3 py-2 text-sm focus:border-primary/50 focus:ring-0 focus:outline-none text-on-surface"
          >
            <option>CIFAR10</option>
          </select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-[10px] uppercase font-bold text-outline tracking-widest">n_embd</label>
            <select
              value={hyperparams.n_embd}
              onChange={(e) => update('n_embd', Number(e.target.value))}
              disabled={loading}
              className="w-full bg-surface-container-lowest border border-outline-variant/20 rounded px-3 py-2 text-sm text-on-surface focus:border-primary/50 focus:ring-0 focus:outline-none"
            >
              <option value={128}>128</option>
              <option value={256}>256</option>
              <option value={512}>512</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] uppercase font-bold text-outline tracking-widest">n_head</label>
            <input
              type="number"
              value={hyperparams.n_head}
              onChange={(e) => update('n_head', Number(e.target.value))}
              disabled={loading}
              className="w-full bg-surface-container-lowest border border-outline-variant/20 rounded px-3 py-2 text-sm text-on-surface focus:border-primary/50 focus:ring-0 focus:outline-none"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {[
            { key: 'n_layer', label: 'n_layer', type: 'number' },
            { key: 'epochs', label: 'Epochs', type: 'number' },
          ].map(({ key, label, type }) => (
            <div key={key} className="space-y-1.5">
              <label className="text-[10px] uppercase font-bold text-outline tracking-widest">{label}</label>
              <input
                type={type}
                value={hyperparams[key]}
                onChange={(e) => update(key, type === 'number' ? Number(e.target.value) : e.target.value)}
                disabled={loading}
                className="w-full bg-surface-container-lowest border border-outline-variant/20 rounded px-3 py-2 text-sm text-on-surface focus:border-primary/50 focus:ring-0 focus:outline-none"
              />
            </div>
          ))}
        </div>

        <div className="space-y-1.5">
          <label className="text-[10px] uppercase font-bold text-outline tracking-widest">Learning Rate</label>
          <select
            value={hyperparams.learning_rate}
            onChange={(e) => update('learning_rate', e.target.value)}
            disabled={loading}
            className="w-full bg-surface-container-lowest border border-outline-variant/20 rounded px-3 py-2 text-sm text-on-surface focus:border-primary/50 focus:ring-0 focus:outline-none"
          >
            <option value="3e-4">3e-4</option>
            <option value="1e-3">1e-3</option>
            <option value="1e-4">1e-4</option>
          </select>
        </div>
      </div>

      <div className="mt-auto pt-6 border-t border-outline-variant/10">
        <div className="flex items-center justify-between text-xs mb-2">
          <span className="text-outline">Estimated Compute</span>
          <span className="text-tertiary">14.2 TFLOPs</span>
        </div>
        <div className="w-full h-1 bg-surface-container rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${computePercent}%` }}
            transition={{ duration: 1.5, delay: 0.8, ease: 'easeOut' }}
            className="h-full bg-tertiary"
          />
        </div>
      </div>
    </motion.section>
  )
}

export default HyperparameterPanel
