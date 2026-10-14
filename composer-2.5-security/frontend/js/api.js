const API_URL = typeof __API_URL__ !== 'undefined' ? __API_URL__ : '/api';

let authToken = localStorage.getItem('portal_token') || null;

export function setToken(token) {
  authToken = token;
  if (token) {
    localStorage.setItem('portal_token', token);
  } else {
    localStorage.removeItem('portal_token');
  }
}

export function getToken() {
  return authToken;
}

async function request(path, options = {}) {
  const headers = { ...options.headers };

  if (authToken) {
    headers.Authorization = `Bearer ${authToken}`;
  }

  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
    credentials: 'include',
  });

  let data;
  const contentType = response.headers.get('content-type');
  if (contentType?.includes('application/json')) {
    data = await response.json();
  } else {
    data = await response.blob();
  }

  if (!response.ok) {
    const message = data?.error || `Request failed (${response.status})`;
    throw new Error(message);
  }

  return data;
}

export const api = {
  login: (email, password) =>
    request('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),

  register: (email, password, name) =>
    request('/auth/register', { method: 'POST', body: JSON.stringify({ email, password, name }) }),

  logout: () => request('/auth/logout', { method: 'POST' }),

  me: () => request('/auth/me'),

  forgotPassword: (email) =>
    request('/auth/forgot-password', { method: 'POST', body: JSON.stringify({ email }) }),

  resetPassword: (token, password) =>
    request('/auth/reset-password', { method: 'POST', body: JSON.stringify({ token, password }) }),

  getDocuments: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/documents${qs ? `?${qs}` : ''}`);
  },

  getDocument: (id) => request(`/documents/${id}`),

  uploadDocument: (formData) =>
    request('/documents', { method: 'POST', body: formData }),

  downloadDocument: async (id, filename) => {
    const headers = {};
    if (authToken) headers.Authorization = `Bearer ${authToken}`;

    const response = await fetch(`${API_URL}/documents/${id}/download`, {
      headers,
      credentials: 'include',
    });

    if (!response.ok) throw new Error('Download failed');

    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  },

  deleteDocument: (id) => request(`/documents/${id}`, { method: 'DELETE' }),

  getComments: (documentId) => request(`/documents/${documentId}/comments`),

  addComment: (documentId, content) =>
    request(`/documents/${documentId}/comments`, {
      method: 'POST',
      body: JSON.stringify({ content }),
    }),

  deleteComment: (documentId, commentId) =>
    request(`/documents/${documentId}/comments/${commentId}`, { method: 'DELETE' }),

  updateProfile: (data) =>
    request('/users/profile/me', { method: 'PATCH', body: JSON.stringify(data) }),

  getUsers: () => request('/users'),

  updateUser: (id, data) =>
    request(`/users/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),

  deleteUser: (id) => request(`/users/${id}`, { method: 'DELETE' }),
};

export function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function formatDate(dateStr) {
  return new Date(dateStr).toLocaleString();
}

export function toast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  const el = document.createElement('div');
  el.className = `toast toast-${type}`;
  el.textContent = message;
  container.appendChild(el);
  setTimeout(() => el.remove(), 3500);
}
