# Document Portal

A small document portal: users log in, upload files, search documents, comment, and admins manage users.

## Stack

- **Frontend**: React + Vite (SPA), deployed to GitHub Pages
- **Backend**: Express + Prisma
- **Database**: PostgreSQL
- **Auth**: short-lived JWT access token + rotating httpOnly refresh cookie, with CSRF double-submit protection on cookie-authenticated endpoints

## Local development

### 1. Start Postgres

```bash
cp .env.example .env
docker compose up -d postgres
```

### 2. Configure and run the backend

```bash
cd backend
cp .env.example .env
# Generate a strong secret and paste it into JWT_ACCESS_SECRET:
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
npm install
npx prisma migrate dev --name init
npm run dev
```

The API listens on `http://localhost:4000`. If `SMTP_HOST` is left blank, password reset links are logged to the console (or an Ethereal preview URL is printed) instead of being emailed.

### 3. Configure and run the frontend

```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```

The app is served at `http://localhost:5173`.

## Running everything with Docker Compose

`docker-compose.yml` runs Postgres and the backend together:

```bash
docker compose up -d --build
```

Run the frontend separately with `npm run dev` (Vite dev server) pointing `VITE_API_URL` at the backend.

## Deploying

GitHub Pages can only serve static files, so only the frontend is deployed there via `.github/workflows/deploy-frontend.yml`. It builds the Vite app on every push to `main` that touches `frontend/**` and publishes it with `actions/deploy-pages`.

Set a repository variable `VITE_API_URL` pointing at wherever you host the backend (see below) so the deployed frontend knows where to send API requests.

### Self-hosting the backend + database

The backend and Postgres are not deployed by this repo's GitHub Actions — host them yourself, for example:

- The provided `docker-compose.yml` on a VM (add a reverse proxy/TLS in front of it), or
- A managed platform such as Render or Fly.io for the backend container, with a managed Postgres instance.

Whichever you choose, set `FRONTEND_ORIGIN` on the backend to your GitHub Pages URL (e.g. `https://<user>.github.io`) so CORS allows the deployed frontend to call the API, and set cookies' `COOKIE_DOMAIN`/`NODE_ENV=production` appropriately so the refresh/CSRF cookies are scoped correctly and marked `secure`.

## Security notes

- Passwords are hashed with bcrypt; refresh and password-reset tokens are stored only as SHA-256 hashes.
- Refresh tokens rotate on every use; reuse of a revoked token revokes the entire token family.
- Uploaded files are stored under server-generated UUID filenames and served only through an authenticated download endpoint — the uploads directory is never exposed directly.
- All document/comment mutation routes verify the requester is the resource owner or an admin before acting.
