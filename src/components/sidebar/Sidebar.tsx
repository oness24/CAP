import { ChevronLeft, ChevronRight } from 'lucide-react'
import { motion } from 'framer-motion'
import { useUIStore } from '@/store/uiStore'
import { usePlatform } from '@/hooks/usePlatform'
import { PlatformSwitcher } from './PlatformSwitcher'

export function Sidebar() {
  const { sidebarCollapsed, toggleSidebar } = useUIStore()
  const { config } = usePlatform()

  const width = sidebarCollapsed ? 64 : 240

  return (
    <motion.aside
      animate={{ width }}
      transition={{ duration: 0.25, ease: 'easeInOut' }}
      className="relative flex flex-col flex-shrink-0 overflow-hidden h-full select-none"
      style={{
        background: 'var(--bg-surface)',
        borderRight: '1px solid var(--border-default)',
      }}
    >
      {/* Subtle gradient overlay using platform accent */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: config.colors.gradient, opacity: 0.04 }}
      />

      {/* Accordion: platform list + inline nav items */}
      <div className="relative flex-1 overflow-y-auto overflow-x-hidden">
        <PlatformSwitcher collapsed={sidebarCollapsed} />
      </div>

      {/* Collapse toggle */}
      <button
        onClick={toggleSidebar}
        className="absolute bottom-4 -right-3 w-6 h-6 rounded-full flex items-center justify-center z-10 transition-colors"
        style={{
          background: 'var(--bg-overlay)',
          border: '1px solid var(--border-strong)',
          color: 'var(--text-muted)',
        }}
        onMouseEnter={(e) => {
          const el = e.currentTarget as HTMLElement
          el.style.borderColor = 'var(--accent-primary)'
          el.style.color = 'var(--accent-primary)'
        }}
        onMouseLeave={(e) => {
          const el = e.currentTarget as HTMLElement
          el.style.borderColor = 'var(--border-strong)'
          el.style.color = 'var(--text-muted)'
        }}
      >
        {sidebarCollapsed ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
      </button>
    </motion.aside>
  )
}
