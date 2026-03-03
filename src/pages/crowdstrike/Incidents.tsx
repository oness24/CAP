import { useState } from 'react'
import { AlertTriangle, FileText, Users, Clock, X, ExternalLink, User, Monitor, Shield, Activity } from 'lucide-react'
import { PageLayout } from '@/layouts/PageLayout'
import { MetricCard } from '@/components/cards/MetricCard'
import { DataTable } from '@/components/tables/DataTable'
import { SeverityBadge } from '@/components/badges/SeverityBadge'
import { StatusBadge } from '@/components/badges/StatusBadge'
import { AreaChartWidget } from '@/components/charts/AreaChartWidget'
import { useDashboard } from '@/hooks/useDashboard'
import { usePagedData } from '@/hooks/usePagedData'
import { crowdstrikeDashboard } from '@/data/crowdstrike/dashboard'

interface Incident {
  id: string; name: string; status: string; severity: number
  tactics: string[]; hosts: string[]; users: string[]
  start: string; end: string; assigned_to: string
}

function fmtDate(iso: string) {
  if (!iso) return '—'
  const d = new Date(iso)
  return isNaN(d.getTime()) ? iso : d.toLocaleString()
}
function severityLabel(score: number): string {
  if (score >= 90) return 'Critical'
  if (score >= 70) return 'High'
  if (score >= 40) return 'Medium'
  return 'Low'
}

const SEV_COLOR: Record<string, string> = {
  Critical: '#F87171', High: '#FB923C', Medium: '#FBBF24', Low: '#34D399',
}

function Chip({ text, color }: { text: string; color?: string }) {
  return (
    <span className="px-2 py-0.5 rounded-full text-[11px] font-medium"
      style={{ background: color ? `${color}20` : 'var(--bg-overlay)', color: color ?? 'var(--text-muted)', border: `1px solid ${color ? color + '35' : 'var(--border-default)'}` }}>
      {text}
    </span>
  )
}

function IncidentModal({ inc, onClose }: { inc: Incident; onClose: () => void }) {
  const label = severityLabel(inc.severity)
  const sevColor = SEV_COLOR[label] ?? '#94A3B8'
  const falconUrl = `https://falcon.us-2.crowdstrike.com/incident-workbench/incidents/${encodeURIComponent(inc.id)}`

  const duration = (() => {
    if (!inc.start || !inc.end) return '—'
    const ms = new Date(inc.end).getTime() - new Date(inc.start).getTime()
    if (isNaN(ms) || ms < 0) return '—'
    const h = Math.floor(ms / 3600000)
    const m = Math.floor((ms % 3600000) / 60000)
    return h > 0 ? `${h}h ${m}m` : `${m}m`
  })()

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}>
      <div className="w-full max-w-2xl rounded-2xl flex flex-col overflow-hidden"
        style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)', boxShadow: '0 24px 80px rgba(0,0,0,0.6)', maxHeight: '90vh' }}
        onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="flex items-start justify-between px-6 py-4" style={{ borderBottom: '1px solid var(--border-default)', background: 'var(--bg-elevated)' }}>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: `${sevColor}18`, border: `1px solid ${sevColor}40` }}>
              <AlertTriangle size={18} style={{ color: sevColor }} />
            </div>
            <div>
              <p className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>{inc.id}</p>
              <h2 className="text-sm font-semibold mt-0.5" style={{ color: 'var(--text-primary)' }}>{inc.name || 'Unnamed Incident'}</h2>
            </div>
          </div>
          <button onClick={onClose} className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors hover:bg-white/10">
            <X size={15} style={{ color: 'var(--text-muted)' }} />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 px-6 py-5 flex flex-col gap-5">

          {/* Status + severity row */}
          <div className="flex items-center gap-3 flex-wrap">
            <SeverityBadge severity={label} />
            <StatusBadge status={inc.status} />
            <span className="ml-auto text-xs font-semibold px-2.5 py-1 rounded-lg"
              style={{ background: 'var(--bg-elevated)', color: 'var(--text-muted)' }}>
              Score: {inc.severity}/100
            </span>
          </div>

          {/* Core info grid */}
          <div className="grid grid-cols-2 gap-3">
            {[
              { icon: User, label: 'Assigned To', value: inc.assigned_to || 'Unassigned' },
              { icon: Clock, label: 'Duration', value: duration },
              { icon: Clock, label: 'Start', value: fmtDate(inc.start) },
              { icon: Clock, label: 'End', value: inc.end ? fmtDate(inc.end) : 'Ongoing' },
            ].map(({ icon: Icon, label, value }) => (
              <div key={label} className="flex items-start gap-3 rounded-xl px-4 py-3"
                style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}>
                <Icon size={14} style={{ color: 'var(--accent-primary)', marginTop: 2, flexShrink: 0 }} />
                <div className="min-w-0">
                  <p className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>{label}</p>
                  <p className="text-sm font-medium mt-0.5 break-words" style={{ color: 'var(--text-primary)' }}>{value}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Tactics */}
          {inc.tactics?.length > 0 && (
            <div className="rounded-xl px-4 py-3 flex flex-col gap-2"
              style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}>
              <div className="flex items-center gap-2">
                <Shield size={13} style={{ color: 'var(--accent-primary)' }} />
                <p className="text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>MITRE Tactics</p>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {inc.tactics.map(t => <Chip key={t} text={t} color="var(--accent-primary)" />)}
              </div>
            </div>
          )}

          {/* Affected hosts */}
          {inc.hosts?.length > 0 && (
            <div className="rounded-xl px-4 py-3 flex flex-col gap-2"
              style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}>
              <div className="flex items-center gap-2">
                <Monitor size={13} style={{ color: '#FB923C' }} />
                <p className="text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>Affected Hosts ({inc.hosts.length})</p>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {inc.hosts.map(h => <Chip key={h} text={h} color="#FB923C" />)}
              </div>
            </div>
          )}

          {/* Involved users */}
          {inc.users?.length > 0 && (
            <div className="rounded-xl px-4 py-3 flex flex-col gap-2"
              style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}>
              <div className="flex items-center gap-2">
                <Activity size={13} style={{ color: '#A78BFA' }} />
                <p className="text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>Involved Users ({inc.users.length})</p>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {inc.users.map(u => <Chip key={u} text={u} color="#A78BFA" />)}
              </div>
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="flex items-center justify-end gap-3 px-6 py-4" style={{ borderTop: '1px solid var(--border-default)' }}>
          <button onClick={onClose}
            className="px-4 py-2 text-sm rounded-lg border transition-colors"
            style={{ borderColor: 'var(--border-default)', color: 'var(--text-muted)', background: 'transparent' }}>
            Close
          </button>
          <a href={falconUrl} target="_blank" rel="noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 text-sm rounded-lg font-medium transition-colors"
            style={{ background: 'var(--accent-primary)', color: '#fff' }}>
            <ExternalLink size={14} />
            View in Falcon
          </a>
        </div>
      </div>
    </div>
  )
}

export default function Incidents() {
  const [selected, setSelected] = useState<Incident | null>(null)
  const { data: dash } = useDashboard('crowdstrike')
  const d = (dash as typeof crowdstrikeDashboard) ?? crowdstrikeDashboard

  const { items, total, isLoading, error, page, setPage } = usePagedData<Incident>(
    '/platforms/crowdstrike/real-incidents', {}, 25,
  )

  return (
    <PageLayout title="Incidents" subtitle="CrowdStrike — Incident management and case tracking">
      {selected && <IncidentModal inc={selected} onClose={() => setSelected(null)} />}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard title="Open Incidents" value={d.kpis.openIncidents.value} trend={d.kpis.openIncidents.trend} icon={AlertTriangle} />
        <MetricCard title="Total Found"    value={total}                       trend={0} icon={FileText} />
        <MetricCard title="Avg MTTR"       value={d.kpis.mttr.value}          trend={d.kpis.mttr.trend} icon={Clock} trendLabel="m" />
        <MetricCard title="Assigned"       value={items.filter(i => i.assigned_to !== 'Unassigned').length} trend={0} icon={Users} />
      </div>

      <AreaChartWidget
        title="Incident Trend (Last 30 Days)"
        subtitle="Incident activity over time"
        data={d.incidentTrend}
        height={200}
      />

      {isLoading ? (
        <p className="text-sm py-12 text-center" style={{ color: 'var(--text-muted)' }}>Loading incidents…</p>
      ) : error ? (
        <p className="text-sm py-12 text-center" style={{ color: '#F87171' }}>{error}</p>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center"
            style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-default)' }}>
            <AlertTriangle size={26} style={{ color: '#22C55E' }} />
          </div>
          <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>No open incidents</p>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            Your environment currently has {total} recorded incidents. Great posture!
          </p>
        </div>
      ) : (
        <>
          <DataTable<Incident>
            columns={[
              { key: 'id',          label: 'Incident ID',  sortable: true, width: '180px' },
              { key: 'name',        label: 'Name' },
              { key: 'severity',    label: 'Severity', width: '100px', render: (v) => <SeverityBadge severity={severityLabel(Number(v))} /> },
              { key: 'status',      label: 'Status',   width: '120px', render: (v) => <StatusBadge status={String(v)} /> },
              { key: 'hosts',       label: 'Hosts',    render: (v) => <span>{(v as string[]).join(', ') || '—'}</span> },
              { key: 'assigned_to', label: 'Assigned', width: '120px' },
              { key: 'start',       label: 'Started',  sortable: true, render: (v) => fmtDate(String(v)) },
            ]}
            data={items}
            onRowClick={(row) => setSelected(row)}
          />
          <div className="flex items-center justify-between text-xs" style={{ color: 'var(--text-muted)' }}>
            <span>Page {page} · {items.length} of {total} incidents · Click a row to view details</span>
            <div className="flex gap-2">
              <button onClick={() => setPage(Math.max(1, page - 1))} disabled={page === 1}
                className="px-3 py-1 rounded border disabled:opacity-40"
                style={{ borderColor: 'var(--border-default)', background: 'var(--bg-elevated)' }}>← Prev</button>
              <button onClick={() => setPage(page + 1)} disabled={page * 25 >= total}
                className="px-3 py-1 rounded border disabled:opacity-40"
                style={{ borderColor: 'var(--border-default)', background: 'var(--bg-elevated)' }}>Next →</button>
            </div>
          </div>
        </>
      )}
    </PageLayout>
  )
}
