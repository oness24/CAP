import { useState, useEffect, useRef, useCallback } from 'react'
import { api } from '@/lib/api'

interface PagedResult<T> {
  items: T[]
  total: number
  isLoading: boolean
  error: string | null
  page: number
  setPage: (page: number) => void
}

export function usePagedData<T = Record<string, unknown>>(
  path: string,
  params: Record<string, string | number> = {},
  limit: number = 25,
): PagedResult<T> {
  const [items, setItems] = useState<T[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)
  const paramsKey = JSON.stringify(params)

  const load = useCallback(() => {
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller
    setIsLoading(true)
    setError(null)

    const qs = new URLSearchParams({ page: String(page), limit: String(limit) })
    Object.entries(params).forEach(([k, v]) => { if (v) qs.set(k, String(v)) })

    api
      .get<{ items: T[]; total: number }>(`${path}?${qs}`, { signal: controller.signal })
      .then((res) => { setItems(res.items); setTotal(res.total); setIsLoading(false) })
      .catch((err: Error) => {
        if (err.name === 'AbortError') return
        setError(err.message)
        setIsLoading(false)
      })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path, page, limit, paramsKey])

  useEffect(() => { load(); return () => abortRef.current?.abort() }, [load])

  return { items, total, isLoading, error, page, setPage }
}
