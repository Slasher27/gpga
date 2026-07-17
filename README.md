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
  App.tsx              — shell, routing, auth guard, leaderboard
  api.ts               — typed API client + all shared types (talks to /api)
  hooks/useFines.ts    — fines data layer
  components/
    common/            — Card, Modal, TabBar, DatePicker, Dropdown, SubmitButton, useDismiss, SharedUI (Avatar + helpers)
    TeamDraw/          — day-of-round playing-group draw (transient, localStorage-only)
    DashboardView.tsx  — Medal/Stableford/Teams tabs + Fines section
    FinancesView.tsx   — Start Fines / Fine Sheet / History / Payments
    RoundsView.tsx     — rounds list + scoring
    PlayersView.tsx    — roster + fixed season-teams management
    SeasonSettings.tsx — buy-in, prize pool, season creation
    PlayerProfilePage.tsx, ProfileView.tsx, NotificationsView.tsx, LoginPage.tsx, Nav.tsx
server/
  app.ts               — createApp(): shared Express bootstrap — register new routers HERE
  index.ts             — local dev entry (initSchema + seed, then listen); uses app.ts
  db.ts                — Turso client + schema + idempotent migrations + course list
  seed.ts              — seedDatabase() initial data
  notify.ts            — unified email + push + in-app notifications
  auth-middleware.ts   — bcrypt, JWT, requireAuth/requireAdmin/requireMaster
  routes/              — per-resource routers
api/
  index.ts             — Vercel serverless entry; uses app.ts (lazy init on cold start)
```

> Both `server/index.ts` and `api/index.ts` build the app via `server/app.ts`'s `createApp()` — add a new router in **one** place.

## Checks

Keep all three green before pushing:

```bash
npx tsc -b        # types — strict, noImplicitAny + noUnused, covers src + server + api
npm run lint      # eslint (tsx + jsx-a11y) — target 0 warnings
npm run build     # vite production build + PWA
```

## Deploy

```bash
git push origin main
```

Vercel auto-deploys. Make sure all env vars above are set in the Vercel project before the first deploy after adding `JWT_SECRET`.
