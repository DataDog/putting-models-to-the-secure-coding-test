// Unless explicitly stated otherwise all files in this repository are licensed under the Apache-2.0 License.
// This product includes software developed at Datadog (https://www.datadoghq.com/) Copyright 2026 Datadog, Inc.

import { API_BASE_URL } from './config.js';

function readCookie(name) {
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

class ApiError extends Error {
  constructor(message, status, details) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

let refreshInFlight = null;

async function rawRequest(path, options) {
  const method = (options.method || 'GET').toUpperCase();
  const headers = new Headers(options.headers || {});

  if (options.body && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }
  if (!['GET', 'HEAD', 'OPTIONS'].includes(method)) {
    const csrfToken = readCookie('csrf_token');
    if (csrfToken) headers.set('X-CSRF-Token', csrfToken);
  }

  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    method,
    headers,
    credentials: 'include',
  });

  return res;
}

async function tryRefresh() {
  if (!refreshInFlight) {
    refreshInFlight = rawRequest('/api/auth/refresh', { method: 'POST' }).finally(() => {
      refreshInFlight = null;
    });
  }
  const res = await refreshInFlight;
  return res.ok;
}

export async function apiRequest(path, options = {}) {
  let res = await rawRequest(path, options);

  // Transparent single-retry after refreshing an expired access token, so
  // callers don't need to know about the token lifecycle.
  if (res.status === 401 && path !== '/api/auth/refresh' && path !== '/api/auth/login') {
    const refreshed = await tryRefresh();
    if (refreshed) {
      res = await rawRequest(path, options);
    }
  }

  const contentType = res.headers.get('content-type') || '';
  const body = contentType.includes('application/json') ? await res.json().catch(() => null) : null;

  if (!res.ok) {
    throw new ApiError(body?.error || `Request failed (${res.status})`, res.status, body?.details);
  }
  return body;
}

export async function apiRequestBlob(path) {
  const res = await rawRequest(path, { method: 'GET' });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new ApiError(body?.error || `Request failed (${res.status})`, res.status);
  }
  return res.blob();
}

export { ApiError };
