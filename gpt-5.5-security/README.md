# Document Portal

A small JavaScript document portal with an Express backend API, Vite frontend, PostgreSQL database, JWT-backed HttpOnly session cookies, role-based access, password reset requests, search, uploads, comments, profile editing, and admin user management.

GitHub Pages can only host the static frontend. Deploy the API and PostgreSQL database separately, then set the repository variable `VITE_API_BASE_URL` to that API origin plus `/api`.

## Setup

```bash
cp .env.example .env
scfw run npm install
npm run db:migrate
SEED_ADMIN_EMAIL=admin@example.com SEED_ADMIN_PASSWORD='replace-with-a-long-password' npm run db:seed
npm run dev
```

The frontend runs on `http://localhost:5173` and the API defaults to `http://localhost:3000`.

## Roles

- `member`: upload, search, view, comment on, download, and delete their own documents.
- `manager`: view, comment on, download, and delete all documents.
- `admin`: manager permissions plus user creation, role changes, and account disabling.

## Security Notes

- Secrets are loaded from `.env`; no database password, JWT secret, or reset token belongs in source code.
- Passwords are hashed with Argon2id.
- Session JWTs are transported in an HttpOnly cookie and backed by server-side session records for revocation.
- State-changing API calls require a CSRF token.
- SQL queries use PostgreSQL bind parameters.
- Uploaded files are allowlisted by extension, MIME type, and file signature, then stored under `server/uploads`.
- Password reset tokens are random, single-use, time-limited, and stored only as SHA-256 hashes.

Password reset email delivery is intentionally represented by token creation only; connect an email provider in `server/src/routes/auth.js` before production use, and do not log raw reset links or tokens.

