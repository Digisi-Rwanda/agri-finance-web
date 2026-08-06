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

| Variable | Default / production | Purpose |
|----------|----------------------|---------|
| `VITE_API_BASE_URL` | Local: `http://localhost:8080/api` · Prod: `https://agri-finance.onrender.com/api` | Backend API base URL |
| `VITE_SUPPORT_EMAIL` | `support@agritrust.rw` | Auth footer support mailto |
| `VITE_SUPPORT_URL` | `/support` | Public support page |
| `VITE_TERMS_URL` | `/terms` | Terms & Conditions |
| `VITE_PRIVACY_URL` | `/privacy` | Privacy Policy |
| `VITE_MOBILE_APP_URL` | Play Store (`com.agritrust.agrifinance.app`) | Farmer app download link on login |

Production values are in `.env.production` (picked up by `npm run build` / Vercel). Public legal pages: `/privacy`, `/terms`, `/support`.
