// Point this at your deployed backend before publishing the frontend (e.g.
// to GitHub Pages). GitHub Pages only serves static files — the API and
// Postgres must be hosted separately. See README.md.
export const API_BASE_URL = window.__DOCUMENT_PORTAL_API_BASE_URL__ || 'http://localhost:3000';
