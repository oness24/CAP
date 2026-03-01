import { clsx } from 'clsx'
import type { PlatformConfig } from '@/types'

interface Props {
  platform: PlatformConfig
  isActive: boolean
  onSelect: () => void
  collapsed?: boolean
}

export function PlatformSwitcherItem({ platform, isActive, onSelect, collapsed }: Props) {
  const Logo = platform.Logo

  return (
    <button
      onClick={onSelect}
      className={clsx(
        'w-full flex items-center rounded-lg text-left transition-all duration-150',
        collapsed ? 'justify-center p-2' : 'gap-3 px-3 py-2',
        isActive ? 'text-white' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
      )}
      style={{
        background: isActive ? platform.colors.primary + '20' : 'transparent',
        borderLeft: collapsed ? 'none' : isActive ? `3px solid ${platform.colors.primary}` : '3px solid transparent',
      }}
      onMouseEnter={(e) => {
        if (!isActive) (e.currentTarget as HTMLElement).style.background = 'var(--bg-overlay)'
      }}
      onMouseLeave={(e) => {
        if (!isActive) (e.currentTarget as HTMLElement).style.background = 'transparent'
      }}
    >
      <Logo size={collapsed ? 20 : 18} className="flex-shrink-0" />
      {!collapsed && (
        <>
          <div className="flex flex-col min-w-0 flex-1">
            <span className="text-xs font-semibold truncate" style={{ color: isActive ? 'var(--text-primary)' : 'inherit' }}>
              {platform.name}
            </span>
            <span className="text-[10px] truncate" style={{ color: 'var(--text-muted)' }}>
              {platform.category.split(' ').slice(-1)[0]}
            </span>
          </div>
          {isActive && (
            <div
              className="w-1.5 h-1.5 rounded-full flex-shrink-0"
              style={{ background: platform.colors.primary }}
            />
          )}
        </>
      )}
    </button>
  )
}
