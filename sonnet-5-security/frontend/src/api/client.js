const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

function readCookie(name) {
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

function csrfHeader() {
  // Double-submit CSRF: read the readable csrf cookie and echo it back as a
  // header; the server cross-checks it against the session record.
  const token = readCookie('csrf') || readCookie('__Host-csrf');
  return token ? { 'X-CSRF-Token': token } : {};
}

async function request(path, { method = 'GET', body, headers = {} } = {}) {
  const isMutating = method !== 'GET' && method !== 'HEAD';
  const isFormData = body instanceof FormData;

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    credentials: 'include',
    headers: {
      ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
      ...(isMutating ? csrfHeader() : {}),
      ...headers,
    },
    body: body === undefined ? undefined : isFormData ? body : JSON.stringify(body),
  });

  const contentType = response.headers.get('content-type') || '';
  const data = contentType.includes('application/json') ? await response.json() : null;

  if (!response.ok) {
    const message = data?.error || `Request failed (${response.status})`;
    throw new Error(message);
  }

  return data;
}

export const api = {
  get: (path) => request(path),
  post: (path, body) => request(path, { method: 'POST', body }),
  patch: (path, body) => request(path, { method: 'PATCH', body }),
  delete: (path) => request(path, { method: 'DELETE' }),
};

export { API_BASE_URL };
