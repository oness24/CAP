import { useId } from 'react'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { motion } from 'framer-motion'
import { usePlatform } from '@/hooks/usePlatform'

interface Props {
  title: string
  subtitle?: string
  data: Record<string, string | number>[]
  dataKey?: string
  height?: number
  className?: string
  gradient?: boolean
  secondKey?: string
  secondLabel?: string
}

// Custom glass-style tooltip
function ChartTooltip({ active, payload, label, accentColor }: {
  active?: boolean
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  payload?: Array<any>
  label?: string
  accentColor: string
}) {
  if (!active || !payload?.length) return null
  return (
    <div style={{
      background: 'rgba(11, 18, 35, 0.92)',
      backdropFilter: 'blur(12px)',
      border: `1px solid ${accentColor}44`,
      borderRadius: '10px',
      padding: '10px 14px',
      boxShadow: `0 8px 32px rgba(0,0,0,0.5), 0 0 0 1px ${accentColor}22`,
    }}>
      <p style={{ color: 'var(--text-muted)', fontSize: '11px', marginBottom: '6px', letterSpacing: '0.05em' }}>{label}</p>
      {payload.map((p, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: p.color, boxShadow: `0 0 6px ${p.color}` }} />
          <span style={{ color: p.color, fontSize: '14px', fontWeight: '700', letterSpacing: '-0.02em' }}>{p.value}</span>
          <span style={{ color: 'var(--text-muted)', fontSize: '11px' }}>{p.name !== p.color ? p.name : ''}</span>
        </div>
      ))}
    </div>
  )
}

export function AreaChartWidget({
  title, subtitle, data, dataKey = 'value', height = 200, className = '', gradient = true, secondKey, secondLabel
}: Props) {
  const { config } = usePlatform()
  const color = config.colors.primary
  const uid = useId().replace(/:/g, '')
  const gradId = `ag-${uid}`
  const gradId2 = `ag2-${uid}`
  const filterId = `glow-${uid}`
  const filterId2 = `glow2-${uid}`

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: 'easeOut' }}
      className={`rounded-xl p-5 relative overflow-hidden ${className}`}
      style={{
        background: `radial-gradient(ellipse at 20% 0%, ${color}0D 0%, var(--bg-elevated) 60%)`,
        border: `1px solid ${color}2A`,
        boxShadow: `0 0 40px rgba(0,0,0,0.35), 0 0 0 1px var(--border-subtle), inset 0 1px 0 ${color}1A`,
      }}
    >
      {/* Top accent line */}
      <div style={{
        position: 'absolute', top: 0, left: '10%', right: '10%', height: '1px',
        background: `linear-gradient(90deg, transparent, ${color}88, transparent)`,
      }} />

      <div className="mb-5 flex items-start justify-between">
        <div>
          <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>{title}</h3>
          {subtitle && <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{subtitle}</p>}
        </div>
        {/* Live indicator */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '3px 8px', borderRadius: '20px', background: `${color}18`, border: `1px solid ${color}33` }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: color, boxShadow: `0 0 8px ${color}`, display: 'inline-block', animation: 'pulse 2s infinite' }} />
          <span style={{ fontSize: '10px', color: color, fontWeight: 600, letterSpacing: '0.05em' }}>LIVE</span>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={height}>
        <AreaChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
          <defs>
            {/* SVG glow filter for the line */}
            <filter id={filterId} x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            {secondKey && (
              <filter id={filterId2} x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            )}
            {/* Area gradient fill */}
            {gradient && (
              <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={color} stopOpacity={0.45} />
                <stop offset="40%" stopColor={color} stopOpacity={0.18} />
                <stop offset="100%" stopColor={color} stopOpacity={0} />
              </linearGradient>
            )}
            {secondKey && (
              <linearGradient id={gradId2} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#EF4444" stopOpacity={0.4} />
                <stop offset="40%" stopColor="#EF4444" stopOpacity={0.15} />
                <stop offset="100%" stopColor="#EF4444" stopOpacity={0} />
              </linearGradient>
            )}
            {/* Line gradient (left to right vibrance) */}
            <linearGradient id={`line-${gradId}`} x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor={config.colors.secondary} />
              <stop offset="100%" stopColor={color} />
            </linearGradient>
          </defs>

          <CartesianGrid
            strokeDasharray="4 8"
            stroke="rgba(255,255,255,0.04)"
            vertical={false}
          />
          <XAxis
            dataKey="time"
            tick={{ fill: 'var(--text-muted)', fontSize: 10, fontFamily: 'Inter, sans-serif' }}
            axisLine={false}
            tickLine={false}
            interval="preserveStartEnd"
            tickMargin={8}
          />
          <YAxis
            tick={{ fill: 'var(--text-muted)', fontSize: 10, fontFamily: 'Inter, sans-serif' }}
            axisLine={false}
            tickLine={false}
            tickMargin={4}
          />
          <Tooltip
            content={(props) => <ChartTooltip {...props} accentColor={color} />}
            cursor={{ stroke: `${color}33`, strokeWidth: 1, strokeDasharray: '4 4' }}
          />

          <Area
            type="monotone"
            dataKey={dataKey}
            stroke={`url(#line-${gradId})`}
            strokeWidth={2.5}
            fill={gradient ? `url(#${gradId})` : 'none'}
            dot={false}
            activeDot={{
              r: 5,
              fill: color,
              stroke: 'var(--bg-elevated)',
              strokeWidth: 2,
              style: { filter: `drop-shadow(0 0 6px ${color})` },
            }}
            filter={`url(#${filterId})`}
            isAnimationActive={true}
            animationDuration={1200}
            animationEasing="ease-out"
          />

          {secondKey && (
            <Area
              type="monotone"
              dataKey={secondKey}
              name={secondLabel ?? secondKey}
              stroke="#EF4444"
              strokeWidth={2}
              fill={`url(#${gradId2})`}
              dot={false}
              activeDot={{
                r: 4,
                fill: '#EF4444',
                stroke: 'var(--bg-elevated)',
                strokeWidth: 2,
                style: { filter: 'drop-shadow(0 0 5px #EF4444)' },
              }}
              filter={`url(#${filterId2})`}
              isAnimationActive={true}
              animationDuration={1400}
              animationEasing="ease-out"
            />
          )}
        </AreaChart>
      </ResponsiveContainer>
    </motion.div>
  )
}
