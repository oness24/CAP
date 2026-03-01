import { useNavigate } from 'react-router-dom'
import {
  Server, CheckCircle, XCircle, Zap, AlertTriangle, Activity,
  RefreshCw, type LucideIcon, TrendingUp, TrendingDown, Ban,
} from 'lucide-react'
import { useDashboard } from '@/hooks/useDashboard'
import { zabbixDashboard, type ZabbixProblem } from '@/data/zabbix/dashboard'
import { PieChartWidget } from '@/components/charts/PieChartWidget'
import { AreaChartWidget } from '@/components/charts/AreaChartWidget'

const ACCENT = '#DC2626'

const TABS = [
  { label: 'Overview',           path: null },
  { label: 'Triggers',           path: '/zabbix/triggers' },
  { label: 'Host Availability',  path: '/zabbix/host-availability' },
  { label: 'Host Groups',        path: '/zabbix/host-groups' },
  { label: 'Network Monitoring', path: '/zabbix/network-monitoring' },
  { label: 'SLA Reports',        path: '/zabbix/sla-reports' },
  { label: 'Reports',            path: '/zabbix/reports' },
]

function KpiTile({ icon: Icon, value, label, sub, accent, trend }: {
  icon: LucideIcon; value: string | number; label: string; sub?: string; accent: string; trend?: number
}) {
  return (
    <div className="flex items-start gap-2.5 px-4 py-3 min-w-max"
      style={{ borderRight: '1px solid var(--border-subtle)' }}>
      <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
        style={{ background: `${accent}18`, border: `1px solid ${accent}30` }}>
        <Icon size={13} style={{ color: accent }} />
      </div>
      <div className="flex flex-col">
        <span className="text-[22px] font-bold leading-none tabular-nums" style={{ color: 'var(--text-primary)' }}>
          {value}
        </span>
        <span className="text-[11px] font-medium uppercase tracking-wide mt-0.5" style={{ color: 'var(--text-muted)' }}>
          {label}
        </span>
        {sub && (
          <span className="text-[10px] mt-0.5 flex items-center gap-1" style={{ color: accent }}>
            {trend !== undefined && trend > 0 ? <TrendingUp size={9} /> : trend !== undefined && trend < 0 ? <TrendingDown size={9} /> : null}
            {sub}
          </span>
        )}
      </div>
    </div>
  )
}

function Card({ title, icon: Icon, accent, children, action }: {
  title: string; icon: LucideIcon; accent: string; children: React.ReactNode; action?: React.ReactNode
}) {
  return (
    <div className="rounded-xl flex flex-col"
      style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)' }}>
      <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: 'var(--border-subtle)' }}>
        <h3 className="text-xs font-semibold flex items-center gap-2 uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>
          <Icon size={13} style={{ color: accent }} />
          {title}
        </h3>
        {action}
      </div>
      <div className="p-4 flex-1">{children}</div>
    </div>
  )
}

const SEV_COLORS: Record<string, string> = {
  Disaster: '#7C3AED', High: '#EF4444', Average: '#F97316',
  Warning: '#EAB308', Information: '#3B82F6', 'Not classified': '#6B7280',
}

function SevBadge({ sev }: { sev: string }) {
  const color = SEV_COLORS[sev] ?? '#6B7280'
  return (
    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wide flex-shrink-0"
      style={{ background: `${color}20`, color }}>
      {sev}
    </span>
  )
}

export default function ZabbixDashboard() {
  const navigate = useNavigate()
  const { data, isLoading } = useDashboard('zabbix')
  const d = (data as typeof zabbixDashboard) ?? zabbixDashboard
  const isLive = Boolean((data as { _live?: boolean } | null)?._live)

  const kpis       = d.kpis
  const hostsDown    = Number(kpis.hostsDown?.value  ?? 0)
  const hostsDisabled = Number((kpis as Record<string, { value: string | number }>).hostsDisabled?.value ?? 0)
  const totalHosts   = Number(kpis.totalHosts?.value ?? 0)
  const timeStr    = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })

  return (
    <div className="flex flex-col" style={{ background: 'var(--bg-base)', minHeight: '100%' }}>

      {/* Header */}
      <div className="flex items-center justify-between px-6 py-3 flex-shrink-0"
        style={{ background: 'var(--bg-surface)', borderBottom: '1px solid var(--border-default)' }}>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ background: 'rgba(220,38,38,0.12)', border: '1px solid rgba(220,38,38,0.3)' }}>
            <Server size={18} style={{ color: ACCENT }} />
          </div>
          <div>
            <p className="text-sm font-bold leading-tight" style={{ color: 'var(--text-primary)' }}>Zabbix</p>
            <p className="text-[10px] leading-tight" style={{ color: 'var(--text-muted)' }}>
              Infrastructure Monitoring Platform
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isLoading ? (
            <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium"
              style={{ background: 'rgba(234,179,8,0.1)', border: '1px solid rgba(234,179,8,0.25)', color: '#EAB308' }}>
              <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: '#EAB308' }} />
              Syncing…
            </span>
          ) : isLive ? (
            <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium"
              style={{ background: 'rgba(22,163,74,0.1)', border: '1px solid rgba(22,163,74,0.25)', color: '#22C55E' }}>
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: '#22C55E' }} />
              Live
            </span>
          ) : (
            <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium"
              style={{ background: 'rgba(234,88,12,0.1)', border: '1px solid rgba(234,88,12,0.25)', color: '#F97316' }}>
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: '#F97316' }} />
              Mock
            </span>
          )}
          <span className="text-xs tabular-nums" style={{ color: 'var(--text-muted)' }}>{timeStr}</span>
          <button onClick={() => window.location.reload()}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] border"
            style={{ borderColor: 'var(--border-default)', color: 'var(--text-muted)', background: 'var(--bg-elevated)' }}>
            <RefreshCw size={11} /> Refresh
          </button>
        </div>
      </div>

      {/* KPI Bar */}
      <div className="flex overflow-x-auto flex-shrink-0"
        style={{ background: 'var(--bg-surface)', borderBottom: '1px solid var(--border-default)' }}>
        <KpiTile icon={Server}        value={isLoading ? '—' : kpis.totalHosts.value}      label="Total Hosts"      accent="#3B82F6" />
        <KpiTile icon={CheckCircle}   value={isLoading ? '—' : kpis.hostsUp.value}         label="Hosts Up"         accent="#22C55E"
          sub={isLoading ? undefined : totalHosts > 0 ? `${Math.round(Number(kpis.hostsUp.value) / totalHosts * 100)}% online` : undefined} />
        <KpiTile icon={XCircle}       value={isLoading ? '—' : kpis.hostsDown.value}       label="Hosts Down"       accent={hostsDown > 0 ? '#EF4444' : '#6B7280'} />
        <KpiTile icon={Ban}           value={isLoading ? '—' : hostsDisabled}              label="Disabled"         accent={hostsDisabled > 0 ? '#9CA3AF' : '#6B7280'} />
        <KpiTile icon={Zap}           value={isLoading ? '—' : kpis.activeTriggers.value}  label="Active Triggers"  accent="#F97316" />
        <KpiTile icon={AlertTriangle} value={isLoading ? '—' : kpis.problems1h.value}      label="Problems (1h)"    accent="#EAB308" />
        <KpiTile icon={Activity}      value={isLoading ? '—' : kpis.avgAvailability.value} label="Avg Availability" accent="#22C55E" />
      </div>

      {/* Tab Bar */}
      <div className="flex overflow-x-auto flex-shrink-0"
        style={{ background: 'var(--bg-surface)', borderBottom: '1px solid var(--border-default)' }}>
        {TABS.map(({ label, path }) => {
          const isOverview = path === null
          return (
            <button key={label} onClick={() => path ? navigate(path) : undefined}
              className="px-4 py-2.5 text-xs font-medium whitespace-nowrap border-b-2 transition-colors"
              style={{
                borderColor: isOverview ? ACCENT : 'transparent',
                color: isOverview ? ACCENT : 'var(--text-muted)',
                cursor: path ? 'pointer' : 'default',
              }}>
              {label}
            </button>
          )
        })}
      </div>

      {/* Overview Content */}
      <div className="flex flex-col gap-4 p-5">

        {/* Row 1: Triggers by Severity + Active Problems */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card title="Triggers by Severity" icon={Zap} accent={ACCENT}>
            {d.triggersBySeverity.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 gap-2">
                <CheckCircle size={18} style={{ color: '#22C55E' }} />
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>No active triggers</p>
              </div>
            ) : (
              <PieChartWidget title="" subtitle="" data={d.triggersBySeverity} height={200} />
            )}
          </Card>

          <Card title="Active Problems" icon={AlertTriangle} accent="#F97316"
            action={
              <button onClick={() => navigate('/zabbix/triggers')}
                className="text-[10px] px-2 py-1 rounded"
                style={{ color: ACCENT, background: 'rgba(220,38,38,0.08)' }}>
                View triggers →
              </button>
            }>
            {(d.activeProblems as ZabbixProblem[]).length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 gap-2">
                <CheckCircle size={18} style={{ color: '#22C55E' }} />
                <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>No active problems</p>
              </div>
            ) : (
              <div className="flex flex-col">
                {(d.activeProblems as ZabbixProblem[]).slice(0, 7).map((p, i) => (
                  <div key={p.id} className="flex items-start justify-between py-2 gap-2"
                    style={{ borderTop: i > 0 ? '1px solid var(--border-subtle)' : undefined }}>
                    <div className="flex flex-col gap-0.5 min-w-0">
                      <span className="text-xs truncate" style={{ color: 'var(--text-primary)' }}>{p.problem}</span>
                      <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{p.host} · {p.duration}</span>
                    </div>
                    <SevBadge sev={p.severity} />
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        {/* Row 2: Network Throughput + Host Group Status */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card title="Network Throughput (24h)" icon={Activity} accent="#3B82F6">
            <AreaChartWidget
              title="" subtitle="" data={d.networkThroughput}
              dataKey="value1" secondKey="value2" secondLabel="Outbound" height={200}
            />
          </Card>

          <Card title="Host Group Status" icon={Server} accent="#22C55E"
            action={
              <button onClick={() => navigate('/zabbix/host-groups')}
                className="text-[10px] px-2 py-1 rounded"
                style={{ color: ACCENT, background: 'rgba(220,38,38,0.08)' }}>
                View all →
              </button>
            }>
            <div className="flex flex-col">
              {d.hostGroupStatus.map((g, i) => {
                const avail = parseFloat(g.availability)
                const color = g.down === 0 ? '#22C55E' : avail < 80 ? '#EF4444' : '#F97316'
                return (
                  <div key={g.group} className="flex items-center justify-between py-2 gap-3"
                    style={{ borderTop: i > 0 ? '1px solid var(--border-subtle)' : undefined }}>
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: color }} />
                      <span className="text-xs truncate" style={{ color: 'var(--text-primary)' }}>{g.group}</span>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      {g.down > 0 && <span className="text-[10px] font-semibold" style={{ color: '#EF4444' }}>{g.down} down</span>}
                      <span className="text-xs font-bold tabular-nums" style={{ color }}>{g.availability}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
