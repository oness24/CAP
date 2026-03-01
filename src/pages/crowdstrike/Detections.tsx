import { useState } from 'react'
import { ShieldAlert, AlertTriangle, Shield, Activity, X, ExternalLink, Clock, User, Monitor, Tag } from 'lucide-react'
import { PageLayout } from '@/layouts/PageLayout'
import { MetricCard } from '@/components/cards/MetricCard'
import { DataTable } from '@/components/tables/DataTable'
import { SeverityBadge } from '@/components/badges/SeverityBadge'
import { StatusBadge } from '@/components/badges/StatusBadge'
import { useDashboard } from '@/hooks/useDashboard'
import { usePagedData } from '@/hooks/usePagedData'
import { crowdstrikeDashboard } from '@/data/crowdstrike/dashboard'

interface Alert {
  id: string; hostname: string; technique: string; tactic: string
  severity: string; status: string; timestamp: string; analyst: string
}

const SEV_TABS = [
  { label: 'All', value: '' }, { label: 'Critical', value: 'Critical' },
  { label: 'High', value: 'High' }, { label: 'Medium', value: 'Medium' }, { label: 'Low', value: 'Low' },
]
const STATUS_TABS = [
  { label: 'All', value: '' }, { label: 'New', value: 'new' },
  { label: 'In Progress', value: 'in_progress' }, { label: 'Closed', value: 'closed' },
]

function fmtDate(iso: string) {
  if (!iso) return '—'
  const d = new Date(iso)
  return isNaN(d.getTime()) ? iso : d.toLocaleString()
}

function FilterBar({ tabs, active, onChange }: { tabs: { label: string; value: string }[]; active: string; onChange: (v: string) => void }) {
  return (
    <>
      {tabs.map(({ label, value }) => (
        <button key={value} onClick={() => onChange(value)}
          className="px-3 py-1 text-xs rounded-lg border transition-colors"
          style={{
            background: active === value ? 'var(--accent-primary)' : 'var(--bg-elevated)',
            color: active === value ? '#fff' : 'var(--text-muted)',
            borderColor: 'var(--border-default)',
          }}>
          {label}
        </button>
      ))}
    </>
  )
}

const SEV_COLOR: Record<string, string> = {
  Critical: '#F87171', High: '#FB923C', Medium: '#FBBF24', Low: '#34D399',
}

function DetectionModal({ det, onClose }: { det: Alert; onClose: () => void }) {
  const sevColor = SEV_COLOR[det.severity] ?? '#94A3B8'
  const falconUrl = `https://falcon.us-2.crowdstrike.com/activity/detections/${encodeURIComponent(det.id)}`

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
              <ShieldAlert size={18} style={{ color: sevColor }} />
            </div>
            <div>
              <p className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>{det.id}</p>
              <h2 className="text-sm font-semibold mt-0.5" style={{ color: 'var(--text-primary)' }}>Detection Detail</h2>
            </div>
          </div>
          <button onClick={onClose} className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors hover:bg-white/10">
            <X size={15} style={{ color: 'var(--text-muted)' }} />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 px-6 py-5 flex flex-col gap-5">

          {/* Status row */}
          <div className="flex items-center gap-3 flex-wrap">
            <SeverityBadge severity={det.severity} />
            <StatusBadge status={det.status} />
          </div>

          {/* Key fields grid */}
          <div className="grid grid-cols-2 gap-3">
            {[
              { icon: Monitor, label: 'Hostname', value: det.hostname },
              { icon: Tag, label: 'Tactic', value: det.tactic || '—' },
              { icon: ShieldAlert, label: 'Technique', value: det.technique || '—' },
              { icon: User, label: 'Analyst', value: det.analyst || 'Unassigned' },
              { icon: Clock, label: 'Detected', value: fmtDate(det.timestamp) },
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

          {/* MITRE context banner */}
          {det.tactic && (
            <div className="rounded-xl px-4 py-3 flex items-start gap-3"
              style={{ background: 'rgba(29,106,229,0.08)', border: '1px solid rgba(29,106,229,0.2)' }}>
              <ShieldAlert size={14} style={{ color: 'var(--accent-primary)', marginTop: 2, flexShrink: 0 }} />
              <div>
                <p className="text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>MITRE ATT&CK Context</p>
                <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                  Tactic: <span style={{ color: 'var(--text-secondary)' }}>{det.tactic}</span>
                  {det.technique && <> · Technique: <span style={{ color: 'var(--text-secondary)' }}>{det.technique}</span></>}
                </p>
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

export default function Detections() {
  const [severity, setSeverity] = useState('')
  const [status, setStatus] = useState('')
  const [selected, setSelected] = useState<Alert | null>(null)
  const { data: dash } = useDashboard('crowdstrike')
  const d = (dash as typeof crowdstrikeDashboard) ?? crowdstrikeDashboard

  const params: Record<string, string> = {}
  if (severity) params.severity = severity
  if (status)   params.status   = status

  const { items, total, isLoading, error, page, setPage } = usePagedData<Alert>(
    '/platforms/crowdstrike/detections', params, 25,
  )

  const sevMap: Record<string, number> = {}
  for (const s of d.severityBreakdown) sevMap[s.name] = s.value

  return (
    <PageLayout title="Detections" subtitle="CrowdStrike — All active and historical detections">
      {selected && <DetectionModal det={selected} onClose={() => setSelected(null)} />}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard title="Total Alerts"    value={d.kpis.activeDetections.value} trend={d.kpis.activeDetections.trend} icon={ShieldAlert} />
        <MetricCard title="Critical"        value={sevMap.Critical ?? 0}           trend={0} icon={AlertTriangle} />
        <MetricCard title="High"            value={sevMap.High ?? 0}               trend={0} icon={Activity} />
        <MetricCard title="Critical Alerts" value={d.kpis.criticalAlerts.value}   trend={d.kpis.criticalAlerts.trend} icon={Shield} />
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex gap-2 items-center flex-wrap">
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Severity:</span>
          <FilterBar tabs={SEV_TABS} active={severity} onChange={v => { setSeverity(v); setPage(1) }} />
        </div>
        <div className="flex gap-2 items-center flex-wrap">
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Status:</span>
          <FilterBar tabs={STATUS_TABS} active={status} onChange={v => { setStatus(v); setPage(1) }} />
          <span className="ml-auto text-xs" style={{ color: 'var(--text-muted)' }}>{total.toLocaleString()} detections</span>
        </div>
      </div>

      {isLoading ? (
        <p className="text-sm py-12 text-center" style={{ color: 'var(--text-muted)' }}>Loading detections…</p>
      ) : error ? (
        <p className="text-sm py-12 text-center" style={{ color: '#F87171' }}>{error}</p>
      ) : (
        <>
          <DataTable<Alert>
            columns={[
              { key: 'id',        label: 'Detection ID', sortable: true, width: '130px',
                render: (v) => {
                  const raw = String(v)
                  const short = raw.replace(/:.*$/, '').slice(0, 12).toUpperCase()
                  return <span title={raw} className="font-mono text-xs">{short}</span>
                }},
              { key: 'hostname',  label: 'Hostname',     sortable: true },
              { key: 'tactic',    label: 'Tactic' },
              { key: 'technique', label: 'Technique' },
              { key: 'severity',  label: 'Severity', width: '100px', render: (v) => <SeverityBadge severity={String(v)} /> },
              { key: 'status',    label: 'Status',   width: '130px', render: (v) => <StatusBadge status={String(v)} /> },
              { key: 'timestamp', label: 'Time',     sortable: true,  render: (v) => fmtDate(String(v)) },
              { key: 'analyst',   label: 'Analyst',  width: '110px' },
            ]}
            data={items}
            onRowClick={(row) => setSelected(row)}
          />
          <div className="flex items-center justify-between text-xs" style={{ color: 'var(--text-muted)' }}>
            <span>Page {page} · {items.length} of {total.toLocaleString()} detections · Click a row to view details</span>
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
