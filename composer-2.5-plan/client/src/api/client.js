const API_URL = import.meta.env.VITE_API_URL || '';

class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

async function request(path, options = {}) {
  const res = await fetch(`${API_URL}${path}`, {
    credentials: 'include',
    headers: {
      ...(options.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
      ...options.headers,
    },
    ...options,
  });

  if (res.status === 401 && !path.includes('/auth/login') && !path.includes('/auth/refresh')) {
    const refreshed = await fetch(`${API_URL}/api/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
    });

    if (refreshed.ok) {
      return request(path, options);
    }
  }

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new ApiError(data.error || 'Request failed', res.status);
  }

  return data;
}

export const api = {
  login: (email, password) =>
    request('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  logout: () => request('/api/auth/logout', { method: 'POST' }),

  getMe: () => request('/api/users/me'),

  forgotPassword: (email) =>
    request('/api/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    }),

  resetPassword: (token, password) =>
    request('/api/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ token, password }),
    }),

  updateProfile: (data) =>
    request('/api/users/me', {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  getUsers: () => request('/api/users'),

  createUser: (data) =>
    request('/api/users', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateUser: (id, data) =>
    request(`/api/users/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  getDocuments: (q) => {
    const params = q ? `?q=${encodeURIComponent(q)}` : '';
    return request(`/api/documents${params}`);
  },

  getDocument: (id) => request(`/api/documents/${id}`),

  uploadDocument: (formData) =>
    request('/api/documents', {
      method: 'POST',
      body: formData,
    }),

  deleteDocument: (id) =>
    request(`/api/documents/${id}`, { method: 'DELETE' }),

  downloadDocument: async (id, filename) => {
    const res = await fetch(`${API_URL}/api/documents/${id}/download`, {
      credentials: 'include',
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new ApiError(data.error || 'Download failed', res.status);
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  },

  getComments: (documentId) => request(`/api/documents/${documentId}/comments`),

  addComment: (documentId, body) =>
    request(`/api/documents/${documentId}/comments`, {
      method: 'POST',
      body: JSON.stringify({ body }),
    }),
};

export { ApiError };
