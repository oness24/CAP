import { useId } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { motion } from 'framer-motion'
import { usePlatform } from '@/hooks/usePlatform'

interface DataItem {
  [key: string]: string | number
}

interface Props {
  title: string
  subtitle?: string
  data: DataItem[]
  dataKey: string
  labelKey: string
  height?: number
  className?: string
  layout?: 'vertical' | 'horizontal'
  colorMap?: Record<string, string>
}

function ChartTooltip({ active, payload, label, accentColor }: {
  active?: boolean
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  payload?: Array<any>
  label?: string
  accentColor: string
}) {
  if (!active || !payload?.length) return null
  const p = payload[0]
  return (
    <div style={{
      background: 'rgba(11, 18, 35, 0.92)',
      backdropFilter: 'blur(12px)',
      border: `1px solid ${accentColor}44`,
      borderRadius: '10px',
      padding: '10px 14px',
      boxShadow: `0 8px 32px rgba(0,0,0,0.5), 0 0 0 1px ${accentColor}22`,
    }}>
      <p style={{ color: 'var(--text-muted)', fontSize: '11px', marginBottom: '4px' }}>{label}</p>
      <span style={{ color: p.color, fontSize: '16px', fontWeight: '700', letterSpacing: '-0.02em' }}>{p.value}</span>
    </div>
  )
}

export function BarChartWidget({
  title, subtitle, data, dataKey, labelKey, height = 200, className = '', layout = 'horizontal', colorMap
}: Props) {
  const { config } = usePlatform()
  const color = config.colors.primary
  const uid = useId().replace(/:/g, '')

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: 'easeOut' }}
      className={`rounded-xl p-5 relative overflow-hidden ${className}`}
      style={{
        background: `radial-gradient(ellipse at 50% 100%, ${color}0A 0%, var(--bg-elevated) 65%)`,
        border: `1px solid ${color}2A`,
        boxShadow: `0 0 40px rgba(0,0,0,0.35), 0 0 0 1px var(--border-subtle), inset 0 1px 0 ${color}1A`,
      }}
    >
      {/* Top accent line */}
      <div style={{
        position: 'absolute', top: 0, left: '10%', right: '10%', height: '1px',
        background: `linear-gradient(90deg, transparent, ${color}66, transparent)`,
      }} />

      <div className="mb-5">
        <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>{title}</h3>
        {subtitle && <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{subtitle}</p>}
      </div>

      <ResponsiveContainer width="100%" height={height}>
        {layout === 'horizontal' ? (
          <BarChart data={data} margin={{ top: 4, right: 8, left: -16, bottom: 0 }} barCategoryGap="28%">
            <defs>
              {data.map((entry, i) => {
                const c = colorMap?.[String(entry[labelKey])] ?? color
                return (
                  <linearGradient key={`${uid}-hg-${i}`} id={`${uid}-hg-${i}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={c} stopOpacity={1} />
                    <stop offset="100%" stopColor={c} stopOpacity={0.5} />
                  </linearGradient>
                )
              })}
            </defs>
            <CartesianGrid strokeDasharray="4 8" stroke="rgba(255,255,255,0.04)" vertical={false} />
            <XAxis dataKey={labelKey} tick={{ fill: 'var(--text-muted)', fontSize: 10 }} axisLine={false} tickLine={false} tickMargin={8} />
            <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 10 }} axisLine={false} tickLine={false} tickMargin={4} />
            <Tooltip content={(props) => <ChartTooltip {...props} accentColor={color} />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
            <Bar dataKey={dataKey} radius={[5, 5, 0, 0]} maxBarSize={48} isAnimationActive={true} animationDuration={800} animationEasing="ease-out">
              {data.map((entry, i) => {
                const c = colorMap?.[String(entry[labelKey])] ?? color
                return <Cell key={i} fill={`url(#${uid}-hg-${i})`} stroke={`${c}44`} strokeWidth={0.5} style={{ filter: `drop-shadow(0 2px 6px ${c}44)` }} />
              })}
            </Bar>
          </BarChart>
        ) : (
          <BarChart layout="vertical" data={data} margin={{ top: 4, right: 16, left: 4, bottom: 0 }} barCategoryGap="28%">
            <defs>
              {data.map((entry, i) => {
                const c = colorMap?.[String(entry[labelKey])] ?? color
                return (
                  <linearGradient key={`${uid}-vg-${i}`} id={`${uid}-vg-${i}`} x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor={c} stopOpacity={0.6} />
                    <stop offset="100%" stopColor={c} stopOpacity={1} />
                  </linearGradient>
                )
              })}
            </defs>
            <CartesianGrid strokeDasharray="4 8" stroke="rgba(255,255,255,0.04)" horizontal={false} />
            <XAxis type="number" tick={{ fill: 'var(--text-muted)', fontSize: 10 }} axisLine={false} tickLine={false} tickMargin={4} />
            <YAxis type="category" dataKey={labelKey} tick={{ fill: 'var(--text-muted)', fontSize: 10 }} axisLine={false} tickLine={false} width={110} />
            <Tooltip content={(props) => <ChartTooltip {...props} accentColor={color} />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
            <Bar dataKey={dataKey} radius={[0, 5, 5, 0]} maxBarSize={28} isAnimationActive={true} animationDuration={800} animationEasing="ease-out">
              {data.map((entry, i) => {
                const c = colorMap?.[String(entry[labelKey])] ?? color
                return <Cell key={i} fill={`url(#${uid}-vg-${i})`} stroke={`${c}44`} strokeWidth={0.5} style={{ filter: `drop-shadow(2px 0 6px ${c}44)` }} />
              })}
            </Bar>
          </BarChart>
        )}
      </ResponsiveContainer>
    </motion.div>
  )
}
