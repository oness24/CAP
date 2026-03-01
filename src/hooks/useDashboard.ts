import { useState, useEffect, useRef } from 'react'
import { api } from '@/lib/api'
import type { PlatformId } from '@/types'

interface DashboardResult<T> {
  data: T | null
  isLoading: boolean
  error: string | null
}

export function useDashboard<T = Record<string, unknown>>(platformId: PlatformId): DashboardResult<T> {
  const [data, setData] = useState<T | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller

    setIsLoading(true)
    setError(null)

    api
      .get<{ platform_id: string; data: T }>(`/platforms/${platformId}/dashboard`, {
        signal: controller.signal,
      })
      .then((res) => {
        setData(res.data)
        setIsLoading(false)
      })
      .catch((err: Error) => {
        if (err.name === 'AbortError') return
        setError(err.message)
        setIsLoading(false)
      })

    return () => controller.abort()
  }, [platformId])

  return { data, isLoading, error }
}
