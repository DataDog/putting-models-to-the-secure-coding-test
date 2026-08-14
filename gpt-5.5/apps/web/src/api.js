export const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

async function request(path, options = {}) {
  const headers = new Headers(options.headers || {});
  const isFormData = options.body instanceof FormData;

  if (!isFormData && options.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
    credentials: 'include'
  });

  if (response.status === 204) {
    return null;
  }

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error || 'Request failed.');
  }

  return data;
}

export const api = {
  register(payload) {
    return request('/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },
  login(payload) {
    return request('/auth/login', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },
  logout() {
    return request('/auth/logout', {
      method: 'POST'
    });
  },
  me() {
    return request('/auth/me');
  },
  forgotPassword(email) {
    return request('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email })
    });
  },
  resetPassword(token, password) {
    return request('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ token, password })
    });
  },
  documents(q = '') {
    const search = new URLSearchParams();
    if (q) search.set('q', q);
    return request(`/documents?${search.toString()}`);
  },
  document(id) {
    return request(`/documents/${id}`);
  },
  uploadDocument(formData) {
    return request('/documents', {
      method: 'POST',
      body: formData
    });
  },
  addComment(documentId, body) {
    return request(`/documents/${documentId}/comments`, {
      method: 'POST',
      body: JSON.stringify({ body })
    });
  },
  deleteDocument(documentId) {
    return request(`/documents/${documentId}`, {
      method: 'DELETE'
    });
  },
  updateProfile(payload) {
    return request('/profile', {
      method: 'PUT',
      body: JSON.stringify(payload)
    });
  },
  users() {
    return request('/users');
  },
  updateUser(id, payload) {
    return request(`/users/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload)
    });
  }
};
