import { useState, useEffect, useCallback } from 'react'
import { Server, RefreshCw, AlertTriangle, CheckCircle, XCircle, ChevronLeft, ChevronRight, Search } from 'lucide-react'
import { api } from '@/lib/api'
import { PageLayout } from '@/layouts/PageLayout'

function StatusBadge({ status }: { status: string }) {
  const isUp = status === 'Up'
  return (
    <span className="flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full"
      style={{
        background: isUp ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)',
        color: isUp ? '#22C55E' : '#EF4444',
      }}>
      {isUp ? <CheckCircle size={9} /> : <XCircle size={9} />}
      {status}
    </span>
  )
}

export default function HostAvailability() {
  const [items, setItems]   = useState<any[]>([])
  const [total, setTotal]   = useState(0)
  const [page, setPage]     = useState(1)
  const [search, setSearch] = useState('')
  const [query, setQuery]   = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError]   = useState<string | null>(null)
  const limit = 50

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(limit) })
      if (query) params.set('search', query)
      const res = await api.get<{ total: number; items: any[] }>(`/platforms/zabbix/hosts?${params}`)
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
  const upCount   = items.filter(h => h.status === 'Up').length
  const downCount = items.filter(h => h.status === 'Down').length

  return (
    <PageLayout title="Host Availability" subtitle="Zabbix — Per-host uptime status">

      {/* Search + stats */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2 rounded-lg px-3 py-2 flex-1 max-w-sm"
          style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-default)' }}>
          <Search size={13} style={{ color: 'var(--text-muted)' }} />
          <input value={search} onChange={e => setSearch(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') { setQuery(search); setPage(1) } }}
            placeholder="Search hosts… (Enter)"
            className="bg-transparent text-xs outline-none flex-1"
            style={{ color: 'var(--text-primary)' }} />
        </div>
        <div className="flex items-center gap-4 text-xs" style={{ color: 'var(--text-muted)' }}>
          <span><strong style={{ color: 'var(--text-primary)' }}>{total}</strong> hosts</span>
          <span className="flex items-center gap-1" style={{ color: '#22C55E' }}>
            <CheckCircle size={11} /> {upCount} up
          </span>
          <span className="flex items-center gap-1" style={{ color: downCount > 0 ? '#EF4444' : 'var(--text-muted)' }}>
            <XCircle size={11} /> {downCount} down
          </span>
        </div>
        <button onClick={load} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs border"
          style={{ borderColor: 'var(--border-default)', color: 'var(--text-muted)', background: 'var(--bg-elevated)' }}>
          <RefreshCw size={11} className={loading ? 'animate-spin' : ''} /> Refresh
        </button>
      </div>

      {/* Table */}
      <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--border-default)', background: 'var(--bg-surface)' }}>
        <div className="grid text-[10px] font-semibold uppercase tracking-wider px-4 py-2.5"
          style={{ gridTemplateColumns: '1fr 1.5fr 100px 1fr', borderBottom: '1px solid var(--border-subtle)', background: 'var(--bg-elevated)', color: 'var(--text-muted)' }}>
          <span>Host</span>
          <span>Display Name</span>
          <span>Status</span>
          <span>IP / Groups</span>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16 gap-2" style={{ color: 'var(--text-muted)' }}>
            <RefreshCw size={14} className="animate-spin" />
            <span className="text-sm">Loading hosts…</span>
          </div>
        ) : error ? (
          <div className="flex items-center justify-center py-16 gap-2" style={{ color: '#EF4444' }}>
            <AlertTriangle size={14} /><span className="text-sm">{error}</span>
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-2" style={{ color: 'var(--text-muted)' }}>
            <Server size={24} style={{ opacity: 0.3 }} />
            <span className="text-sm">No hosts found</span>
          </div>
        ) : (
          items.map((h, i) => (
            <div key={h.id} className="grid items-center px-4 py-3"
              style={{ gridTemplateColumns: '1fr 1.5fr 100px 1fr', borderBottom: i < items.length - 1 ? '1px solid var(--border-subtle)' : undefined }}>
              <span className="text-xs font-mono truncate" style={{ color: 'var(--text-primary)' }} title={h.host}>
                {h.host}
              </span>
              <span className="text-xs truncate pr-4" style={{ color: 'var(--text-secondary)' }} title={h.name}>
                {h.name || '—'}
              </span>
              <StatusBadge status={h.status} />
              <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
                {h.ip && <span className="font-mono">{h.ip}</span>}
                {h.groups?.length > 0 && (
                  <span className="ml-2 opacity-60 text-[10px]">{h.groups.slice(0,2).join(', ')}</span>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {pages > 1 && (
        <div className="flex items-center justify-between">
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
            Page {page} of {pages} · {total} hosts
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
