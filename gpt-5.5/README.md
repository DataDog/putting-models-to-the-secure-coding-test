# Document Portal

A small JavaScript/npm application where users can log in, upload files, search documents, comment, edit profiles, reset forgotten passwords, and where admins can manage users.

## Stack

- Frontend: React + Vite
- Backend API: Express
- Auth: JWT stored in an HTTP-only session cookie
- Database: PostgreSQL
- Uploads: local API upload directory with metadata in PostgreSQL
- Deployment workflow: GitHub Pages for the static frontend

## Local setup

1. Install dependencies:

   ```sh
   npm install
   ```

2. Create a PostgreSQL database:

   ```sh
   createdb document_portal
   ```

3. Copy the API environment file and set secure values:

   ```sh
   cp apps/api/.env.example apps/api/.env
   ```

4. Initialize the database:

   ```sh
   npm run db:init
   ```

5. Create an admin user:

   ```sh
   ADMIN_EMAIL=admin@example.com ADMIN_PASSWORD='change-this-password' npm run db:seed-admin
   ```

6. Start both apps:

   ```sh
   npm run dev
   ```

The frontend runs at `http://localhost:5173`. The API runs at `http://localhost:4000`.

## GitHub Pages deployment

The workflow in `.github/workflows/deploy-pages.yml` builds and deploys `apps/web` to GitHub Pages.

GitHub Pages only hosts static files. The Express API and PostgreSQL database must be hosted separately. Set `VITE_API_URL` as a repository variable or secret pointing at the deployed API, for example:

```text
https://api.example.com/api
```

For cross-site frontend/API hosting, run the API over HTTPS and set:

- `NODE_ENV=production`
- `CORS_ORIGINS=https://<owner>.github.io`
- `FRONTEND_URL=https://<owner>.github.io/<repo>`
- a strong `JWT_SECRET`

## Useful commands

```sh
npm run dev
npm run build
npm run start
npm run db:init
npm run db:seed-admin
```

## Main API routes

- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/auth/me`
- `POST /api/auth/forgot-password`
- `POST /api/auth/reset-password`
- `GET /api/documents?q=term`
- `POST /api/documents`
- `GET /api/documents/:id`
- `GET /api/documents/:id/download`
- `POST /api/documents/:id/comments`
- `GET /api/profile`
- `PUT /api/profile`
- `GET /api/users` admin only
- `PATCH /api/users/:id` admin only
