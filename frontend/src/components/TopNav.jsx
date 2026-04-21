import React, { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { User, LogOut, ChevronDown } from 'lucide-react'

function TopNav({ user, onLogout }) {
  const [showDropdown, setShowDropdown] = useState(false)
  const dropdownRef = useRef(null)


  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <motion.nav
      initial={{ y: -64, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      className="fixed top-0 w-full z-50 bg-[#091328]/80 backdrop-blur-xl border-b border-[#40485d]/15 shadow-[0px_0px_20px_rgba(129,236,255,0.05)] flex justify-between items-center px-6 h-16"
    >
      <div className="flex items-center gap-8">
        <span className="text-xl font-bold text-[#81ecff] tracking-tighter font-headline uppercase">
          Synthetic Observer
        </span>
      </div>
      <div className="flex items-center gap-4">

        {user && (
          <div className="relative" ref={dropdownRef}>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowDropdown(!showDropdown)}
              className="flex items-center gap-2 py-1.5 px-3 text-[#dee5ff]/60 hover:bg-[#192540] rounded-lg transition-all"
            >
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold uppercase ${
                user.role === 'admin'
                  ? 'bg-secondary/20 text-secondary'
                  : 'bg-primary/20 text-primary'
              }`}>
                {user.role === 'admin' ? 'A' : 'U'}
              </div>
              <span className="text-sm text-[#dee5ff]/80 hidden sm:inline capitalize">{user.role}</span>
              <ChevronDown size={14} className={`text-[#dee5ff]/40 transition-transform ${showDropdown ? 'rotate-180' : ''}`} />
            </motion.button>

            <AnimatePresence>
              {showDropdown && (
                <motion.div
                  initial={{ opacity: 0, y: -8, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -8, scale: 0.95 }}
                  transition={{ duration: 0.15 }}
                  className="absolute right-0 top-full mt-2 w-56 glass-panel rounded-xl overflow-hidden shadow-[0_0_30px_rgba(0,0,0,0.4)]"
                >
                  <div className="p-3 border-b border-[#40485d]/15">
                    <p className="text-sm font-medium text-on-surface capitalize">{user.role}</p>
                    <p className="text-xs text-on-surface-variant">Signed in</p>
                  </div>
                  <button
                    onClick={onLogout}
                    className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-error/80 hover:bg-error/10 hover:text-error transition-colors"
                  >
                    <LogOut size={16} />
                    Sign Out
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>
    </motion.nav>
  )
}

export default TopNav
