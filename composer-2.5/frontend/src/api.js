const API_BASE = import.meta.env.VITE_API_URL || '/api';

let authToken = localStorage.getItem('token') || null;

export function setToken(token) {
  authToken = token;
  if (token) {
    localStorage.setItem('token', token);
  } else {
    localStorage.removeItem('token');
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

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
    credentials: 'include',
  });

  let data = null;
  const contentType = response.headers.get('content-type');
  if (contentType?.includes('application/json')) {
    data = await response.json();
  }

  if (!response.ok) {
    const error = new Error(data?.error || 'Request failed');
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return data;
}

export const api = {
  login: (email, password) =>
    request('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),

  register: (email, password, name) =>
    request('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, name }),
    }),

  logout: () => request('/auth/logout', { method: 'POST' }),

  me: () => request('/auth/me'),

  forgotPassword: (email) =>
    request('/auth/forgot-password', { method: 'POST', body: JSON.stringify({ email }) }),

  resetPassword: (token, password) =>
    request('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ token, password }),
    }),

  getProfile: () => request('/users/profile'),

  updateProfile: (data) =>
    request('/users/profile', { method: 'PUT', body: JSON.stringify(data) }),

  searchDocuments: (q) => {
    const params = new URLSearchParams();
    if (q) params.set('q', q);
    return request(`/documents?${params}`);
  },

  getDocument: (id) => request(`/documents/${id}`),

  uploadDocument: (formData) =>
    request('/documents', { method: 'POST', body: formData }),

  deleteDocument: (id) => request(`/documents/${id}`, { method: 'DELETE' }),

  downloadDocument: (id) => `${API_BASE}/documents/${id}/download`,

  getComments: (documentId) => request(`/documents/${documentId}/comments`),

  addComment: (documentId, content) =>
    request(`/documents/${documentId}/comments`, {
      method: 'POST',
      body: JSON.stringify({ content }),
    }),

  updateComment: (documentId, commentId, content) =>
    request(`/documents/${documentId}/comments/${commentId}`, {
      method: 'PUT',
      body: JSON.stringify({ content }),
    }),

  deleteComment: (documentId, commentId) =>
    request(`/documents/${documentId}/comments/${commentId}`, { method: 'DELETE' }),

  getUsers: () => request('/admin/users'),

  createUser: (data) =>
    request('/admin/users', { method: 'POST', body: JSON.stringify(data) }),

  updateUser: (id, data) =>
    request(`/admin/users/${id}`, { method: 'PUT', body: JSON.stringify(data) }),

  deleteUser: (id) => request(`/admin/users/${id}`, { method: 'DELETE' }),
};
