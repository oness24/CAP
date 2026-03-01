import { useState } from 'react'
import { ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react'
import { clsx } from 'clsx'

export interface ColumnDef<T> {
  key: keyof T | string
  label: string
  sortable?: boolean
  width?: string
  render?: (value: unknown, row: T) => React.ReactNode
}

interface DataTableProps<T extends object> {
  columns: ColumnDef<T>[]
  data: T[]
  pageSize?: number
  onRowClick?: (row: T) => void
  emptyMessage?: string
}

export function DataTable<T extends object>({ columns, data, pageSize = 8, onRowClick, emptyMessage = 'No data available' }: DataTableProps<T>) {
  const [sortKey, setSortKey] = useState<string | null>(null)
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')
  const [page, setPage] = useState(0)

  const sorted = [...data].sort((a, b) => {
    if (!sortKey) return 0
    const av = (a as Record<string, unknown>)[sortKey]
    const bv = (b as Record<string, unknown>)[sortKey]
    if (av === undefined || bv === undefined) return 0
    const cmp = String(av).localeCompare(String(bv), undefined, { numeric: true })
    return sortDir === 'asc' ? cmp : -cmp
  })

  const totalPages = Math.ceil(sorted.length / pageSize)
  const paginated = sorted.slice(page * pageSize, (page + 1) * pageSize)

  function handleSort(key: string) {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir('asc')
    }
  }

  return (
    <div className="flex flex-col gap-0">
      <div className="overflow-x-auto rounded-xl" style={{ border: '1px solid var(--border-default)', background: 'var(--bg-elevated)', boxShadow: 'var(--shadow-soft)' }}>
        <table className="w-full text-sm">
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border-default)', background: 'rgba(255,255,255,0.02)' }}>
              {columns.map((col) => (
                <th
                  key={String(col.key)}
                  className={clsx('px-4 py-3 text-left font-medium text-xs tracking-wider uppercase select-none', col.sortable && 'cursor-pointer hover:text-white transition-colors')}
                  style={{ color: 'var(--text-muted)', width: col.width }}
                  onClick={() => col.sortable && handleSort(String(col.key))}
                >
                  <span className="inline-flex items-center gap-1">
                    {col.label}
                    {col.sortable && (
                      sortKey === String(col.key)
                        ? sortDir === 'asc' ? <ChevronUp size={13} /> : <ChevronDown size={13} />
                        : <ChevronsUpDown size={13} className="opacity-40" />
                    )}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paginated.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-12 text-center text-sm" style={{ color: 'var(--text-muted)' }}>
                  {emptyMessage}
                </td>
              </tr>
            ) : paginated.map((row, ri) => (
              <tr
                key={ri}
                className={clsx('transition-colors', onRowClick && 'cursor-pointer')}
                style={{ borderBottom: ri < paginated.length - 1 ? '1px solid var(--border-subtle)' : undefined }}
                onMouseEnter={(e) => { if (onRowClick) (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.03)' }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = '' }}
                onClick={() => onRowClick?.(row)}
              >
                {columns.map((col) => {
                  const val = (row as Record<string, unknown>)[String(col.key)]
                  return (
                    <td key={String(col.key)} className="px-4 py-3" style={{ color: 'var(--text-secondary)' }}>
                      {col.render ? col.render(val, row) : <span className="text-sm">{String(val ?? '—')}</span>}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between px-1 pt-3">
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
            {page * pageSize + 1}–{Math.min((page + 1) * pageSize, data.length)} of {data.length}
          </span>
          <div className="flex gap-1">
            <button
              disabled={page === 0}
              onClick={() => setPage((p) => p - 1)}
              className="px-2.5 py-1 text-xs rounded-md disabled:opacity-30 transition-colors"
              style={{ background: 'var(--bg-overlay)', color: 'var(--text-secondary)', border: '1px solid var(--border-default)' }}
            >Prev</button>
            <button
              disabled={page >= totalPages - 1}
              onClick={() => setPage((p) => p + 1)}
              className="px-2.5 py-1 text-xs rounded-md disabled:opacity-30 transition-colors"
              style={{ background: 'var(--bg-overlay)', color: 'var(--text-secondary)', border: '1px solid var(--border-default)' }}
            >Next</button>
          </div>
        </div>
      )}
    </div>
  )
}
