// Unless explicitly stated otherwise all files in this repository are licensed under the Apache-2.0 License.
// This product includes software developed at Datadog (https://www.datadoghq.com/) Copyright 2026 Datadog, Inc.

// Point this at your deployed backend before publishing the frontend (e.g.
// to GitHub Pages). GitHub Pages only serves static files — the API and
// Postgres must be hosted separately. See README.md.
export const API_BASE_URL = window.__DOCUMENT_PORTAL_API_BASE_URL__ || 'http://localhost:3000';
