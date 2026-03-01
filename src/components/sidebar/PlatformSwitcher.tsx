import { useState, useEffect } from 'react'
import { ChevronDown, FileText } from 'lucide-react'
import { NavLink, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { usePlatform } from '@/hooks/usePlatform'
import { PLATFORM_LIST, PLATFORM_REGISTRY } from '@/constants/platforms'
import { Tooltip } from '@/components/ui/Tooltip'
import { NavItem } from './NavItem'
import type { PlatformId } from '@/types'

interface Props {
  collapsed: boolean
}

export function PlatformSwitcher({ collapsed }: Props) {
  const { activePlatform, switchPlatform } = usePlatform()
  const navigate = useNavigate()
  const [expandedId, setExpandedId] = useState<PlatformId | null>(activePlatform)

  // Auto-expand when active platform changes externally
  useEffect(() => {
    setExpandedId(activePlatform)
  }, [activePlatform])

  function handlePlatformClick(id: PlatformId) {
    if (id !== activePlatform) {
      switchPlatform(id)
      navigate(PLATFORM_REGISTRY[id].defaultRoute)
      setExpandedId(id)
    } else {
      // Toggle the active platform's dropdown
      setExpandedId(prev => (prev === id ? null : id))
    }
  }

  return (
    <div className="px-3 py-3 flex flex-col gap-0.5">
      {collapsed ? (
        <Tooltip content="Resumo Executivo" side="right">
          <NavLink
            to="/executive-summary"
            className="w-full flex items-center justify-center rounded-lg transition-all duration-150"
            style={({ isActive }) => ({
              padding: '8px',
              background: isActive ? 'rgba(168,85,247,0.16)' : 'transparent',
              border: isActive ? '1px solid rgba(192,132,252,0.35)' : '1px solid transparent',
            })}
          >
            {({ isActive }) => (
              <FileText size={20} style={{ color: isActive ? '#C084FC' : 'var(--text-muted)' }} />
            )}
          </NavLink>
        </Tooltip>
      ) : (
        <NavLink
          to="/executive-summary"
          className="w-full flex items-center gap-3 rounded-lg transition-all duration-150"
          style={({ isActive }) => ({
            padding: '8px 10px',
            background: isActive ? 'rgba(168,85,247,0.16)' : 'transparent',
            borderLeft: isActive ? '3px solid #A855F7' : '3px solid transparent',
            border: isActive ? '1px solid rgba(192,132,252,0.3)' : '1px solid transparent',
          })}
          onMouseEnter={(e) => {
            const isActive = (e.currentTarget as HTMLElement).getAttribute('aria-current') === 'page'
            if (!isActive) (e.currentTarget as HTMLElement).style.background = 'var(--bg-overlay)'
          }}
          onMouseLeave={(e) => {
            const isActive = (e.currentTarget as HTMLElement).getAttribute('aria-current') === 'page'
            if (!isActive) (e.currentTarget as HTMLElement).style.background = 'transparent'
          }}
        >
          {({ isActive }) => (
            <>
              <FileText size={18} style={{ color: isActive ? '#C084FC' : 'var(--text-muted)' }} />
              <div className="flex flex-col min-w-0 flex-1 text-left">
                <span className="text-xs font-semibold truncate" style={{ color: isActive ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                  Resumo Executivo
                </span>
                <span className="text-[10px] truncate" style={{ color: 'var(--text-muted)' }}>
                  CAP Global
                </span>
              </div>
            </>
          )}
        </NavLink>
      )}

      <div className="my-1 h-px" style={{ background: 'var(--border-subtle)' }} />

      {!collapsed && (
        <span
          className="text-[10px] uppercase tracking-wider font-medium px-2 pb-1.5 block"
          style={{ color: 'var(--text-muted)' }}
        >
          Switch Platform
        </span>
      )}

      {PLATFORM_LIST.map((platform) => {
        const isActive    = activePlatform === platform.id
        const isExpanded  = !collapsed && expandedId === platform.id
        const Logo        = platform.Logo

        const headerBtn = (
          <button
            onClick={() => handlePlatformClick(platform.id)}
            className="w-full flex items-center rounded-lg transition-all duration-150"
            style={{
              gap: collapsed ? undefined : 10,
              padding: collapsed ? '8px' : '8px 10px',
              justifyContent: collapsed ? 'center' : undefined,
              background: isActive ? platform.colors.primary + '18' : 'transparent',
              borderLeft: collapsed ? 'none' : isActive
                ? `3px solid ${platform.colors.primary}`
                : '3px solid transparent',
              border: isActive ? `1px solid ${platform.colors.primary}44` : '1px solid transparent',
              boxShadow: isActive ? 'var(--shadow-soft)' : 'none',
            }}
            onMouseEnter={(e) => {
              if (!isActive) {
                const el = e.currentTarget as HTMLElement
                el.style.background = 'rgba(255,255,255,0.03)'
                el.style.borderColor = 'var(--border-subtle)'
              }
            }}
            onMouseLeave={(e) => {
              if (!isActive) {
                const el = e.currentTarget as HTMLElement
                el.style.background = 'transparent'
                el.style.borderColor = 'transparent'
              }
            }}
          >
            <span
              className="flex-shrink-0"
              style={{ color: isActive ? platform.colors.primary : 'var(--text-muted)' }}
            >
              <Logo size={collapsed ? 20 : 18} className="flex-shrink-0" />
            </span>
            {!collapsed && (
              <>
                <div className="flex flex-col min-w-0 flex-1 text-left">
                  <span
                    className="text-xs font-semibold truncate"
                    style={{ color: isActive ? 'var(--text-primary)' : 'var(--text-muted)' }}
                  >
                    {platform.name}
                  </span>
                  <span className="text-[10px] truncate" style={{ color: 'var(--text-muted)' }}>
                    {platform.category.split(' ').slice(-1)[0]}
                  </span>
                </div>
                <ChevronDown
                  size={13}
                  className="flex-shrink-0 transition-transform duration-200"
                  style={{
                    color: 'var(--text-muted)',
                    transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                  }}
                />
              </>
            )}
          </button>
        )

        return (
          <div key={platform.id}>
            {collapsed ? (
              <Tooltip content={platform.name} side="right">
                {headerBtn}
              </Tooltip>
            ) : headerBtn}

            {/* Expandable nav items */}
            <AnimatePresence initial={false}>
              {isExpanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2, ease: 'easeInOut' }}
                  className="overflow-hidden"
                >
                  <div className="flex flex-col gap-0.5 pl-3 pr-1 pt-0.5 pb-1.5">
                    {platform.nav.map((navItem) => (
                      <NavItem key={navItem.id} item={navItem} collapsed={false} />
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )
      })}
    </div>
  )
}
