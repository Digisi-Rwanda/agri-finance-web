# Agri Finance Web

Institutional web portal for **Agri Trust** — banks, insurers, admins, and farmers manage loans, farmer analysis, insurance, MoMo payments, and consent.

Backend: [agri-finance](../Desktop/agri-finance) (Spring Boot API at `/api`).

## Quick start

```bash
npm install
cp .env.example .env
npm run dev
```

Open `http://localhost:5173`. The app expects the API at `http://localhost:8080/api` unless you change `VITE_API_BASE_URL`.

## Roles

| Role | Home route | Main features |
|------|------------|---------------|
| **BANK** | `/` | Dashboard, loans, farmer analysis, MoMo |
| **ADMIN** | `/` | Bank tools + admin panel + audit logs |
| **INSURER** | `/insurer` | Insurer dashboard, insurance management |
| **FARMER** | `/payments` | MoMo payments, consent management |

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Vite dev server |
| `npm run build` | Production build to `dist/` |
| `npm run preview` | Preview production build |
| `npm run lint` | ESLint |

## Project layout

```
src/
  api/          Axios client + auth interceptors
  components/   Shared UI (forms, tables, cards)
  layouts/      Main shell (sidebar, topbar)
  pages/        Route screens by role
  routes/       React Router + protected routes
  services/     API calls per domain
  utils/        Role routing, currency helpers
```

## Environment

| Variable | Default | Purpose |
|----------|---------|---------|
| `VITE_API_BASE_URL` | `http://localhost:8080/api` | Backend API base URL |
