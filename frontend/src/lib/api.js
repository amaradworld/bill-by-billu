const API = import.meta.env.VITE_API_URL || '';
const REQUEST_TIMEOUT = 30000;

let tokenGetter = () => null;

export function setTokenGetter(fn) {
  tokenGetter = fn;
}

// Called when an authenticated request comes back 401 (expired/invalid session).
let unauthorizedHandler = null;
export function setUnauthorizedHandler(fn) {
  unauthorizedHandler = fn;
}

async function request(path, options = {}) {
  const token = tokenGetter();
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

  try {
    const res = await fetch(`${API}${path}`, {
      ...options,
      headers,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      // Global session-expiry handling: a 401 on any non-auth endpoint means the
      // token is no longer valid. Auth endpoints (login/register/google) return
      // 401 for bad credentials, so they must not trigger a global logout.
      if (res.status === 401 && unauthorizedHandler && !path.startsWith('/api/auth/')) {
        unauthorizedHandler();
      }
      const msg = data.details
        ? data.details.map(d => `${d.path.join('.')}: ${d.message}`).join('; ')
        : data.error || `Request failed (${res.status})`;
      throw new Error(msg);
    }

    return data;
  } catch (err) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') {
      throw new Error('Request timed out. Please try again.');
    }
    throw err;
  }
}

export const api = {
  get: (path, options) => request(path, options),
  post: (path, body, options) => request(path, { ...options, method: 'POST', body: JSON.stringify(body) }),
  put: (path, body, options) => request(path, { ...options, method: 'PUT', body: JSON.stringify(body) }),
  delete: (path, options) => request(path, { ...options, method: 'DELETE' }),
};
