import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { clsx } from 'clsx'

interface MetricCardProps {
  title: string
  value: string | number
  trend?: number
  icon?: LucideIcon
  accentGlow?: boolean
  trendLabel?: string
  className?: string
}

export function MetricCard({ title, value, trend, icon: Icon, accentGlow = true, trendLabel, className }: MetricCardProps) {
  const trendPositive = trend !== undefined && trend > 0
  const trendNeutral = trend === undefined || trend === 0

  const trendColor = trendNeutral ? 'var(--text-muted)' : trendPositive ? 'var(--status-low)' : 'var(--status-critical)'
  const TrendIcon = trendNeutral ? Minus : trendPositive ? TrendingUp : TrendingDown

  return (
    <div
      className={clsx(
        'group relative rounded-xl p-4 flex flex-col gap-3 transition-all duration-300 cursor-default overflow-hidden',
        className
      )}
      style={{
        background: 'linear-gradient(145deg, var(--bg-elevated) 0%, var(--bg-overlay) 100%)',
        border: '1px solid var(--border-default)',
        boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
      }}
      onMouseEnter={(e) => {
        if (accentGlow) {
          (e.currentTarget as HTMLElement).style.boxShadow = '0 0 0 1px var(--accent-primary), 0 4px 32px var(--accent-glow), 0 4px 20px rgba(0,0,0,0.3)'
          ;(e.currentTarget as HTMLElement).style.borderColor = 'var(--accent-primary)'
        }
      }}
      onMouseLeave={(e) => {
        ;(e.currentTarget as HTMLElement).style.boxShadow = '0 4px 20px rgba(0,0,0,0.3)'
        ;(e.currentTarget as HTMLElement).style.borderColor = 'var(--border-default)'
      }}
    >
      {/* Top accent line */}
      <div
        className="absolute top-0 left-0 right-0 h-[2px] rounded-t-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"
        style={{ background: 'var(--accent-gradient)' }}
      />

      <div className="flex items-center justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
          {title}
        </span>
        {Icon && (
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{
              background: 'rgba(99,155,230,0.12)',
              border: '1px solid rgba(99,155,230,0.18)',
            }}
          >
            <Icon size={15} style={{ color: 'var(--accent-secondary)' }} />
          </div>
        )}
      </div>

      <div className="flex items-end justify-between gap-2">
        <span className="text-2xl font-bold tracking-tight leading-none" style={{ color: 'var(--text-primary)' }}>
          {value}
        </span>
        {trend !== undefined && (
          <div className="flex items-center gap-1 text-xs font-semibold mb-0.5 flex-shrink-0" style={{ color: trendColor }}>
            <TrendIcon size={13} />
            <span>{Math.abs(trend)}{trendLabel ?? ''}</span>
          </div>
        )}
      </div>
    </div>
  )
}
