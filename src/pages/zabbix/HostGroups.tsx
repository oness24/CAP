import { useDashboard } from '@/hooks/useDashboard'
import { zabbixDashboard } from '@/data/zabbix/dashboard'
import { PageLayout } from '@/layouts/PageLayout'
import { Server, CheckCircle, XCircle, Activity } from 'lucide-react'

export default function HostGroups() {
  const { data, isLoading } = useDashboard('zabbix')
  const d = (data as typeof zabbixDashboard) ?? zabbixDashboard
  const groups = d.hostGroupStatus ?? []

  return (
    <PageLayout title="Host Groups" subtitle="Zabbix — Infrastructure group availability overview">

      {/* KPI summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { icon: Server,       label: 'Total Groups',  value: isLoading ? '—' : groups.length },
          { icon: CheckCircle,  label: 'All Up',        value: isLoading ? '—' : groups.filter(g => g.down === 0).length, color: '#22C55E' },
          { icon: XCircle,      label: 'With Issues',   value: isLoading ? '—' : groups.filter(g => g.down > 0).length,  color: '#EF4444' },
          { icon: Activity,     label: 'Avg Availability', value: isLoading ? '—' : groups.length
              ? (groups.reduce((s, g) => s + parseFloat(g.availability), 0) / groups.length).toFixed(1) + '%'
              : '—', color: '#3B82F6' },
        ].map(({ icon: Icon, label, value, color }) => (
          <div key={label} className="rounded-xl px-4 py-4 flex items-center gap-3"
            style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)' }}>
            <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ background: color ? `${color}18` : 'var(--bg-elevated)', border: `1px solid ${color ? color + '30' : 'var(--border-subtle)'}` }}>
              <Icon size={16} style={{ color: color ?? 'var(--text-muted)' }} />
            </div>
            <div>
              <p className="text-xl font-bold tabular-nums leading-none" style={{ color: 'var(--text-primary)' }}>{value}</p>
              <p className="text-[10px] uppercase tracking-wide mt-0.5" style={{ color: 'var(--text-muted)' }}>{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Group cards grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="rounded-xl h-32 animate-pulse"
              style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)' }} />
          ))}
        </div>
      ) : groups.length === 0 ? (
        <div className="flex items-center justify-center py-20 text-sm" style={{ color: 'var(--text-muted)' }}>
          No host group data available
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {groups.map(g => {
            const avail = parseFloat(g.availability)
            const isHealthy = g.down === 0
            const accentColor = isHealthy ? '#22C55E' : g.down / g.total > 0.2 ? '#EF4444' : '#F97316'
            return (
              <div key={g.group} className="rounded-xl p-4 flex flex-col gap-3"
                style={{ background: 'var(--bg-surface)', border: `1px solid var(--border-default)` }}>

                {/* Group header */}
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full flex-shrink-0 mt-0.5"
                      style={{ background: accentColor }} />
                    <span className="text-sm font-semibold leading-tight" style={{ color: 'var(--text-primary)' }}>
                      {g.group}
                    </span>
                  </div>
                  <span className="text-xs font-bold tabular-nums" style={{ color: accentColor }}>
                    {g.availability}
                  </span>
                </div>

                {/* Progress bar */}
                <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--bg-elevated)' }}>
                  <div className="h-full rounded-full transition-all duration-700"
                    style={{ width: `${Math.min(100, avail)}%`, background: accentColor }} />
                </div>

                {/* Host counts */}
                <div className="flex items-center gap-4 text-xs">
                  <span className="flex items-center gap-1" style={{ color: '#22C55E' }}>
                    <CheckCircle size={11} /> {g.up} up
                  </span>
                  <span className="flex items-center gap-1" style={{ color: g.down > 0 ? '#EF4444' : 'var(--text-muted)' }}>
                    <XCircle size={11} /> {g.down} down
                  </span>
                  <span style={{ color: 'var(--text-muted)' }}>{g.total} total</span>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Full table */}
      {!isLoading && groups.length > 0 && (
        <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--border-default)', background: 'var(--bg-surface)' }}>
          <div className="grid text-[10px] font-semibold uppercase tracking-wider px-4 py-2.5"
            style={{ gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr', borderBottom: '1px solid var(--border-subtle)', background: 'var(--bg-elevated)', color: 'var(--text-muted)' }}>
            <span>Group</span><span>Total</span><span>Up</span><span>Down</span><span>Availability</span>
          </div>
          {groups.map((g, i) => (
            <div key={g.group} className="grid items-center px-4 py-3"
              style={{ gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr', borderBottom: i < groups.length - 1 ? '1px solid var(--border-subtle)' : undefined }}>
              <span className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>{g.group}</span>
              <span className="text-xs tabular-nums" style={{ color: 'var(--text-secondary)' }}>{g.total}</span>
              <span className="text-xs tabular-nums" style={{ color: '#22C55E' }}>{g.up}</span>
              <span className="text-xs tabular-nums" style={{ color: g.down > 0 ? '#EF4444' : 'var(--text-muted)' }}>{g.down}</span>
              <span className="text-xs font-semibold tabular-nums" style={{ color: g.down === 0 ? '#22C55E' : '#F97316' }}>{g.availability}</span>
            </div>
          ))}
        </div>
      )}
    </PageLayout>
  )
}
