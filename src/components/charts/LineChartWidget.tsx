import { useId } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Area, AreaChart } from 'recharts'
import { motion } from 'framer-motion'
import { usePlatform } from '@/hooks/usePlatform'

interface DataItem {
  [key: string]: string | number
}

interface LineConfig {
  key: string
  color?: string
  label?: string
}

interface Props {
  title: string
  subtitle?: string
  data: DataItem[]
  lines: LineConfig[]
  height?: number
  className?: string
  referenceLine?: { value: number; label: string }
  filled?: boolean
}

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
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: i > 0 ? '4px' : 0 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: p.color, boxShadow: `0 0 6px ${p.color}` }} />
          <span style={{ color: p.color, fontSize: '14px', fontWeight: '700', letterSpacing: '-0.02em' }}>{p.value}</span>
          {payload.length > 1 && <span style={{ color: 'var(--text-muted)', fontSize: '11px' }}>{p.name}</span>}
        </div>
      ))}
    </div>
  )
}

export function LineChartWidget({
  title, subtitle, data, lines, height = 200, className = '', referenceLine, filled = false
}: Props) {
  const { config } = usePlatform()
  const uid = useId().replace(/:/g, '')
  const filterId = `lglow-${uid}`
  const gradId = `lfill-${uid}`

  const primaryColor = lines[0]?.color ?? config.colors.primary
  const secondaryColor = lines[1]?.color ?? '#EF4444'

  // Use AreaChart when filled=true (score history uses this)
  const useFill = filled || lines.length === 1

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: 'easeOut' }}
      className={`rounded-xl p-5 relative overflow-hidden ${className}`}
      style={{
        background: `radial-gradient(ellipse at 80% 0%, ${primaryColor}0D 0%, var(--bg-elevated) 60%)`,
        border: `1px solid ${primaryColor}2A`,
        boxShadow: `0 0 40px rgba(0,0,0,0.35), 0 0 0 1px var(--border-subtle), inset 0 1px 0 ${primaryColor}1A`,
      }}
    >
      {/* Top accent line */}
      <div style={{
        position: 'absolute', top: 0, left: '10%', right: '10%', height: '1px',
        background: `linear-gradient(90deg, transparent, ${primaryColor}88, transparent)`,
      }} />

      <div className="mb-5">
        <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>{title}</h3>
        {subtitle && <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{subtitle}</p>}
      </div>

      <ResponsiveContainer width="100%" height={height}>
        {useFill ? (
          <AreaChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
            <defs>
              <filter id={filterId} x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
              <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={primaryColor} stopOpacity={0.4} />
                <stop offset="50%" stopColor={primaryColor} stopOpacity={0.12} />
                <stop offset="100%" stopColor={primaryColor} stopOpacity={0} />
              </linearGradient>
              <linearGradient id={`line-${gradId}`} x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor={config.colors.secondary} />
                <stop offset="100%" stopColor={primaryColor} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="4 8" stroke="rgba(255,255,255,0.04)" vertical={false} />
            <XAxis dataKey="time" tick={{ fill: 'var(--text-muted)', fontSize: 10 }} axisLine={false} tickLine={false} interval="preserveStartEnd" tickMargin={8} />
            <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 10 }} axisLine={false} tickLine={false} tickMargin={4} />
            <Tooltip content={(props) => <ChartTooltip {...props} accentColor={primaryColor} />} cursor={{ stroke: `${primaryColor}33`, strokeWidth: 1, strokeDasharray: '4 4' }} />
            {referenceLine && (
              <ReferenceLine
                y={referenceLine.value}
                stroke="#EAB308"
                strokeWidth={1.5}
                strokeDasharray="6 4"
                label={{ value: referenceLine.label, fill: '#EAB308', fontSize: 10, position: 'insideTopRight', fontWeight: 600 }}
              />
            )}
            <Area
              type="monotone"
              dataKey={lines[0].key}
              name={lines[0].label ?? lines[0].key}
              stroke={`url(#line-${gradId})`}
              strokeWidth={2.5}
              fill={`url(#${gradId})`}
              dot={false}
              activeDot={{ r: 5, fill: primaryColor, stroke: 'var(--bg-elevated)', strokeWidth: 2, style: { filter: `drop-shadow(0 0 6px ${primaryColor})` } }}
              filter={`url(#${filterId})`}
              isAnimationActive={true}
              animationDuration={1200}
              animationEasing="ease-out"
            />
            {lines.slice(1).map((line, i) => {
              const lc = line.color ?? (i === 0 ? secondaryColor : '#22C55E')
              return (
                <Area
                  key={line.key}
                  type="monotone"
                  dataKey={line.key}
                  name={line.label ?? line.key}
                  stroke={lc}
                  strokeWidth={2}
                  fill="none"
                  dot={false}
                  activeDot={{ r: 4, fill: lc, stroke: 'var(--bg-elevated)', strokeWidth: 2, style: { filter: `drop-shadow(0 0 5px ${lc})` } }}
                  isAnimationActive={true}
                  animationDuration={1400}
                  animationEasing="ease-out"
                />
              )
            })}
          </AreaChart>
        ) : (
          <LineChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
            <defs>
              <filter id={filterId} x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
              {lines.map((line, i) => {
                const lc = line.color ?? (i === 0 ? primaryColor : secondaryColor)
                return (
                  <linearGradient key={`lg-${i}`} id={`linegrad-${uid}-${i}`} x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor={lc} stopOpacity={0.7} />
                    <stop offset="100%" stopColor={lc} />
                  </linearGradient>
                )
              })}
            </defs>
            <CartesianGrid strokeDasharray="4 8" stroke="rgba(255,255,255,0.04)" vertical={false} />
            <XAxis dataKey="time" tick={{ fill: 'var(--text-muted)', fontSize: 10 }} axisLine={false} tickLine={false} interval="preserveStartEnd" tickMargin={8} />
            <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 10 }} axisLine={false} tickLine={false} tickMargin={4} />
            <Tooltip content={(props) => <ChartTooltip {...props} accentColor={primaryColor} />} cursor={{ stroke: `${primaryColor}33`, strokeWidth: 1, strokeDasharray: '4 4' }} />
            {referenceLine && (
              <ReferenceLine
                y={referenceLine.value}
                stroke="#EAB308"
                strokeWidth={1.5}
                strokeDasharray="6 4"
                label={{ value: referenceLine.label, fill: '#EAB308', fontSize: 10, position: 'insideTopRight', fontWeight: 600 }}
              />
            )}
            {lines.map((line, i) => {
              const lc = line.color ?? (i === 0 ? primaryColor : secondaryColor)
              return (
                <Line
                  key={line.key}
                  type="monotone"
                  dataKey={line.key}
                  name={line.label ?? line.key}
                  stroke={lc}
                  strokeWidth={i === 0 ? 2.5 : 2}
                  dot={false}
                  activeDot={{ r: 5, fill: lc, stroke: 'var(--bg-elevated)', strokeWidth: 2, style: { filter: `drop-shadow(0 0 6px ${lc})` } }}
                  filter={i === 0 ? `url(#${filterId})` : undefined}
                  isAnimationActive={true}
                  animationDuration={1200 + i * 200}
                  animationEasing="ease-out"
                />
              )
            })}
          </LineChart>
        )}
      </ResponsiveContainer>
    </motion.div>
  )
}
