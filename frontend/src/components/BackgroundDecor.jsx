import React from 'react'
import { motion } from 'framer-motion'

function BackgroundDecor() {
  return (
    <div className="fixed top-0 left-0 w-full h-full pointer-events-none -z-10 overflow-hidden">
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 2, ease: 'easeOut' }}
        className="absolute top-[10%] right-[15%] w-[40rem] h-[40rem] bg-primary/5 blur-[120px] rounded-full"
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 2, delay: 0.5, ease: 'easeOut' }}
        className="absolute bottom-[5%] left-[5%] w-[30rem] h-[30rem] bg-secondary/5 blur-[100px] rounded-full"
      />
    </div>
  )
}

export default BackgroundDecor
