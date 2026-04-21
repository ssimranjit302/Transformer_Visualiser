import React from 'react'
import { motion } from 'framer-motion'
import { Eye, Type, Rocket } from 'lucide-react'

function SideNav({ activeNav, setActiveNav, user }) {
  const navItems = [
    { id: 'vision', label: 'Vision Models', Icon: Eye },
    { id: 'text', label: 'Text Models', Icon: Type },
  ]



  return (
    <motion.aside
      initial={{ x: -256, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ duration: 0.5, delay: 0.2, ease: 'easeOut' }}
      className="fixed left-0 top-0 h-full w-64 bg-gradient-to-b from-[#091328] to-[#060e20] border-r border-[#40485d]/15 hidden md:flex flex-col pt-20 pb-6 px-4 gap-y-4"
    >
      <div className="mb-4 px-2">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-full bg-surface-container-highest border border-primary/20 flex items-center justify-center overflow-hidden">
            <span className="text-primary font-bold text-sm uppercase">
              {user?.username?.charAt(0) || 'U'}
            </span>
          </div>
          <div>
            <div className="font-headline font-black text-[#81ecff] text-sm">{user?.username || 'User'}</div>
            <div className="text-[10px] text-tertiary uppercase flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-tertiary animate-pulse" />
              Training Active
            </div>
          </div>
        </div>
      </div>

      <nav className="flex-1 space-y-1">
        {navItems.map(({ id, label, Icon }) => (
          <motion.div
            key={id}
            whileHover={{ x: 4 }}
            onClick={() => setActiveNav(id)}
            className={`cursor-pointer px-4 py-3 flex items-center gap-3 transition-colors duration-200 ${
              activeNav === id
                ? 'bg-[#192540] text-[#81ecff] border-r-4 border-[#81ecff] shadow-[0px_0px_15px_rgba(129,236,255,0.1)]'
                : 'text-[#dee5ff]/40 hover:text-[#dee5ff]/80 hover:bg-[#091328]'
            }`}
          >
            <Icon size={18} />
            <span className="font-body text-sm antialiased font-medium">{label}</span>
          </motion.div>
        ))}
      </nav>

      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.95 }}
        className="mt-auto w-full py-3 bg-primary text-on-primary font-bold rounded-md hover:opacity-90 transition-all text-xs uppercase tracking-widest flex items-center justify-center gap-2"
      >
        <Rocket size={14} />
        Deploy Model
      </motion.button>

    </motion.aside>
  )
}

export default SideNav
