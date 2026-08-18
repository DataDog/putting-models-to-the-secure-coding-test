// Unless explicitly stated otherwise all files in this repository are licensed under the Apache-2.0 License.
// This product includes software developed at Datadog (https://www.datadoghq.com/) Copyright 2026 Datadog, Inc.

import { apiRequest } from './api.js';

let currentUser = null;
const listeners = new Set();

function notify() {
  listeners.forEach((fn) => fn(currentUser));
}

export function onAuthChange(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function getCurrentUser() {
  return currentUser;
}

export async function refreshCurrentUser() {
  try {
    const { user } = await apiRequest('/api/auth/me');
    currentUser = user;
  } catch {
    currentUser = null;
  }
  notify();
  return currentUser;
}

export async function login(email, password) {
  const { user } = await apiRequest('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  currentUser = user;
  notify();
  return user;
}

export async function register(email, password, name) {
  const { user } = await apiRequest('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({ email, password, name }),
  });
  currentUser = user;
  notify();
  return user;
}

export async function logout() {
  try {
    await apiRequest('/api/auth/logout', { method: 'POST' });
  } finally {
    currentUser = null;
    notify();
  }
}
