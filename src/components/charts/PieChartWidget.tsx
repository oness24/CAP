import { useId } from 'react'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'
import { motion } from 'framer-motion'
import { usePlatform } from '@/hooks/usePlatform'

interface DataItem {
  name: string
  value: number
  color: string
  total?: number
}

interface Props {
  title: string
  subtitle?: string
  data: DataItem[]
  height?: number
  className?: string
  innerRadius?: number
}

function ChartTooltip({ active, payload }: {
  active?: boolean
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  payload?: Array<any>
}) {
  if (!active || !payload?.length) return null
  const p = payload[0]
  const item = p.payload as DataItem
  const pct = item.total ? Math.round((item.value / item.total) * 100) : null
  return (
    <div style={{
      background: 'rgba(11, 18, 35, 0.92)',
      backdropFilter: 'blur(12px)',
      border: `1px solid ${item.color}44`,
      borderRadius: '10px',
      padding: '10px 14px',
      boxShadow: `0 8px 32px rgba(0,0,0,0.5), 0 0 0 1px ${item.color}22`,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <div style={{ width: 8, height: 8, borderRadius: '50%', background: item.color, boxShadow: `0 0 8px ${item.color}` }} />
        <span style={{ color: 'var(--text-secondary)', fontSize: '11px' }}>{item.name}</span>
      </div>
      <span style={{ color: item.color, fontSize: '18px', fontWeight: '700', letterSpacing: '-0.02em', display: 'block', marginTop: '4px' }}>
        {item.value.toLocaleString()}
      </span>
      {pct !== null && <span style={{ color: 'var(--text-muted)', fontSize: '11px' }}>{pct}% of total</span>}
    </div>
  )
}

function Legend({ data, total }: { data: DataItem[]; total: number }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', paddingTop: '4px' }}>
      {data.map((item) => {
        const pct = Math.round((item.value / total) * 100)
        return (
          <div key={item.name} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: item.color, boxShadow: `0 0 6px ${item.color}`, flexShrink: 0 }} />
            <span style={{ color: 'var(--text-secondary)', fontSize: '11px', flex: 1 }}>{item.name}</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ color: 'var(--text-muted)', fontSize: '11px' }}>{pct}%</span>
              <span style={{ color: item.color, fontSize: '11px', fontWeight: 600 }}>{item.value.toLocaleString()}</span>
            </div>
          </div>
        )
      })}
    </div>
  )
}

export function PieChartWidget({ title, subtitle, data, height = 200, className = '', innerRadius = 52 }: Props) {
  const { config } = usePlatform()
  const uid = useId().replace(/:/g, '')
  const total = data.reduce((s, d) => s + d.value, 0)
  const enriched = data.map((d) => ({ ...d, total }))
  const chartSize = Math.min(height, 180)

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: 'easeOut' }}
      className={`rounded-xl p-5 relative overflow-hidden ${className}`}
      style={{
        background: `radial-gradient(ellipse at 50% 50%, ${config.colors.primary}08 0%, var(--bg-elevated) 70%)`,
        border: `1px solid ${config.colors.primary}22`,
        boxShadow: `0 0 40px rgba(0,0,0,0.35), 0 0 0 1px var(--border-subtle)`,
      }}
    >
      {/* Top accent line */}
      <div style={{
        position: 'absolute', top: 0, left: '10%', right: '10%', height: '1px',
        background: `linear-gradient(90deg, transparent, ${config.colors.primary}55, transparent)`,
      }} />

      <div className="mb-4">
        <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>{title}</h3>
        {subtitle && <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{subtitle}</p>}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        {/* Donut chart */}
        <div style={{ flexShrink: 0, position: 'relative' }}>
          <ResponsiveContainer width={chartSize} height={chartSize}>
            <PieChart>
              <defs>
                {enriched.map((_item, i) => (
                  <filter key={`${uid}-pf-${i}`} id={`${uid}-pf-${i}`} x="-30%" y="-30%" width="160%" height="160%">
                    <feGaussianBlur stdDeviation="3" result="blur" />
                    <feMerge>
                      <feMergeNode in="blur" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>
                ))}
              </defs>
              <Pie
                data={enriched}
                cx="50%"
                cy="50%"
                innerRadius={innerRadius}
                outerRadius={innerRadius + 26}
                paddingAngle={3}
                dataKey="value"
                isAnimationActive={true}
                animationBegin={0}
                animationDuration={900}
                animationEasing="ease-out"
              >
                {enriched.map((entry, i) => (
                  <Cell
                    key={`cell-${i}`}
                    fill={entry.color}
                    stroke="var(--bg-elevated)"
                    strokeWidth={2}
                    style={{ filter: `drop-shadow(0 0 5px ${entry.color}88)` }}
                  />
                ))}
              </Pie>
              <Tooltip content={<ChartTooltip />} />
            </PieChart>
          </ResponsiveContainer>
          {/* Center label overlay */}
          <div style={{
            position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center', pointerEvents: 'none',
          }}>
            <span style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
              {total.toLocaleString()}
            </span>
            <span style={{ fontSize: '9px', color: 'var(--text-muted)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
              total
            </span>
          </div>
        </div>

        {/* Legend beside chart */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <Legend data={data} total={total} />
        </div>
      </div>
    </motion.div>
  )
}
