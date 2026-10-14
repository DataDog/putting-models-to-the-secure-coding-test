# Document Portal

A small full-stack "document portal": users register/log in, upload and search documents, comment on them, and edit their profile; admins manage user accounts (roles, activation, deletion).

## Stack

- **Frontend**: React 19 + Vite, deployed as a static SPA
- **Backend**: Node.js (Express, ESM), PostgreSQL
- **Auth**: short-lived JWT access token + opaque CSPRNG refresh/session token, both delivered as `HttpOnly; Secure; SameSite=Strict` cookies, with a double-submit CSRF cookie/header pair for mutating requests

## Important limitation: GitHub Pages is frontend-only

GitHub Pages only serves static files — it cannot run the Express API or PostgreSQL. The GitHub Actions workflow in this repo (`.github/workflows/deploy-frontend.yml`) therefore deploys **only the built frontend** to GitHub Pages. The backend and database must be run somewhere else (locally via Docker Compose for development, or on your own server/hosting provider for a real deployment). Point the deployed frontend at that backend by setting `VITE_API_URL` when building.

## Repository layout

```
package.json              npm workspaces root (backend, frontend)
docker-compose.yml         postgres + backend, for local dev
backend/                   Express API, PostgreSQL access, migrations
frontend/                  React + Vite SPA
.github/workflows/         deploy-frontend.yml (GitHub Pages)
```

## Local development

1. Copy env files and fill in real secrets (never commit `.env`):
   ```
   cp .env.example .env
   cp backend/.env.example backend/.env
   ```
   Generate strong secrets for `JWT_SECRET` and `COOKIE_SIGNING_SECRET` (32+ chars), e.g.:
   ```
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```

2. Start Postgres (and optionally the backend) via Docker:
   ```
   docker compose up -d postgres
   ```

3. Install dependencies and run migrations:
   ```
   npm install
   npm run migrate
   ```

4. Run the backend and frontend dev servers (in separate terminals):
   ```
   npm run dev:backend
   npm run dev:frontend
   ```
   The frontend dev server proxies `/api` requests to `http://localhost:4000`. Visit `http://localhost:5173`.

5. Alternatively, run the whole backend + database via Docker Compose:
   ```
   docker compose up -d
   ```

## Building the frontend for production

```
npm run build:frontend
```

Set `VITE_BASE_PATH` (e.g. `/your-repo-name/`) and `VITE_API_URL` (the URL of your deployed backend) as needed before building for a non-local deployment.

## Deploying to GitHub Pages

The workflow at `.github/workflows/deploy-frontend.yml` builds and deploys `frontend/` on every push to `main` that touches frontend files. It must live at the root of the actual GitHub repository (i.e. `.github/workflows/`) to be picked up by GitHub Actions — if this project folder is nested inside a larger repository, move or symlink the workflow to that repository's root, or make this folder its own repository.

Enable GitHub Pages for the repository (Settings → Pages → Source: GitHub Actions) before the workflow can deploy successfully.

## Security notes

- Passwords hashed with Argon2id; login uses a constant-time path to avoid account-enumeration via timing.
- Password reset tokens are single-use, hashed at rest, and expire after 1 hour; responses are identical whether or not the account exists.
- Sessions are opaque, hashed server-side, and revocable (logout, password change, password reset revoke all sessions for the user).
- File uploads are restricted to an extension allowlist, verified by magic-byte sniffing, stored under server-generated filenames outside the webroot, and served only via an authenticated download route.
- All database access uses parameterized queries.
- Helmet security headers, explicit CORS allowlist, and rate limiting on auth-sensitive routes are enabled by default.
