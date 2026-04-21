import React, { useCallback, useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import useEmblaCarousel from 'embla-carousel-react'
import { GitBranch, ChevronLeft, ChevronRight } from 'lucide-react'

const BLOCK_COLORS = {
  norm: '#faf0ca',
  feedForward: '#90e0ef',
  attention: '#fb8500',
}

function EncoderBlock({ index, total, inView }) {
  const opacity = index <= 2 ? 1 : Math.max(0.15, 1 - (index - 2) * 0.25)

  return (
    <motion.div
      initial={{ opacity: 0, x: 40 }}
      animate={inView ? { opacity: 1, x: 0 } : {}}
      transition={{ duration: 0.4, delay: index * 0.1 }}
      style={{ opacity }}
      className="flex-shrink-0 w-44 space-y-2 group"
    >
      <div className="text-[11px] font-black text-center text-on-surface-variant/60 group-hover:text-primary transition-colors tracking-widest font-headline">
        BLOCK L-0{index + 1}
      </div>
      <motion.div
        whileHover={{ scale: 1.05, y: -4 }}
        className="flex flex-col gap-1 p-2 bg-surface-container-high rounded-lg border border-outline-variant/10 cursor-pointer"
      >
        <div
          className="h-6 flex items-center justify-center text-[10px] font-bold rounded-sm"
          style={{ backgroundColor: BLOCK_COLORS.norm, color: '#192540' }}
        >
          Add &amp; Norm
        </div>
        <div
          className="h-6 flex items-center justify-center text-[10px] font-bold rounded-sm"
          style={{ backgroundColor: BLOCK_COLORS.feedForward, color: '#192540' }}
        >
          Feed Forward
        </div>
        <div
          className="h-12 flex items-center justify-center text-[10px] font-bold rounded-sm text-center px-2"
          style={{ backgroundColor: BLOCK_COLORS.attention, color: '#192540' }}
        >
          Multi-Head Attention
        </div>
      </motion.div>
    </motion.div>
  )
}

const HEAD_ACCENTS = [
  { gradient: 'from-[#81ecff]/20 to-[#81ecff]/5', border: 'border-[#81ecff]/40', glow: 'rgba(129,236,255,0.3)', text: 'text-[#81ecff]' },
  { gradient: 'from-[#a68cff]/20 to-[#a68cff]/5', border: 'border-[#a68cff]/40', glow: 'rgba(166,140,255,0.3)', text: 'text-[#a68cff]' },
  { gradient: 'from-[#00edb4]/20 to-[#00edb4]/5', border: 'border-[#00edb4]/40', glow: 'rgba(0,237,180,0.3)', text: 'text-[#00edb4]' },
  { gradient: 'from-[#fb8500]/20 to-[#fb8500]/5', border: 'border-[#fb8500]/40', glow: 'rgba(251,133,0,0.3)', text: 'text-[#fb8500]' },
]

function AttentionHead({ label, index, delay }) {
  const accent = HEAD_ACCENTS[index % HEAD_ACCENTS.length]
  return (
    <motion.div
      initial={{ opacity: 0, y: 20, rotateX: 30 }}
      animate={{ opacity: 1, y: 0, rotateX: 0 }}
      transition={{ duration: 0.5, delay, ease: 'easeOut' }}
      whileHover={{
        scale: 1.1,
        y: -6,
        boxShadow: `0 0 24px ${accent.glow}, 0 0 48px ${accent.glow}`,
      }}
      className={`relative h-20 bg-gradient-to-b ${accent.gradient} ${accent.border} border rounded-lg flex flex-col items-center justify-center cursor-pointer overflow-hidden group`}
    >
      <div className="absolute inset-0 bg-gradient-to-t from-transparent via-white/[0.03] to-white/[0.06] pointer-events-none" />
      <span className={`text-xs font-black tracking-wider ${accent.text} relative z-10`}>{label}</span>
      <div className="mt-1 flex gap-0.5 relative z-10">
        {Array.from({ length: 3 }).map((_, i) => (
          <motion.div
            key={i}
            className={`w-1 h-1 rounded-full`}
            style={{ backgroundColor: accent.glow.replace('0.3', '0.6') }}
            animate={{ opacity: [0.3, 1, 0.3] }}
            transition={{ duration: 1.5, delay: delay + i * 0.2, repeat: Infinity }}
          />
        ))}
      </div>
    </motion.div>
  )
}

function ArchitectureVisualization({ hyperparams }) {
  const [emblaRef, emblaApi] = useEmblaCarousel({
    align: 'start',
    dragFree: true,
    containScroll: 'trimSnaps',
    loop: false,
  })
  const [canScrollPrev, setCanScrollPrev] = useState(false)
  const [canScrollNext, setCanScrollNext] = useState(false)
  const [inView, setInView] = useState(false)
  const sectionRef = useRef(null)

  const numBlocks = hyperparams.n_layer || 6
  const numHeads = hyperparams.n_head || 4

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setInView(true)
      },
      { threshold: 0.2 }
    )
    if (sectionRef.current) observer.observe(sectionRef.current)
    return () => observer.disconnect()
  }, [])

  const updateScrollButtons = useCallback(() => {
    if (!emblaApi) return
    setCanScrollPrev(emblaApi.canScrollPrev())
    setCanScrollNext(emblaApi.canScrollNext())
  }, [emblaApi])

  useEffect(() => {
    if (!emblaApi) return
    updateScrollButtons()
    emblaApi.on('select', updateScrollButtons)
    emblaApi.on('reInit', updateScrollButtons)
    return () => {
      emblaApi.off('select', updateScrollButtons)
      emblaApi.off('reInit', updateScrollButtons)
    }
  }, [emblaApi, updateScrollButtons])

  const scrollPrev = () => emblaApi && emblaApi.scrollPrev()
  const scrollNext = () => emblaApi && emblaApi.scrollNext()

  return (
    <motion.section
      ref={sectionRef}
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.4 }}
      className="col-span-12 lg:col-span-8 glass-panel p-6 rounded-xl flex flex-col gap-8 overflow-hidden"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-secondary">
          <GitBranch size={18} />
          <h2 className="font-headline font-bold uppercase tracking-wider text-sm">ViT Architecture</h2>
        </div>
        <div className="flex gap-3">
          <span className="text-[10px] text-outline flex items-center gap-1">
            <span className="w-2 h-2 rounded-sm" style={{ backgroundColor: BLOCK_COLORS.norm }} /> Norm
          </span>
          <span className="text-[10px] text-outline flex items-center gap-1">
            <span className="w-2 h-2 rounded-sm" style={{ backgroundColor: BLOCK_COLORS.feedForward }} /> Feed Forward
          </span>
          <span className="text-[10px] text-outline flex items-center gap-1">
            <span className="w-2 h-2 rounded-sm" style={{ backgroundColor: BLOCK_COLORS.attention }} /> Attention
          </span>
        </div>
      </div>

      <div className="relative flex flex-col items-center gap-12 py-4">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5 }}
          whileHover={{ scale: 1.03, boxShadow: '0 0 30px rgba(166,140,255,0.35)' }}
          className="w-64 h-24 bg-secondary rounded-lg flex flex-col items-center justify-center text-on-secondary shadow-[0_0_20px_rgba(166,140,255,0.2)] relative cursor-pointer"
        >
          <span className="text-xs font-black uppercase tracking-tighter mb-1">Classification Stage</span>
          <span className="text-base font-headline font-bold uppercase">MLP Classification Head</span>
        </motion.div>

        <div className="grid grid-cols-4 gap-4 w-full max-w-2xl px-4 relative">
          {Array.from({ length: numHeads }, (_, i) => (
            <AttentionHead key={i} label={`HEAD 0${i + 1}`} index={i} delay={0.5 + i * 0.1} />
          ))}
        </div>

        <div className="w-full relative">
          <div className="absolute left-0 top-1/2 -translate-y-1/2 z-10">
            {canScrollPrev && (
              <motion.button
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={scrollPrev}
                className="w-8 h-8 bg-surface-container-high/90 border border-outline-variant/30 rounded-full flex items-center justify-center text-on-surface-variant hover:text-primary transition-colors backdrop-blur-sm"
              >
                <ChevronLeft size={16} />
              </motion.button>
            )}
          </div>
          <div className="absolute right-0 top-1/2 -translate-y-1/2 z-10">
            {canScrollNext && (
              <motion.button
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={scrollNext}
                className="w-8 h-8 bg-surface-container-high/90 border border-outline-variant/30 rounded-full flex items-center justify-center text-on-surface-variant hover:text-primary transition-colors backdrop-blur-sm"
              >
                <ChevronRight size={16} />
              </motion.button>
            )}
          </div>

          <div className="overflow-hidden scrollbar-hide" ref={emblaRef}>
            <div className="flex gap-4 pb-4">
              {Array.from({ length: numBlocks }, (_, i) => (
                <EncoderBlock key={i} index={i} total={numBlocks} inView={inView} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </motion.section>
  )
}

export default ArchitectureVisualization
