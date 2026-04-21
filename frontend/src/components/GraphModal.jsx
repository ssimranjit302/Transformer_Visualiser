import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, ExternalLink } from 'lucide-react'

const DEFAULT_KAGGLE_LINK = 'https://www.kaggle.com/code/ssimranjit302/experiment1'


function EnlargedTrainingLoss({ value }) {
  const barHeights = [80, 70, 65, 50, 45, 30, 25, 20]
  return (
    <div className="glass-panel p-6 rounded-xl h-full">
      <div className="flex justify-between items-start mb-6">
        <span className="text-xs uppercase font-bold text-outline tracking-widest">Training Loss</span>
        <span className="text-sm text-primary font-mono">{value}</span>
      </div>
      <div className="h-64 flex items-end gap-2">
        {barHeights.map((h, i) => (
          <motion.div
            key={i}
            initial={{ height: 0 }}
            animate={{ height: `${h}%` }}
            transition={{ duration: 0.6, delay: 0.1 + i * 0.05, ease: 'easeOut' }}
            whileHover={{ backgroundColor: 'rgb(129, 236, 255)' }}
            className="bg-primary/20 transition-colors flex-1 rounded-t-sm"
          />
        ))}
      </div>
    </div>
  )
}

function EnlargedTop1Accuracy({ value }) {
  const points = [
    [0, 40], [10, 35], [20, 38], [30, 30], [40, 25],
    [50, 28], [60, 18], [70, 15], [80, 12], [90, 10], [100, 8],
  ]
  const pathD = points.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x},${y}`).join(' ')
  const areaD = `${pathD} L100,40 L0,40 Z`

  return (
    <div className="glass-panel p-6 rounded-xl h-full">
      <div className="flex justify-between items-start mb-6">
        <span className="text-xs uppercase font-bold text-outline tracking-widest">Top-1 Accuracy</span>
        <span className="text-sm text-tertiary font-mono">{value}%</span>
      </div>
      <div className="h-64 relative overflow-hidden">
        <svg className="w-full h-full stroke-tertiary fill-tertiary/5 stroke-2" viewBox="0 0 100 40">
          <motion.path
            d={areaD}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1, delay: 0.2 }}
          />
          <motion.path
            d={pathD}
            fill="none"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 1.5, delay: 0.2, ease: 'easeOut' }}
          />
        </svg>
      </div>
    </div>
  )
}



function EnlargedValError({ value }) {
  const bars = [60, 55, 48, 42]
  return (
    <div className="glass-panel p-6 rounded-xl h-full">
      <div className="flex justify-between items-start mb-6">
        <span className="text-xs uppercase font-bold text-outline tracking-widest">Val Error</span>
        <span className="text-sm text-error font-mono">{value}%</span>
      </div>
      <div className="h-64 grid grid-cols-4 items-end gap-3">
        {bars.map((h, i) => (
          <motion.div
            key={i}
            initial={{ height: 0 }}
            animate={{ height: `${h}%` }}
            transition={{ duration: 0.5, delay: 0.2 + i * 0.1, ease: 'easeOut' }}
            className="bg-error/10 border-t-2 border-error rounded-t-sm"
          />
        ))}
      </div>
    </div>
  )
}

const enlargedComponents = {
  trainingLoss: EnlargedTrainingLoss,
  top1Accuracy: EnlargedTop1Accuracy,
  valError: EnlargedValError,
}

function GraphModal({ isOpen, onClose, graphType, graphValue, experimentTitle, notebookUrl }) {
  const kaggleLink = notebookUrl || DEFAULT_KAGGLE_LINK
  const kaggleEmbedUrl = kaggleLink.replace('/code/', '/code/embed/') + '?kernelSessionId=0'
  const EnlargedGraph = enlargedComponents[graphType]

  if (!EnlargedGraph) return null

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-8"
          onClick={onClose}
        >
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 30 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            onClick={(e) => e.stopPropagation()}
            className="relative z-10 w-full max-w-6xl max-h-[90vh] glass-panel rounded-2xl overflow-hidden flex flex-col"
          >
            <div className="flex items-center justify-between p-4 border-b border-[#40485d]/15">
              <div>
                <h2 className="text-sm font-headline font-bold text-primary uppercase tracking-wider">
                  {experimentTitle}
                </h2>
                <p className="text-xs text-on-surface-variant mt-0.5">
                  {graphType === 'trainingLoss' && 'Training Loss Analysis'}
                  {graphType === 'top1Accuracy' && 'Top-1 Accuracy Analysis'}
                  {graphType === 'valError' && 'Validation Error Analysis'}
                </p>
              </div>
              <button
                onClick={onClose}
                className="p-2 text-on-surface-variant/60 hover:text-on-surface-variant hover:bg-surface-container rounded-lg transition-all"
              >
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 md:p-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-[10px] uppercase font-bold text-outline tracking-widest mb-3">
                    Enlarged View
                  </h3>
                  <EnlargedGraph value={graphValue} />
                </div>

                <div className="flex flex-col min-h-0">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-[10px] uppercase font-bold text-outline tracking-widest">
                      Kaggle Notebook
                    </h3>
                    <a
                      href={kaggleLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 text-xs text-[#20beff] hover:text-[#18a8e6] transition-colors"
                    >
                      <ExternalLink size={12} />
                      Open in Kaggle
                    </a>
                  </div>

                  <div className="glass-panel rounded-xl overflow-hidden flex-1 min-h-[400px] lg:min-h-0 relative bg-[#0a0e1a] flex flex-col items-center justify-center gap-6 p-8">
                    {/* Kaggle K logo */}
                    <div className="w-20 h-20 rounded-2xl bg-[#20beff]/10 border border-[#20beff]/20 flex items-center justify-center">
                      <svg viewBox="0 0 24 24" className="w-10 h-10" fill="#20beff">
                        <path d="M18.825 23.859c-.022.092-.117.141-.281.141h-3.139c-.187 0-.351-.082-.492-.248l-5.178-6.589-1.448 1.374v5.111c0 .235-.117.352-.351.352H5.505c-.236 0-.354-.117-.354-.352V.353c0-.233.118-.353.354-.353h2.431c.234 0 .351.12.351.353v14.343l6.203-6.272c.165-.165.33-.246.495-.246h3.239c.144 0 .236.06.281.18.046.149.034.233-.07.352l-6.871 7.058 7.261 7.669c.093.117.117.2.07.282z"/>
                      </svg>
                    </div>

                    <div className="text-center">
                      <p className="text-on-surface text-base font-headline font-bold mb-1">
                        Kaggle Notebook
                      </p>
                      <p className="text-on-surface-variant/60 text-xs font-body max-w-xs">
                        View the full training code, outputs, and visualizations for this experiment on Kaggle.
                      </p>
                    </div>

                    {/* Notebook info pills */}
                    <div className="flex flex-wrap gap-2 justify-center">
                      {['Python', 'PyTorch', 'CIFAR-10', 'GPU T4'].map((tag) => (
                        <span key={tag} className="px-3 py-1 rounded-full bg-[#20beff]/10 border border-[#20beff]/20 text-[10px] font-mono text-[#20beff] uppercase tracking-wider">
                          {tag}
                        </span>
                      ))}
                    </div>

                    <a
                      href={kaggleLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 bg-[#20beff] hover:bg-[#18a8e6] text-white px-6 py-3 rounded-lg font-bold text-sm uppercase tracking-wide transition-all hover:shadow-[0_0_25px_rgba(32,190,255,0.3)] hover:scale-105 active:scale-95"
                    >
                      <ExternalLink size={16} />
                      Open Notebook in Kaggle
                    </a>

                    <p className="text-[10px] text-on-surface-variant/30 font-mono">
                      {kaggleLink.split('/').pop()}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export default GraphModal
