import { useState, useEffect, useCallback } from 'react'
import { Zap, RefreshCw, AlertTriangle, ChevronLeft, ChevronRight } from 'lucide-react'
import { api } from '@/lib/api'
import { PageLayout } from '@/layouts/PageLayout'

const SEV_COLORS: Record<string, { bg: string; text: string }> = {
  Disaster:         { bg: 'rgba(124,58,237,0.15)', text: '#A78BFA' },
  High:             { bg: 'rgba(239,68,68,0.15)',  text: '#F87171' },
  Average:          { bg: 'rgba(249,115,22,0.15)', text: '#FB923C' },
  Warning:          { bg: 'rgba(234,179,8,0.15)',  text: '#FDE047' },
  Information:      { bg: 'rgba(59,130,246,0.15)', text: '#60A5FA' },
  'Not classified': { bg: 'rgba(107,114,128,0.15)', text: '#9CA3AF' },
}

function SevBadge({ sev }: { sev: string }) {
  const c = SEV_COLORS[sev] ?? SEV_COLORS['Not classified']
  return (
    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wide"
      style={{ background: c.bg, color: c.text }}>
      {sev}
    </span>
  )
}

const SEVERITIES = ['', 'Disaster', 'High', 'Average', 'Warning', 'Information']

export default function Triggers() {
  const [items, setItems]       = useState<any[]>([])
  const [total, setTotal]       = useState(0)
  const [page, setPage]         = useState(1)
  const [severity, setSeverity] = useState('')
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState<string | null>(null)
  const limit = 50

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(limit) })
      if (severity) params.set('severity', severity)
      const res = await api.get<{ total: number; items: any[] }>(`/platforms/zabbix/triggers?${params}`)
      setItems(res.items)
      setTotal(res.total)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [page, severity])

  useEffect(() => { load() }, [load])

  const pages = Math.max(1, Math.ceil(total / limit))

  return (
    <PageLayout title="Active Triggers" subtitle="Zabbix — Live trigger alerts sorted by severity">
      {/* Controls */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          {SEVERITIES.map(s => (
            <button key={s || 'all'} onClick={() => { setSeverity(s); setPage(1) }}
              className="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
              style={{
                background: severity === s ? 'var(--accent-primary)' : 'var(--bg-elevated)',
                color: severity === s ? 'white' : 'var(--text-muted)',
                border: '1px solid var(--border-default)',
              }}>
              {s || 'All'}
            </button>
          ))}
        </div>
        <button onClick={load} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs border"
          style={{ borderColor: 'var(--border-default)', color: 'var(--text-muted)', background: 'var(--bg-elevated)' }}>
          <RefreshCw size={11} className={loading ? 'animate-spin' : ''} /> Refresh
        </button>
      </div>

      {/* Summary */}
      <div className="flex items-center gap-3 text-xs" style={{ color: 'var(--text-muted)' }}>
        <Zap size={13} style={{ color: '#DC2626' }} />
        <span><strong style={{ color: 'var(--text-primary)' }}>{total}</strong> active triggers</span>
        {severity && <span>· <strong style={{ color: 'var(--text-primary)' }}>{severity}</strong> only</span>}
      </div>

      {/* Table */}
      <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--border-default)', background: 'var(--bg-surface)' }}>
        <div className="grid text-[10px] font-semibold uppercase tracking-wider px-4 py-2.5"
          style={{ gridTemplateColumns: '2fr 1fr 1fr 1fr', borderBottom: '1px solid var(--border-subtle)', background: 'var(--bg-elevated)', color: 'var(--text-muted)' }}>
          <span>Trigger</span>
          <span>Host</span>
          <span>Severity</span>
          <span>Duration</span>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16 gap-2" style={{ color: 'var(--text-muted)' }}>
            <RefreshCw size={14} className="animate-spin" />
            <span className="text-sm">Loading triggers…</span>
          </div>
        ) : error ? (
          <div className="flex items-center justify-center py-16 gap-2" style={{ color: '#EF4444' }}>
            <AlertTriangle size={14} /><span className="text-sm">{error}</span>
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-2" style={{ color: 'var(--text-muted)' }}>
            <Zap size={24} style={{ opacity: 0.3 }} />
            <span className="text-sm">No active triggers</span>
          </div>
        ) : (
          items.map((t, i) => (
            <div key={t.id} className="grid items-center px-4 py-3"
              style={{
                gridTemplateColumns: '2fr 1fr 1fr 1fr',
                borderBottom: i < items.length - 1 ? '1px solid var(--border-subtle)' : undefined,
              }}>
              <span className="text-xs pr-4" style={{ color: 'var(--text-primary)', lineHeight: 1.4 }}>
                {t.description}
              </span>
              <span className="text-xs truncate" style={{ color: 'var(--text-secondary)' }} title={t.host_name || t.host}>
                {t.host}
              </span>
              <SevBadge sev={t.severity} />
              <span className="text-xs tabular-nums" style={{ color: 'var(--text-muted)' }}>{t.duration}</span>
            </div>
          ))
        )}
      </div>

      {pages > 1 && (
        <div className="flex items-center justify-between">
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
            Page {page} of {pages} · {total} total
          </span>
          <div className="flex items-center gap-1">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
              className="p-1.5 rounded-lg disabled:opacity-40"
              style={{ background: 'var(--bg-elevated)', color: 'var(--text-muted)' }}>
              <ChevronLeft size={14} />
            </button>
            <button onClick={() => setPage(p => Math.min(pages, p + 1))} disabled={page === pages}
              className="p-1.5 rounded-lg disabled:opacity-40"
              style={{ background: 'var(--bg-elevated)', color: 'var(--text-muted)' }}>
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}
    </PageLayout>
  )
}
