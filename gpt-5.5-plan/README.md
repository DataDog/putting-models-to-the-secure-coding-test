# Document Portal

A small JavaScript document portal with a Vite frontend, Express API, PostgreSQL database, JWT session cookies, document upload/search, comments, profile editing, password reset, and admin user management.

## Project Layout

- `client/` - Vite React frontend deployed to GitHub Pages.
- `server/` - Express backend API backed by PostgreSQL.
- `.github/workflows/deploy-pages.yml` - GitHub Pages deployment workflow for the frontend.

## Local Setup

Install dependencies:

```sh
scfw run npm install
```

Create backend environment config:

```sh
cp server/.env.example server/.env
```

Create frontend environment config:

```sh
cp client/.env.example client/.env
```

Start PostgreSQL and set `DATABASE_URL` in `server/.env`, then initialize the database:

```sh
npm run db:init --workspace server
```

Run the API:

```sh
npm run dev:server
```

Run the frontend:

```sh
npm run dev:client
```

## Accounts and Roles

The first registered account becomes an `admin`. Later registrations become `user` accounts. Admins can view users, change roles, disable accounts, and edit names.

## GitHub Pages Deployment

The workflow deploys only the static frontend to GitHub Pages. Set `VITE_API_BASE_URL` as a repository Actions variable or secret if the API is hosted separately. The API and PostgreSQL database must run on a separate host.
