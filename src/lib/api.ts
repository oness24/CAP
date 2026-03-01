/**
 * Authenticated HTTP client.
 * Reads tokens from authStore, auto-refreshes on 401.
 */

const BASE_URLS = Array.from(
  new Set(
    [
      import.meta.env.VITE_API_BASE_URL,
      'http://127.0.0.1:8000/api/v1',
      'http://localhost:8000/api/v1',
    ].filter(Boolean) as string[],
  ),
)

type RequestOptions = {
  signal?: AbortSignal
}

async function requestWithBaseFallback(path: string, init: RequestInit): Promise<Response> {
  let lastError: unknown = null

  for (let index = 0; index < BASE_URLS.length; index++) {
    const baseUrl = BASE_URLS[index]
    try {
      const response = await fetch(`${baseUrl}${path}`, init)

      // If env URL points to a wrong service/port, try local fallbacks.
      if ((response.status === 404 || response.status === 405) && index < BASE_URLS.length - 1) {
        continue
      }

      return response
    } catch (error) {
      lastError = error
    }
  }

  if (lastError instanceof Error) {
    throw lastError
  }
  throw new Error('Failed to fetch')
}

async function authenticatedFetch(
  method: string,
  path: string,
  body?: unknown,
  options?: RequestOptions,
): Promise<unknown> {
  // Import lazily to avoid circular dependency
  const { useAuthStore } = await import('@/store/authStore')
  const { accessToken, refresh, logout } = useAuthStore.getState()

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }
  if (accessToken) headers['Authorization'] = `Bearer ${accessToken}`

  const init: RequestInit = {
    method,
    headers,
    signal: options?.signal,
    body: body ? JSON.stringify(body) : undefined,
  }

  let res = await requestWithBaseFallback(path, init)

  // Auto-refresh on 401
  if (res.status === 401 && accessToken) {
    const refreshed = await refresh()
    if (refreshed) {
      const newToken = useAuthStore.getState().accessToken
      headers['Authorization'] = `Bearer ${newToken}`
      res = await requestWithBaseFallback(path, { ...init, headers })
    } else {
      logout()
      throw new Error('Session expired. Please log in again.')
    }
  }

  if (!res.ok) {
    const text = await res.text()
    let detail = text
    try {
      detail = JSON.parse(text)?.detail ?? text
    } catch {
      // ignore
    }
    throw new Error(detail || `HTTP ${res.status}`)
  }

  return res.json()
}

export const api = {
  get: <T = unknown>(path: string, options?: RequestOptions) =>
    authenticatedFetch('GET', path, undefined, options) as Promise<T>,

  post: <T = unknown>(path: string, body?: unknown, options?: RequestOptions) =>
    authenticatedFetch('POST', path, body, options) as Promise<T>,
}

/** Unauthenticated POST — used for login */
export async function publicPost<T = unknown>(path: string, body: unknown): Promise<T> {
  const res = await requestWithBaseFallback(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data?.detail ?? `HTTP ${res.status}`)
  return data as T
}
