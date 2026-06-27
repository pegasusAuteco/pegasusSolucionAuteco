/**
 * Fetch wrapper with automatic timeout, JSON parsing, and auth handling.
 *
 * Features:
 * - Configurable request timeout (default 15s)
 * - Auto-redirect to /login on 401 responses
 * - JSON response parsing with error extraction
 * - FormData support without Content-Type header override
 */
export async function apiFetch(url, options = {}) {
  const { timeout = 15000, ...fetchOptions } = options;

  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);

  const headers = new Headers(fetchOptions.headers || {});

  if (!headers.has('Content-Type') && !(fetchOptions.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  try {
    const response = await fetch(url, {
      ...fetchOptions,
      headers,
      credentials: 'include',
      signal: controller.signal,
    });

    clearTimeout(id);

    if (response.status === 401 && !url.includes('/auth/login')) {
      localStorage.removeItem('token');
      localStorage.removeItem('auth_user');
      window.location.href = '/login';
      throw new Error('Unauthorized');
    }

    if (!response.ok) {
      let detail = 'Error fetching data';
      try {
        const errorData = await response.json();
        detail = errorData.detail || errorData.message || errorData.error || detail;
      } catch (e) {
        detail = await response.text() || detail;
      }
      throw { response: { status: response.status, data: { detail } } };
    }

    const text = await response.text();
    if (!text) {
      return {};
    }

    return JSON.parse(text);

  } catch (error) {
    clearTimeout(id);
    if (error.name === 'AbortError') {
      throw { response: { status: 408, data: { detail: 'Request Timeout' } } };
    }
    if (error.response) {
      throw error;
    }
    throw { response: null, message: error.message };
  }
}
