import { useState, useEffect, useCallback } from 'react'
import { Users, RefreshCw, Search, ChevronLeft, ChevronRight, AlertTriangle, Wifi, WifiOff } from 'lucide-react'
import { api } from '@/lib/api'
import { PageLayout } from '@/layouts/PageLayout'
import { StatusBadge } from '@/components/badges/StatusBadge'

const STATUS_STYLES: Record<string, string> = {
  active: 'Online',
  disconnected: 'Offline',
  never_connected: 'Offline',
}

export default function Agents() {
  const [items, setItems]     = useState<any[]>([])
  const [total, setTotal]     = useState(0)
  const [page, setPage]       = useState(1)
  const [search, setSearch]   = useState('')
  const [query, setQuery]     = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState<string | null>(null)
  const limit = 25

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(limit) })
      if (query) params.set('search', query)
      const res = await api.get<{ total: number; items: any[] }>(`/platforms/wazuh/agents?${params}`)
      setItems(res.items)
      setTotal(res.total)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [page, query])

  useEffect(() => { load() }, [load])

  const pages = Math.max(1, Math.ceil(total / limit))
  const activeCount = items.filter(a => a.status === 'active').length
  const offlineCount = items.filter(a => a.status !== 'active').length

  return (
    <PageLayout title="Agent Management" subtitle="SIEM — Wazuh CAP agent enrollment, health and status">
      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Agents', value: total, icon: Users, color: '#7C3AED' },
          { label: 'Active', value: activeCount, icon: Wifi, color: '#10B981' },
          { label: 'Disconnected', value: offlineCount, icon: WifiOff, color: '#EF4444' },
          { label: 'Page', value: `${page} / ${pages}`, icon: ChevronRight, color: '#6366F1' },
        ].map(c => (
          <div key={c.label} className="rounded-xl px-4 py-4" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)' }}>
            <div className="flex items-center gap-2">
              <c.icon size={14} style={{ color: c.color }} />
              <p className="text-xs uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>{c.label}</p>
            </div>
            <p className="text-xl font-bold mt-1" style={{ color: 'var(--text-primary)' }}>{c.value}</p>
          </div>
        ))}
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 rounded-lg px-3 py-1.5"
          style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-default)' }}>
          <Search size={12} style={{ color: 'var(--text-muted)' }} />
          <input value={search} onChange={e => setSearch(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') { setQuery(search); setPage(1) } }}
            placeholder="Search hostname or IP…"
            className="bg-transparent text-xs outline-none w-48"
            style={{ color: 'var(--text-primary)' }} />
        </div>
        <button onClick={load} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs border"
          style={{ borderColor: 'var(--border-default)', color: 'var(--text-muted)', background: 'var(--bg-elevated)' }}>
          <RefreshCw size={11} className={loading ? 'animate-spin' : ''} /> Refresh
        </button>
      </div>

      {/* Table */}
      <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--border-default)', background: 'var(--bg-surface)' }}>
        <div className="grid text-[10px] font-semibold uppercase tracking-wider px-4 py-2.5"
          style={{ gridTemplateColumns: '50px 1.5fr 120px 80px 1fr 100px 1fr 150px', borderBottom: '1px solid var(--border-subtle)', background: 'var(--bg-elevated)', color: 'var(--text-muted)' }}>
          <span>ID</span><span>Name</span><span>IP</span><span>Status</span>
          <span>OS</span><span>Version</span><span>Group</span><span>Last Keepalive</span>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16 gap-2" style={{ color: 'var(--text-muted)' }}>
            <RefreshCw size={14} className="animate-spin" />
            <span className="text-sm">Loading agents…</span>
          </div>
        ) : error ? (
          <div className="flex items-center justify-center py-16 gap-2" style={{ color: '#EF4444' }}>
            <AlertTriangle size={14} /><span className="text-sm">{error}</span>
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-2" style={{ color: 'var(--text-muted)' }}>
            <Users size={24} style={{ opacity: 0.3 }} />
            <span className="text-sm">No agents found</span>
          </div>
        ) : (
          items.map((a, i) => (
            <div key={a.id || i} className="grid items-center px-4 py-3"
              style={{
                gridTemplateColumns: '50px 1.5fr 120px 80px 1fr 100px 1fr 150px',
                borderBottom: i < items.length - 1 ? '1px solid var(--border-subtle)' : undefined,
              }}>
              <span className="text-xs font-mono" style={{ color: '#7C3AED' }}>{a.id}</span>
              <span className="text-xs font-medium truncate" style={{ color: 'var(--text-primary)' }} title={a.name}>{a.name}</span>
              <span className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>{a.ip}</span>
              <StatusBadge status={STATUS_STYLES[a.status] ?? a.status} />
              <span className="text-xs truncate" style={{ color: 'var(--text-secondary)' }}>{a.os}</span>
              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{a.osVersion}</span>
              <span className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>{a.group}</span>
              <span className="text-xs tabular-nums" style={{ color: 'var(--text-muted)' }}>
                {a.lastKeepAlive?.replace?.('T', ' ').slice(0, 19) ?? '—'}
              </span>
            </div>
          ))
        )}
      </div>

      {/* Pagination */}
      {pages > 1 && (
        <div className="flex items-center justify-between">
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Page {page} of {pages} · {total} agents</span>
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
