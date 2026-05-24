interface FetchOptions extends RequestInit {
  timeout?: number;
}

export async function apiFetch<T>(url: string, options: FetchOptions = {}): Promise<T> {
  const { timeout = 15000, ...fetchOptions } = options;

  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);

  const token = localStorage.getItem('token');
  const headers = new Headers(fetchOptions.headers || {});
  
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  
  if (!headers.has('Content-Type') && !(fetchOptions.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  try {
    const response = await fetch(url, {
      ...fetchOptions,
      headers,
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
        detail = errorData.detail || errorData.message || detail;
      } catch (e) {
        // Not JSON
        detail = await response.text() || detail;
      }
      throw { response: { status: response.status, data: { detail } } }; // Mocking Axios error structure
    }

    // Check if empty response
    const text = await response.text();
    if (!text) {
      return {} as T;
    }
    
    return JSON.parse(text) as T;

  } catch (error: any) {
    clearTimeout(id);
    if (error.name === 'AbortError') {
      throw { response: { status: 408, data: { detail: 'Request Timeout' } } };
    }
    // Re-throw if it's already our custom error structure
    if (error.response) {
      throw error;
    }
    throw { response: null, message: error.message }; // Mocking network error
  }
}
