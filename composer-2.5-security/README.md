# Document Portal

A secure document portal where users log in, upload files, search documents, leave comments, and admins manage users.

## Tech Stack

- **Frontend:** Vanilla JavaScript SPA (Vite)
- **Backend:** Node.js + Express
- **Auth:** JWT tokens + HTTP-only session cookies
- **Database:** PostgreSQL with full-text search
- **Deployment:** GitHub Pages (frontend) + separate API host

## Features

| Feature | Description |
|---------|-------------|
| Login / Register | Email + password authentication |
| JWT + Sessions | Bearer token for API calls; session cookie for browser sessions |
| Roles | `admin`, `user`, `viewer` with role-based access |
| File upload | PDF, Office docs, images, text (max 10 MB) |
| Search | PostgreSQL full-text search on filename and description |
| Comments | Threaded comments on each document |
| Profile editing | Update name, bio, and password |
| Forgot / Reset password | Token-based email reset flow |
| Admin panel | Manage user roles and delete users |

## Quick Start

### Prerequisites

- Node.js 18+
- Docker (for PostgreSQL)

### 1. Install dependencies

This project uses [SCFW](https://github.com/DataDog/scfw) to scan packages before install:

```bash
scfw run npm install
```

### 2. Configure environment

```bash
cp .env.example .env
```

Edit `.env` and set strong values for `JWT_SECRET` and `SESSION_SECRET`:

```bash
openssl rand -hex 32
```

### 3. Start PostgreSQL

```bash
docker compose up -d
```

### 4. Run migrations and seed data

```bash
npm run db:migrate
npm run db:seed
```

### 5. Start the backend

```bash
npm run dev
```

API runs at `http://localhost:3001`.

### 6. Start the frontend (separate terminal)

```bash
npm run dev:frontend
```

Open `http://localhost:5173`.

## Demo Accounts

| Email | Password | Role |
|-------|----------|------|
| admin@portal.local | Admin123!@# | admin |
| user@portal.local | User123!@# | user |
| viewer@portal.local | Viewer123!@# | viewer |

## API Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/auth/register` | — | Create account |
| POST | `/api/auth/login` | — | Sign in |
| POST | `/api/auth/logout` | ✓ | Sign out |
| GET | `/api/auth/me` | ✓ | Current user |
| POST | `/api/auth/forgot-password` | — | Request reset link |
| POST | `/api/auth/reset-password` | — | Reset with token |
| GET | `/api/documents` | ✓ | List / search documents |
| POST | `/api/documents` | ✓ | Upload document |
| GET | `/api/documents/:id` | ✓ | Document details |
| GET | `/api/documents/:id/download` | ✓ | Download file |
| DELETE | `/api/documents/:id` | ✓ | Delete document |
| GET | `/api/documents/:id/comments` | ✓ | List comments |
| POST | `/api/documents/:id/comments` | ✓ | Add comment |
| DELETE | `/api/documents/:id/comments/:commentId` | ✓ | Delete comment |
| PATCH | `/api/users/profile/me` | ✓ | Update profile |
| GET | `/api/users` | admin | List users |
| PATCH | `/api/users/:id` | admin | Update user role |
| DELETE | `/api/users/:id` | admin | Delete user |

## GitHub Pages Deployment

The workflow in `.github/workflows/deploy.yml` builds the frontend and deploys it to GitHub Pages on every push to `main`.

### Setup

1. Push this repo to GitHub.
2. Go to **Settings → Pages** and set source to **GitHub Actions**.
3. Set the repository variable `VITE_API_URL` (Settings → Secrets and variables → Actions → Variables) to your deployed API URL, e.g. `https://api.example.com/api`.
4. Update the `base` path in `frontend/vite.config.js` if your repo name differs from `document-portal`.

> **Note:** GitHub Pages serves static files only. Deploy the backend API separately (e.g. Railway, Render, Fly.io) and point `VITE_API_URL` at it. Configure `CLIENT_URL` on the API to match your GitHub Pages URL for CORS and password-reset links.

## Project Structure

```
├── backend/
│   ├── src/
│   │   ├── db/           # Migrations, seed, connection pool
│   │   ├── middleware/    # Auth, file upload
│   │   ├── routes/        # API route handlers
│   │   └── services/      # Email service
│   └── uploads/           # Uploaded files (gitignored)
├── frontend/
│   ├── css/
│   ├── js/
│   └── index.html
├── .github/workflows/
│   └── deploy.yml
├── docker-compose.yml
└── package.json
```

## Security Notes

- Passwords hashed with bcrypt (cost factor 12)
- JWT signed with HS256; session cookies are HTTP-only
- Rate limiting on auth endpoints
- File type and size validation on upload
- Password reset tokens stored as SHA-256 hashes
- CORS restricted to configured client URL
