# GPGA Golf League Manager

Society golf app for tracking a 9-round season across Medal, Stableford, and Team competitions, plus fines and finances. Deployed as a PWA at [gpga.vercel.app](https://gpga.vercel.app/).

## Stack

- **Frontend:** React 19 + Vite 7 + Tailwind 3 (PWA with offline precache)
- **Backend:** Express 5 + Turso cloud SQLite (`@libsql/client`)
- **Auth:** JWT + bcrypt, rate-limited login
- **Notifications:** Resend (email) + web-push + in-app (DB)
- **Hosting:** Vercel (auto-deploy on push to `main`)

## Local development

Two terminals:

```bash
npm run dev:server   # Express API on :3001
npm run dev:client   # Vite dev server on :5173
```

## Required environment variables

Set these in `.env` locally and in Vercel project settings for production:

```dotenv
TURSO_DATABASE_URL=libsql://...
TURSO_AUTH_TOKEN=...
JWT_SECRET=<48 random bytes hex>
FRONTEND_URL=https://gpga.vercel.app
VAPID_PUBLIC_KEY=...
VITE_VAPID_PUBLIC_KEY=<same as VAPID_PUBLIC_KEY>
VAPID_PRIVATE_KEY=...
VAPID_EMAIL=mailto:admin@gpga.vercel.app
RESEND_API_KEY=...
```

Generate a JWT secret with:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

## Project layout

```text
src/
  App.tsx              — shell, routing, auth guard
  api.ts               — typed API client (talks to /api)
  hooks/useFines.ts    — fines data layer
  components/
    common/            — Card, Modal, TabBar, DatePicker, Dropdown, SharedUI
    DashboardView.tsx  — Medal/Stableford/Teams tabs + Fines section
    FinancesView.tsx   — Start Fines / Fine Sheet / History / Payments
    RoundsView.tsx     — rounds list + scoring
    PlayersView.tsx    — master-only roster management
    SeasonSettings.tsx — buy-in, prize pool, season creation
    PlayerProfilePage.tsx, ProfileView.tsx, NotificationsView.tsx, LoginPage.tsx, Nav.tsx
server/
  index.ts             — Express app (local dev)
  db.ts                — Turso client + schema + migrations
  notify.ts            — unified email + push + in-app notifications
  auth-middleware.ts   — bcrypt, JWT, requireAuth/requireAdmin/requireMaster
  routes/              — per-resource routers
api/
  index.ts             — Vercel serverless wrapper
```

## Deploy

```bash
git push origin main
```

Vercel auto-deploys. Make sure all env vars above are set in the Vercel project before the first deploy after adding `JWT_SECRET`.
