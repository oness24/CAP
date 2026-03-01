import { NavLink } from 'react-router-dom'
import { Tooltip } from '@/components/ui/Tooltip'
import type { NavItem as NavItemType } from '@/types'

const BADGE_STYLES: Record<string, { bg: string; color: string }> = {
  blue:   { bg: 'rgba(37,99,235,0.25)',   color: '#60A5FA' },
  green:  { bg: 'rgba(22,163,74,0.25)',   color: '#34D399' },
  orange: { bg: 'rgba(234,88,12,0.25)',   color: '#FB923C' },
  red:    { bg: 'rgba(220,38,38,0.25)',   color: '#F87171' },
}

interface Props {
  item: NavItemType
  collapsed: boolean
}

export function NavItem({ item, collapsed }: Props) {
  const Icon = item.icon
  const badgeStyle = item.badge ? BADGE_STYLES[item.badge.variant] : null

  const link = (
    <NavLink
      to={item.path}
      className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150"
      style={({ isActive }) => ({
        color: isActive ? 'var(--text-primary)' : 'var(--text-muted)',
        background: isActive ? 'rgba(29,106,229,0.18)' : 'transparent',
      })}
    >
      {({ isActive }) => (
        <>
          <Icon
            size={16}
            className="flex-shrink-0 transition-colors duration-150"
            style={{ color: isActive ? 'var(--accent-primary)' : 'inherit' }}
          />
          {!collapsed && (
            <>
              <span className="truncate flex-1">{item.label}</span>
              {item.badge && badgeStyle && (
                <span
                  className="ml-auto text-[10px] font-semibold px-1.5 py-0.5 rounded-full flex-shrink-0"
                  style={{ background: badgeStyle.bg, color: badgeStyle.color }}
                >
                  {item.badge.text}
                </span>
              )}
            </>
          )}
        </>
      )}
    </NavLink>
  )

  if (collapsed) {
    return (
      <Tooltip content={item.label} side="right">
        {link}
      </Tooltip>
    )
  }

  return link
}
