import { useNavigate } from 'react-router-dom'
import {
  Shield, RefreshCw, Server, Monitor, AlertTriangle, ShieldAlert,
  Settings, Lock, Activity, CheckCircle, Cpu, TrendingDown, TrendingUp,
  type LucideIcon,
} from 'lucide-react'
import { useDashboard } from '@/hooks/useDashboard'
import { crowdstrikeDashboard } from '@/data/crowdstrike/dashboard'
import { SeverityBadge } from '@/components/badges/SeverityBadge'

// ─── Tab definitions ────────────────────────────────────────────────────────
const TABS = [
  { label: 'Overview',       path: null },
  { label: 'Detections',     path: '/crowdstrike/detections' },
  { label: 'Hosts',          path: '/crowdstrike/endpoints' },
  { label: 'Incidents',      path: '/crowdstrike/incidents' },
  { label: 'Vulnerabilities',path: '/crowdstrike/vulnerabilities' },
  { label: 'Policies',       path: '/crowdstrike/policies' },
  { label: 'Reports',        path: '/crowdstrike/reports' },
]

// ─── KPI tile ───────────────────────────────────────────────────────────────
function KpiTile({
  icon: Icon, value, label, sub, accent, rightValue, trend,
}: {
  icon: LucideIcon
  value: string | number
  label: string
  sub?: string
  accent: string
  rightValue?: string | number
  trend?: number
}) {
  const hasRight = rightValue !== undefined
  return (
    <div
      className="flex items-start gap-2.5 px-4 py-3 min-w-max"
      style={{ borderRight: '1px solid var(--border-subtle)' }}
    >
      <div
        className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
        style={{ background: `${accent}18`, border: `1px solid ${accent}30` }}
      >
        <Icon size={13} style={{ color: accent }} />
      </div>
      <div className="flex flex-col">
        <div className="flex items-baseline gap-1">
          <span className="text-[22px] font-bold leading-none tabular-nums" style={{ color: 'var(--text-primary)' }}>
            {value}
          </span>
          {hasRight && (
            <>
              <span className="text-sm font-light" style={{ color: 'var(--border-default)' }}>/</span>
              <span className="text-base font-semibold tabular-nums" style={{ color: accent }}>
                {rightValue}
              </span>
            </>
          )}
        </div>
        <span className="text-[11px] font-medium uppercase tracking-wide mt-0.5" style={{ color: 'var(--text-muted)' }}>
          {label}
        </span>
        {sub && (
          <span className="text-[10px] mt-0.5 flex items-center gap-1" style={{ color: accent }}>
            {trend !== undefined && trend > 0
              ? <TrendingUp size={9} />
              : trend !== undefined && trend < 0
              ? <TrendingDown size={9} />
              : null}
            {sub}
          </span>
        )}
      </div>
    </div>
  )
}

// ─── Horizontal progress bar ─────────────────────────────────────────────────
function PlatformBar({ name, count, total, color }: { name: string; count: number; total: number; color: string }) {
  const pct = total > 0 ? Math.min(100, Math.round((count / total) * 100)) : 0
  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-2 w-20 flex-shrink-0">
        <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: color }} />
        <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>{name}</span>
      </div>
      <div className="flex-1 h-1.5 rounded-full" style={{ background: 'var(--bg-elevated)' }}>
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
      <span className="text-xs font-semibold w-8 text-right tabular-nums" style={{ color: 'var(--text-primary)' }}>
        {count}
      </span>
    </div>
  )
}

// ─── Section card ─────────────────────────────────────────────────────────────
function Card({ title, icon: Icon, accent, children, action }: {
  title: string
  icon: LucideIcon
  accent: string
  children: React.ReactNode
  action?: React.ReactNode
}) {
  return (
    <div
      className="rounded-xl flex flex-col"
      style={{
        background: 'var(--bg-surface)',
        border: '1px solid var(--border-default)',
      }}
    >
      <div
        className="flex items-center justify-between px-4 py-3 border-b"
        style={{ borderColor: 'var(--border-subtle)' }}
      >
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

// ─── Empty state ──────────────────────────────────────────────────────────────
function Empty({ message, sub }: { message: string; sub: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-8 gap-2">
      <div
        className="w-10 h-10 rounded-full flex items-center justify-center"
        style={{ background: 'var(--bg-elevated)' }}
      >
        <CheckCircle size={18} style={{ color: '#22C55E' }} />
      </div>
      <p className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>{message}</p>
      <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{sub}</p>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function CrowdStrikeDashboard() {
  const navigate = useNavigate()
  const { data, isLoading } = useDashboard('crowdstrike')
  const d = (data as typeof crowdstrikeDashboard) ?? crowdstrikeDashboard

  // severity map
  const sevMap: Record<string, number> = {}
  for (const s of d.severityBreakdown) sevMap[s.name] = s.value

  // OS counts
  const osCounts: Record<string, number> = {}
  for (const entry of d.endpointsByOS) {
    const k = entry.os.toLowerCase().includes('window')
      ? 'Windows'
      : entry.os.toLowerCase().includes('mac')
      ? 'Mac'
      : 'Linux'
    osCounts[k] = (osCounts[k] || 0) + entry.count
  }
  const winCount   = osCounts.Windows || 0
  const macCount   = osCounts.Mac     || 0
  const linuxCount = osCounts.Linux   || 0
  const osTotal    = winCount + macCount + linuxCount || 1

  const totalStr  = String(d.kpis.totalEndpoints.value).replace(/,/g, '')
  const totalNum  = parseInt(totalStr) || osTotal
  const critCount = sevMap.Critical ?? 0
  const openInc   = Number(d.kpis.openIncidents.value) || 0

  // Device type counts from endpointsByType (Server=56, Workstation=397, DC=0)
  const typeMap: Record<string, number> = {}
  const endpointsByType = (d as typeof crowdstrikeDashboard & { endpointsByType?: { type: string; count: number }[] }).endpointsByType ?? []
  for (const entry of endpointsByType) typeMap[entry.type] = entry.count
  const serverCount      = typeMap['Server']      ?? 0
  const workstationCount = typeMap['Workstation'] ?? 0

  const now     = new Date()
  const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })

  const platformDist = [
    { name: 'Linux',   count: linuxCount, color: '#F97316' },
    { name: 'Windows', count: winCount,   color: '#3B82F6' },
    { name: 'Mac',     count: macCount,   color: '#9CA3AF' },
  ]

  return (
    <div className="flex flex-col" style={{ background: 'var(--bg-base)', minHeight: '100%' }}>

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div
        className="flex items-center justify-between px-6 py-3 flex-shrink-0"
        style={{ background: 'var(--bg-surface)', borderBottom: '1px solid var(--border-default)' }}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)' }}
          >
            <Shield size={18} style={{ color: '#EF4444' }} />
          </div>
          <div>
            <p className="text-sm font-bold leading-tight" style={{ color: 'var(--text-primary)' }}>
              CrowdStrike Falcon EDR
            </p>
            <p className="text-[10px] leading-tight" style={{ color: 'var(--text-muted)' }}>
              Complete Endpoint Detection &amp; Response Platform
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isLoading ? (
            <span
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium"
              style={{ background: 'rgba(234,179,8,0.1)', border: '1px solid rgba(234,179,8,0.25)', color: '#EAB308' }}
            >
              <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: '#EAB308' }} />
              Syncing…
            </span>
          ) : (data as { _live?: boolean } | null)?._live ? (
            <span
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium"
              style={{ background: 'rgba(22,163,74,0.1)', border: '1px solid rgba(22,163,74,0.25)', color: '#22C55E' }}
            >
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: '#22C55E' }} />
              Live
            </span>
          ) : (
            <span
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium"
              style={{ background: 'rgba(234,88,12,0.1)', border: '1px solid rgba(234,88,12,0.25)', color: '#F97316' }}
            >
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: '#F97316' }} />
              Mock
            </span>
          )}
          <span className="text-xs tabular-nums" style={{ color: 'var(--text-muted)' }}>{timeStr}</span>
          <button
            onClick={() => window.location.reload()}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] border"
            style={{ borderColor: 'var(--border-default)', color: 'var(--text-muted)', background: 'var(--bg-elevated)' }}
          >
            <RefreshCw size={11} />
            Refresh
          </button>
        </div>
      </div>

      {/* ── KPI Bar ────────────────────────────────────────────────────────── */}
      <div
        className="flex overflow-x-auto flex-shrink-0"
        style={{ background: 'var(--bg-surface)', borderBottom: '1px solid var(--border-default)' }}
      >
        <KpiTile
          icon={Monitor} value={isLoading ? '—' : totalNum.toLocaleString()} label="Endpoints"
          sub={isLoading ? 'loading…' : `${totalNum.toLocaleString()} active`} accent="#3B82F6" trend={d.kpis.totalEndpoints.trend}
        />
        <KpiTile
          icon={Server} value={isLoading ? '—' : serverCount} label="Servers" accent="#8B5CF6"
        />
        <KpiTile
          icon={Cpu} value={isLoading ? '—' : workstationCount} label="Workstations" accent="#06B6D4"
        />
        <KpiTile
          icon={ShieldAlert} value={isLoading ? '—' : critCount} rightValue={isLoading ? undefined : d.kpis.activeDetections.value}
          label="Detections" sub="critical / total" accent="#EF4444" trend={d.kpis.activeDetections.trend}
        />
        <KpiTile
          icon={AlertTriangle} value={isLoading ? '—' : openInc} rightValue={isLoading ? undefined : openInc}
          label="Incidents" sub="open / total" accent="#F97316" trend={d.kpis.openIncidents.trend}
        />
        <KpiTile
          icon={Activity} value={critCount} label="Vulnerabilities"
          sub={`${critCount} critical`} accent="#A855F7"
        />
        <KpiTile
          icon={Settings} value={isLoading ? '—' : 9} label="Policies" accent="#22C55E"
        />
        <KpiTile
          icon={Lock} value={0} label="Contained" sub="isolated hosts" accent="#F59E0B"
        />
      </div>

      {/* ── Tab Bar ────────────────────────────────────────────────────────── */}
      <div
        className="flex overflow-x-auto flex-shrink-0"
        style={{ background: 'var(--bg-surface)', borderBottom: '1px solid var(--border-default)' }}
      >
        {TABS.map(({ label, path }) => {
          const isOverview = path === null
          return (
            <button
              key={label}
              onClick={() => path ? navigate(path) : undefined}
              className="px-4 py-2.5 text-xs font-medium whitespace-nowrap border-b-2 transition-colors"
              style={{
                borderColor: isOverview ? 'var(--accent-primary)' : 'transparent',
                color: isOverview ? 'var(--accent-primary)' : 'var(--text-muted)',
                cursor: path ? 'pointer' : 'default',
              }}
            >
              {label}
            </button>
          )
        })}
      </div>

      {/* ── Overview Content ───────────────────────────────────────────────── */}
      <div className="flex flex-col gap-4 p-5">

        {/* Row 1: Platform Distribution + Recent Detections */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

          <Card title="Platform Distribution" icon={Monitor} accent="var(--accent-primary)">
            <div className="flex flex-col gap-3">
              {platformDist.map(({ name, count, color }) => (
                <PlatformBar key={name} name={name} count={count} total={osTotal} color={color} />
              ))}
              <div
                className="mt-2 pt-3 flex items-center justify-between border-t"
                style={{ borderColor: 'var(--border-subtle)' }}
              >
                <span className="text-[10px] uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
                  Total Managed
                </span>
                <span className="text-xs font-bold tabular-nums" style={{ color: 'var(--text-primary)' }}>
                  {isLoading ? '—' : totalNum.toLocaleString()}
                </span>
              </div>
            </div>
          </Card>

          <Card
            title="Recent Detections"
            icon={AlertTriangle}
            accent="#F97316"
            action={
              <button
                onClick={() => navigate('/crowdstrike/detections')}
                className="text-[10px] px-2 py-1 rounded transition-colors"
                style={{ color: 'var(--accent-primary)', background: 'rgba(29,106,229,0.08)' }}
              >
                View all →
              </button>
            }
          >
            {d.recentDetections.length === 0 ? (
              <Empty message="No Detections" sub="No detections in the last 24 hours" />
            ) : (
              <div className="flex flex-col gap-0">
                {d.recentDetections.slice(0, 5).map((det) => (
                  <div
                    key={det.id}
                    className="flex items-center gap-3 py-2.5 border-b last:border-0"
                    style={{ borderColor: 'var(--border-subtle)' }}
                  >
                    <SeverityBadge severity={det.severity} />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                        {det.technique}
                      </p>
                      <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                        {det.hostname} · {det.timestamp}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        {/* Row 2: Host Status | Open Incidents | Top Vulnerabilities */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

          {/* Host Status */}
          <Card
            title="Host Status"
            icon={Server}
            accent="var(--accent-primary)"
            action={
              <button
                onClick={() => navigate('/crowdstrike/endpoints')}
                className="text-[10px] px-2 py-1 rounded"
                style={{ color: 'var(--accent-primary)', background: 'rgba(29,106,229,0.08)' }}
              >
                View all →
              </button>
            }
          >
            {d.recentDetections.length === 0 ? (
              <Empty message="All hosts normal" sub="No recent host events" />
            ) : (
              <div className="flex flex-col gap-0">
                {d.recentDetections.slice(0, 5).map((det, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between py-2 border-b last:border-0"
                    style={{ borderColor: 'var(--border-subtle)' }}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                        {det.hostname}
                      </p>
                      <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>endpoint</p>
                    </div>
                    <span
                      className="text-[10px] px-2 py-0.5 rounded font-medium ml-2 flex-shrink-0"
                      style={{
                        background: 'rgba(22,163,74,0.1)',
                        color: '#22C55E',
                        border: '1px solid rgba(22,163,74,0.2)',
                      }}
                    >
                      normal
                    </span>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Open Incidents */}
          <Card
            title="Open Incidents"
            icon={AlertTriangle}
            accent="#F97316"
            action={
              <button
                onClick={() => navigate('/crowdstrike/incidents')}
                className="text-[10px] px-2 py-1 rounded"
                style={{ color: 'var(--accent-primary)', background: 'rgba(29,106,229,0.08)' }}
              >
                View all →
              </button>
            }
          >
            {openInc === 0 ? (
              <Empty message="No open incidents" sub="Environment is clean" />
            ) : (
              <div className="flex flex-col gap-0">
                {Array.from({ length: Math.min(openInc, 5) }, (_, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between py-2 border-b last:border-0"
                    style={{ borderColor: 'var(--border-subtle)' }}
                  >
                    <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                      INC-{String(i + 1).padStart(4, '0')}
                    </span>
                    <span
                      className="text-[10px] px-2 py-0.5 rounded"
                      style={{ background: 'rgba(234,88,12,0.1)', color: '#F97316' }}
                    >
                      Open
                    </span>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Top Vulnerabilities */}
          <Card
            title="Top Vulnerabilities"
            icon={ShieldAlert}
            accent="#A855F7"
            action={
              <button
                onClick={() => navigate('/crowdstrike/vulnerabilities')}
                className="text-[10px] px-2 py-1 rounded"
                style={{ color: 'var(--accent-primary)', background: 'rgba(29,106,229,0.08)' }}
              >
                View all →
              </button>
            }
          >
            {critCount === 0 ? (
              <Empty message="No critical findings" sub="No critical vulnerabilities detected" />
            ) : (
              <div className="flex flex-col gap-0">
                {d.recentDetections
                  .filter((det) => det.severity === 'Critical')
                  .slice(0, 5)
                  .map((det, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between py-2 border-b last:border-0"
                      style={{ borderColor: 'var(--border-subtle)' }}
                    >
                      <span className="text-xs truncate flex-1" style={{ color: 'var(--text-secondary)' }}>
                        {det.technique.split('—')[1]?.trim() ?? det.technique}
                      </span>
                      <span
                        className="ml-2 text-[10px] px-2 py-0.5 rounded flex-shrink-0"
                        style={{ background: 'rgba(239,68,68,0.1)', color: '#EF4444' }}
                      >
                        Critical
                      </span>
                    </div>
                  ))}
              </div>
            )}
          </Card>
        </div>

      </div>
    </div>
  )
}
