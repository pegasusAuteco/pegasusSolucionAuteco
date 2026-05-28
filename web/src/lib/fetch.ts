// ── ApiError ──────────────────────────────────────────────────────────────────
// Typed error thrown by apiFetch for every non-2xx response and network failure.
// Extends Error so instanceof checks work and stack traces appear in dev tools.
// status = 0 signals a network-level failure (no HTTP response received).
export class ApiError extends Error {
  status: number
  detail: string

  constructor(status: number, detail: string) {
    super(detail)
    this.name = 'ApiError'
    this.status = status
    this.detail = detail
  }
}

interface FetchOptions extends RequestInit {
  timeout?: number
}

// ── apiFetch ──────────────────────────────────────────────────────────────────
// Thin wrapper around the native fetch API that:
//   - Attaches the JWT from localStorage as a Bearer token.
//   - Defaults Content-Type to application/json unless the body is FormData.
//   - Enforces a configurable timeout (default 15 s) via AbortController.
//   - Redirects to /login and throws ApiError(401) on expired/invalid tokens,
//     except during the login request itself to avoid an infinite redirect.
//   - Throws ApiError for any non-2xx status, parsing the JSON detail field.
//   - Throws ApiError(408) on timeout, ApiError(0) on network failure.
export async function apiFetch<T>(url: string, options: FetchOptions = {}): Promise<T> {
  const { timeout = 15000, ...fetchOptions } = options

  // Abort signal used to implement the request timeout.
  const controller = new AbortController()
  const id = setTimeout(() => controller.abort(), timeout)

  // Attach the stored JWT if present.
  const token = localStorage.getItem('token')
  const headers = new Headers(fetchOptions.headers || {})
  if (token) {
    headers.set('Authorization', `Bearer ${token}`)
  }
  if (!headers.has('Content-Type') && !(fetchOptions.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json')
  }

  try {
    const response = await fetch(url, {
      ...fetchOptions,
      headers,
      signal: controller.signal,
    })

    clearTimeout(id)

    // Expired or invalid token — clear storage and redirect to login.
    // Skipped for the login endpoint itself to avoid an infinite redirect loop.
    if (response.status === 401 && !url.includes('/auth/login')) {
      localStorage.removeItem('token')
      localStorage.removeItem('auth_user')
      window.location.href = '/login'
      throw new ApiError(401, 'Unauthorized')
    }

    // Parse the error detail from JSON or fall back to plain text.
    if (!response.ok) {
      let detail = 'Error fetching data'
      try {
        const errorData = await response.json()
        detail = errorData.detail || errorData.message || detail
      } catch {
        detail = (await response.text()) || detail
      }
      throw new ApiError(response.status, detail)
    }

    // Return empty object for 204 No Content or other empty bodies.
    const text = await response.text()
    if (!text) return {} as T

    return JSON.parse(text) as T

  } catch (error: unknown) {
    clearTimeout(id)

    // Re-throw errors we already classified.
    if (error instanceof ApiError) throw error

    // AbortController fired — the request exceeded the timeout.
    if (error instanceof Error && error.name === 'AbortError') {
      throw new ApiError(408, 'Request Timeout')
    }

    // Any other exception (DNS failure, refused connection, etc.).
    const message = error instanceof Error ? error.message : 'Network error'
    throw new ApiError(0, message)
  }
}
