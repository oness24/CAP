import { useState, useEffect, useCallback } from 'react'
import { Bell, RefreshCw, AlertTriangle, ChevronLeft, ChevronRight, Search } from 'lucide-react'
import { api } from '@/lib/api'
import { PageLayout } from '@/layouts/PageLayout'
import { SeverityBadge } from '@/components/badges/SeverityBadge'

const SEVERITIES = ['', 'Critical', 'High', 'Medium', 'Low']

export default function Alerts() {
  const [items, setItems]       = useState<any[]>([])
  const [total, setTotal]       = useState(0)
  const [page, setPage]         = useState(1)
  const [severity, setSeverity] = useState('')
  const [search, setSearch]     = useState('')
  const [query, setQuery]       = useState('')
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState<string | null>(null)
  const limit = 25

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(limit) })
      if (severity) params.set('severity', severity)
      if (query) params.set('rule_id', query)
      const res = await api.get<{ total: number; items: any[] }>(`/platforms/wazuh/alerts?${params}`)
      setItems(res.items)
      setTotal(res.total)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [page, severity, query])

  useEffect(() => { load() }, [load])

  const pages = Math.max(1, Math.ceil(total / limit))

  return (
    <PageLayout title="Security Alerts" subtitle="SIEM — All security alerts across CAP agents (real-time)">
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
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 rounded-lg px-3 py-1.5"
            style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-default)' }}>
            <Search size={12} style={{ color: 'var(--text-muted)' }} />
            <input value={search} onChange={e => setSearch(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { setQuery(search); setPage(1) } }}
              placeholder="Filter by Rule ID…"
              className="bg-transparent text-xs outline-none w-32"
              style={{ color: 'var(--text-primary)' }} />
          </div>
          <button onClick={load} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs border"
            style={{ borderColor: 'var(--border-default)', color: 'var(--text-muted)', background: 'var(--bg-elevated)' }}>
            <RefreshCw size={11} className={loading ? 'animate-spin' : ''} /> Refresh
          </button>
        </div>
      </div>

      {/* Summary */}
      <div className="flex items-center gap-3 text-xs" style={{ color: 'var(--text-muted)' }}>
        <Bell size={13} style={{ color: '#7C3AED' }} />
        <span><strong style={{ color: 'var(--text-primary)' }}>{total.toLocaleString()}</strong> alerts found</span>
        {severity && <span>· <strong style={{ color: 'var(--text-primary)' }}>{severity}</strong> only</span>}
      </div>

      {/* Table */}
      <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--border-default)', background: 'var(--bg-surface)' }}>
        <div className="grid text-[10px] font-semibold uppercase tracking-wider px-4 py-2.5"
          style={{ gridTemplateColumns: '80px 2fr 1fr 120px 90px 140px', borderBottom: '1px solid var(--border-subtle)', background: 'var(--bg-elevated)', color: 'var(--text-muted)' }}>
          <span>Rule ID</span>
          <span>Description</span>
          <span>Agent</span>
          <span>Source IP</span>
          <span>Level</span>
          <span>Timestamp</span>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16 gap-2" style={{ color: 'var(--text-muted)' }}>
            <RefreshCw size={14} className="animate-spin" />
            <span className="text-sm">Loading alerts…</span>
          </div>
        ) : error ? (
          <div className="flex items-center justify-center py-16 gap-2" style={{ color: '#EF4444' }}>
            <AlertTriangle size={14} /><span className="text-sm">{error}</span>
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-2" style={{ color: 'var(--text-muted)' }}>
            <Bell size={24} style={{ opacity: 0.3 }} />
            <span className="text-sm">No alerts found</span>
          </div>
        ) : (
          items.map((a, i) => (
            <div key={a.id || i} className="grid items-center px-4 py-3"
              style={{
                gridTemplateColumns: '80px 2fr 1fr 120px 90px 140px',
                borderBottom: i < items.length - 1 ? '1px solid var(--border-subtle)' : undefined,
              }}>
              <span className="text-xs font-mono" style={{ color: '#7C3AED' }}>{a.rule}</span>
              <span className="text-xs pr-4 truncate" style={{ color: 'var(--text-primary)' }} title={a.description}>
                {a.description}
              </span>
              <span className="text-xs truncate" style={{ color: 'var(--text-secondary)' }} title={a.agent}>
                {a.agent}
              </span>
              <span className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>{a.ip}</span>
              <SeverityBadge severity={a.level} />
              <span className="text-xs tabular-nums" style={{ color: 'var(--text-muted)' }}>
                {a.timestamp?.replace?.(' ', '\u00A0') ?? '—'}
              </span>
            </div>
          ))
        )}
      </div>

      {/* Pagination */}
      {pages > 1 && (
        <div className="flex items-center justify-between">
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
            Page {page} of {pages} · {total.toLocaleString()} total
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
