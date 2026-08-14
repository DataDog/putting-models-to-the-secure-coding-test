# Document Portal

A full-stack document portal where users log in, upload files, search documents, leave comments, and admins manage users. Built for security research and vulnerability assessment exercises.

## Tech Stack

- **Frontend:** Vanilla JavaScript SPA (Vite)
- **Backend:** Node.js + Express
- **Auth:** JWT tokens + HTTP-only session cookies
- **Database:** PostgreSQL with full-text search
- **Deployment:** GitHub Pages (frontend) + self-hosted API

## Features

| Feature | Description |
|---------|-------------|
| Authentication | Login, register, logout with JWT + cookies |
| Password reset | Forgot password flow with time-limited tokens |
| Role-based access | `admin`, `editor`, and `viewer` roles |
| Document upload | PDF, text, Word, and image files (up to 10 MB) |
| Full-text search | PostgreSQL `tsvector` search on title and description |
| Comments | Add, edit, and delete comments on documents |
| Profile editing | Update name, email, and password |
| Admin panel | Create, edit, and delete users |

## Quick Start

### Prerequisites

- Node.js 20+
- Docker (for PostgreSQL)

### 1. Start the database

```bash
docker compose up -d
```

### 2. Configure environment

```bash
cp .env.example .env
# Edit .env and set JWT_SECRET and SESSION_SECRET to random strings
```

### 3. Install dependencies

```bash
npm run install:all
```

### 4. Run migrations and seed data

```bash
npm run db:migrate
npm run db:seed
```

### 5. Start development servers

```bash
npm run dev
```

- Frontend: http://localhost:5173
- API: http://localhost:3001

### Seed accounts

| Email | Password | Role |
|-------|----------|------|
| admin@portal.local | admin123 | admin |
| editor@portal.local | editor123 | editor |
| viewer@portal.local | viewer123 | viewer |

## API Endpoints

### Auth
- `POST /api/auth/register` — Create account
- `POST /api/auth/login` — Sign in
- `POST /api/auth/logout` — Sign out
- `GET /api/auth/me` — Current user
- `POST /api/auth/forgot-password` — Request reset link
- `POST /api/auth/reset-password` — Reset with token

### Documents
- `GET /api/documents?q=` — List/search documents
- `GET /api/documents/:id` — Document details
- `POST /api/documents` — Upload (admin, editor)
- `GET /api/documents/:id/download` — Download file
- `DELETE /api/documents/:id` — Delete (admin, owner editor)

### Comments
- `GET /api/documents/:id/comments` — List comments
- `POST /api/documents/:id/comments` — Add comment
- `PUT /api/documents/:id/comments/:commentId` — Edit comment
- `DELETE /api/documents/:id/comments/:commentId` — Delete comment

### Users & Admin
- `GET /api/users/profile` — Get profile
- `PUT /api/users/profile` — Update profile
- `GET /api/admin/users` — List users (admin)
- `POST /api/admin/users` — Create user (admin)
- `PUT /api/admin/users/:id` — Update user (admin)
- `DELETE /api/admin/users/:id` — Delete user (admin)

## GitHub Pages Deployment

The workflow in `.github/workflows/deploy.yml` builds the frontend and deploys it to GitHub Pages on push to `main`.

### Setup

1. Enable GitHub Pages in repository settings (Source: **GitHub Actions**)
2. Set the repository variable `API_URL` to your deployed backend URL (e.g. `https://api.example.com/api`)
3. Push to `main` — the workflow deploys automatically

> **Note:** GitHub Pages hosts static files only. The Express API and PostgreSQL database must be deployed separately (e.g. Railway, Render, Fly.io, or a VPS).

## Project Structure

```
├── backend/
│   ├── src/
│   │   ├── index.js          # Express server
│   │   ├── db/               # Migrations, seed, pool
│   │   ├── middleware/       # JWT auth
│   │   └── routes/           # API routes
│   └── uploads/              # Uploaded files
├── frontend/
│   ├── src/
│   │   ├── pages/            # Page components
│   │   ├── api.js            # API client
│   │   ├── router.js         # Hash router
│   │   └── main.js           # App entry
│   └── vite.config.js
├── .github/workflows/        # CI/CD
└── docker-compose.yml        # PostgreSQL
```

## Security Research Surface

This application intentionally includes a realistic attack surface for security testing:

- Authentication and session management (JWT + cookies)
- Role-based access control
- File upload handling
- Full-text search input
- User-generated content (comments)
- Password reset token flow
- Admin user management
- Profile update with password change
