# Document Portal

A full-stack document portal where users log in, upload files, search documents, leave comments, and admins manage users.

- **Frontend**: React + Vite (deployed to GitHub Pages)
- **Backend**: Express API + PostgreSQL (hosted separately)
- **Auth**: JWT in httpOnly session cookies with refresh tokens

## Features

- Login / logout with JWT + httpOnly cookies
- Multiple user roles (USER, ADMIN)
- Password reset (forgot password flow)
- Document upload, download, search (PostgreSQL full-text search)
- Comments on documents
- Profile editing (name, email, password)
- Admin user management

## Local development

### Prerequisites

- Node.js 20+
- Docker (for PostgreSQL)
- scfw — use `scfw run` before npm commands locally for secure package installation

### Setup

```bash
cp .env.example .env
scfw run npm install
scfw run npm run db:up
scfw run npm run db:migrate
scfw run npm run db:seed
scfw run npm run dev
```

- Frontend: http://localhost:5173
- API: http://localhost:3000

### Seed accounts

| Email | Password | Role |
|-------|----------|------|
| admin@example.com | admin123 | ADMIN |
| user@example.com | user123 | USER |

## Environment variables

See [`.env.example`](.env.example) for all variables.

**Server**

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_SECRET` | Secret for signing JWTs |
| `CLIENT_ORIGIN` | Frontend URL (for CORS + reset links) |
| `UPLOAD_DIR` | Directory for uploaded files |
| `SMTP_*` | Email config for password reset (optional in dev) |

**Client**

| Variable | Description |
|----------|-------------|
| `VITE_API_URL` | API base URL |

## GitHub Pages deployment

1. Enable **GitHub Pages** with source **GitHub Actions**
2. Add repository secrets:
   - `API_URL` — production API origin (e.g. `https://api.example.com`)
3. Add repository variable (optional):
   - `GITHUB_PAGES_BASE` — set to `/your-repo-name/` for project sites, or `/` for user/org sites
4. Push to `main` — the workflow builds the client and deploys to Pages

## External API deployment

The API and database must be hosted on a platform that supports Node.js and PostgreSQL (Render, Railway, Fly.io, VPS, etc.).

**Checklist**

1. Provision PostgreSQL and set `DATABASE_URL`
2. Set `JWT_SECRET` to a long random string
3. Set `CLIENT_ORIGIN` to your GitHub Pages URL
4. Set `NODE_ENV=production`
5. Configure `SMTP_*` for password reset emails
6. Mount persistent storage for `UPLOAD_DIR`
7. Run migrations: `npm run migrate:deploy -w server`
8. Seed admin user: `npm run seed -w server`
9. Start server: `npm run start -w server`

HTTPS is required in production for `Secure` cookies to work cross-origin.

## API endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/auth/login` | — | Login |
| POST | `/api/auth/logout` | ✓ | Logout |
| POST | `/api/auth/refresh` | cookie | Refresh token |
| POST | `/api/auth/forgot-password` | — | Request reset |
| POST | `/api/auth/reset-password` | — | Reset password |
| GET | `/api/users/me` | ✓ | Current profile |
| PATCH | `/api/users/me` | ✓ | Update profile |
| GET | `/api/users` | admin | List users |
| POST | `/api/users` | admin | Create user |
| PATCH | `/api/users/:id` | admin | Update user |
| GET | `/api/documents` | ✓ | List/search |
| POST | `/api/documents` | ✓ | Upload |
| GET | `/api/documents/:id` | ✓ | Get metadata |
| GET | `/api/documents/:id/download` | ✓ | Download file |
| DELETE | `/api/documents/:id` | owner/admin | Delete |
| GET | `/api/documents/:id/comments` | ✓ | List comments |
| POST | `/api/documents/:id/comments` | ✓ | Add comment |
