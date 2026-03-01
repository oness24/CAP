import { useId } from 'react'
import { RadarChart, PolarGrid, PolarAngleAxis, Radar, ResponsiveContainer, Tooltip } from 'recharts'
import { motion } from 'framer-motion'
import { usePlatform } from '@/hooks/usePlatform'

interface DataItem {
  framework: string
  score: number
}

interface Props {
  title: string
  subtitle?: string
  data: DataItem[]
  height?: number
  className?: string
}

function ChartTooltip({ active, payload, accentColor }: {
  active?: boolean
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  payload?: Array<any>
  accentColor: string
}) {
  if (!active || !payload?.length) return null
  const val = payload[0]?.value
  return (
    <div style={{
      background: 'rgba(11, 18, 35, 0.92)',
      backdropFilter: 'blur(12px)',
      border: `1px solid ${accentColor}44`,
      borderRadius: '10px',
      padding: '8px 12px',
      boxShadow: `0 8px 32px rgba(0,0,0,0.5)`,
    }}>
      <span style={{ color: accentColor, fontSize: '16px', fontWeight: '700' }}>{val}</span>
      <span style={{ color: 'var(--text-muted)', fontSize: '10px', marginLeft: '4px' }}>/ 100</span>
    </div>
  )
}

export function RadarChartWidget({ title, subtitle, data, height = 220, className = '' }: Props) {
  const { config } = usePlatform()
  const color = config.colors.primary
  const uid = useId().replace(/:/g, '')
  const gradId = `radar-fill-${uid}`
  const filterId = `radar-glow-${uid}`

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      className={`rounded-xl p-5 relative overflow-hidden ${className}`}
      style={{
        background: `radial-gradient(ellipse at 50% 50%, ${color}0D 0%, var(--bg-elevated) 70%)`,
        border: `1px solid ${color}2A`,
        boxShadow: `0 0 40px rgba(0,0,0,0.35), 0 0 0 1px var(--border-subtle)`,
      }}
    >
      {/* Top accent line */}
      <div style={{
        position: 'absolute', top: 0, left: '10%', right: '10%', height: '1px',
        background: `linear-gradient(90deg, transparent, ${color}66, transparent)`,
      }} />

      <div className="mb-4">
        <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>{title}</h3>
        {subtitle && <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{subtitle}</p>}
      </div>

      <ResponsiveContainer width="100%" height={height}>
        <RadarChart data={data} margin={{ top: 8, right: 24, left: 24, bottom: 8 }}>
          <defs>
            <filter id={filterId} x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <radialGradient id={gradId} cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor={color} stopOpacity={0.35} />
              <stop offset="100%" stopColor={color} stopOpacity={0.05} />
            </radialGradient>
          </defs>

          <PolarGrid
            stroke="rgba(255,255,255,0.06)"
            gridType="polygon"
          />
          <PolarAngleAxis
            dataKey="framework"
            tick={{ fill: 'var(--text-secondary)', fontSize: 10, fontWeight: 500 }}
          />
          <Radar
            name="Score"
            dataKey="score"
            stroke={color}
            strokeWidth={2}
            fill={`url(#${gradId})`}
            fillOpacity={1}
            dot={{ fill: color, r: 3, strokeWidth: 0, style: { filter: `drop-shadow(0 0 4px ${color})` } }}
            activeDot={{ r: 5, fill: color, strokeWidth: 0, style: { filter: `drop-shadow(0 0 8px ${color})` } }}
            filter={`url(#${filterId})`}
            isAnimationActive={true}
            animationDuration={900}
            animationEasing="ease-out"
          />
          <Tooltip content={(props) => <ChartTooltip {...props} accentColor={color} />} />
        </RadarChart>
      </ResponsiveContainer>

      {/* Score summary row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '12px', borderTop: '1px solid var(--border-subtle)' }}>
        {data.map((item) => (
          <div key={item.framework} style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '14px', fontWeight: 700, color: color }}>{item.score}</div>
            <div style={{ fontSize: '9px', color: 'var(--text-muted)', letterSpacing: '0.04em', marginTop: '2px' }}>{item.framework.split('-')[0]}</div>
          </div>
        ))}
      </div>
    </motion.div>
  )
}
