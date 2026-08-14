# Document Portal

A small, security-conscious "document portal" reference app: users log in, upload
documents, search them, comment on them, and edit their profile. Admins manage
users. Built to demonstrate secure-by-default patterns for the following
requirements:

- **Frontend**: static vanilla-JS SPA in `client/`
- **Backend API**: Express app in `server/`
- **Auth**: JWT access tokens delivered via httpOnly cookies, backed by an
  opaque, rotating refresh token ("session cookie") persisted in Postgres
- **Multiple user roles**: `user` and `admin`, enforced server-side
- **Password reset / forgot password**: single-use, hashed, time-limited
  tokens; no account-enumeration in responses
- **Database**: PostgreSQL, all queries parameterized
- **Search**: server-side, parameterized `ILIKE` search with wildcard
  escaping and pagination
- **File upload**: type/size validated (extension + magic-byte sniffing),
  stored under randomized names outside any publicly-served directory,
  streamed back only after an authorization check
- **Comments**: stored as plain text, rendered as text (never HTML) on the
  client to prevent XSS
- **Profile editing**: requires current password to change password/email

## Why these choices ("JWT + session cookies")

The access token is a short-lived JWT (15 min), but it is never exposed to
JavaScript — it's set as an `httpOnly`, `Secure`, `SameSite=Strict` cookie.
A long-lived opaque refresh token (7 days) is stored the same way and is
tracked server-side in the `refresh_tokens` table so it can be revoked
(logout, password change, admin disable). This gets JWT's stateless
verification for normal requests plus a server-side kill switch, without ever
putting a token where XSS could read it. Because auth relies on cookies,
all state-changing requests require a CSRF token (double-submit cookie +
`X-CSRF-Token` header).

## Project layout

```
db/schema.sql          Postgres schema
server/                Express API (Node.js, npm)
client/                Static frontend (no build step) — deployable to GitHub Pages
.github/workflows/     CI: deploys client/ to GitHub Pages
```

## Local setup

### 1. Database

```bash
createdb document_portal
psql document_portal -f db/schema.sql
```

### 2. Backend

```bash
cd server
cp ../.env.example .env   # fill in DATABASE_URL, JWT_SECRET, SESSION_SECRET, SMTP_*
npm install
npm run dev                # http://localhost:3000
```

Required environment variables (see `.env.example`):

- `DATABASE_URL` — Postgres connection string
- `JWT_SECRET` — random 32+ byte secret for signing access tokens
- `COOKIE_SECRET` — random 32+ byte secret for signing cookies
- `NODE_ENV` — `development` or `production` (controls `Secure` cookie flag)
- `CLIENT_ORIGIN` — origin allowed by CORS, e.g. `http://localhost:5500`
- `SMTP_*` — optional; if unset, password-reset emails are logged to the
  server console instead of sent, so you can develop without a mail server

### 3. Frontend

`client/` is plain HTML/CSS/JS with no build step. Serve it with any static
file server and point it at the API:

```bash
cd client
npx serve .                 # or: python3 -m http.server 5500
```

Edit `client/js/config.js` to set `API_BASE_URL` to your backend's URL.

## Deploying the frontend to GitHub Pages

`.github/workflows/deploy-pages.yml` publishes the contents of `client/` to
GitHub Pages on every push to `main`. **GitHub Pages only serves static
files** — it cannot run the Express API or Postgres. Deploy `server/` (and
Postgres) separately (e.g. Fly.io, Render, a VM, ECS, etc.), then set
`API_BASE_URL` in `client/js/config.js` (or inject it at build time) to that
backend's public URL before the workflow runs, and set `CLIENT_ORIGIN` on the
backend to your Pages URL so CORS allows it.

In the repo's Settings → Pages, set the source to "GitHub Actions".

## Security notes / what's intentionally NOT done

- No secrets are committed; `.env` is gitignored and `.env.example` has
  placeholders only.
- File uploads are not virus-scanned in this reference app — the intended
  integration point is `server/src/routes/documents.routes.js`
  (`scanFileForMalware` stub) where you'd shell out to ClamAV or similar
  before persisting the upload.
- Rate limiting is applied to auth and password-reset endpoints to slow
  brute-forcing and enumeration; tune the limits for production traffic.
