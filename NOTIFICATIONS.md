# Notification System + PWA — Status

## Completed

- [x] PWA manifest, service worker, icons, meta tags
- [x] Service worker registered in main.tsx
- [x] Dependencies installed (resend, web-push)
- [x] VAPID keys generated and in .env + Vercel env vars
- [x] Database tables: notifications, push_subscriptions
- [x] server/notify.ts — unified 3-channel function (in-app + email + push)
- [x] server/routes/notifications.ts — list, unread count, mark read, read-all, clear-read, check
- [x] server/routes/push.ts — subscribe/unsubscribe
- [x] Routers mounted in server/index.ts + api/index.ts
- [x] Trigger: New round added → all season players (in-app + email + push)
- [x] Trigger: Round updated (date/course/tee change) → all season players (in-app + email + push)
- [x] Trigger: Round closed → all season players with results summary (in-app + email + push)
- [x] Trigger: Fines confirmed → individual player (in-app + email + push)
- [x] Trigger: Fine marked as paid → individual player (in-app + email + push)
- [x] Time-based: 7-day round reminder (in-app + email + push)
- [x] Time-based: 24-hour round reminder (in-app + email + push)
- [x] Time-based: Fine overdue reminder (in-app + email + push)
- [x] Auto-delete read notifications older than 30 days
- [x] Frontend: api.ts notification + push functions
- [x] NotificationPanel component (bell icon + dropdown)
- [x] NotificationsView — full page with unread/read sections
- [x] "View all notifications" link in dropdown
- [x] "Mark all read" + "Clear read" buttons
- [x] Bell icon in top bar (desktop + mobile)
- [x] Push permission request after login + session restore
- [x] PWA install button in top bar (icon-only on mobile, icon+text on desktop)
- [x] Mobile-responsive notification panel (full width on small screens)
- [x] Email setup — Resend API key in .env + Vercel (sandbox sender, domain needed for all players)
- [x] Notification preferences — two global toggles (email/push) per player in Profile > Edit, auto-save
- [x] Golf course seed data — 18 Western Cape courses seeded in db.ts
- [x] Test push end-to-end — verified in-app, email, and browser push all working
- [x] Test on mobile device — PWA installed, push notifications confirmed on Samsung A54
- [x] Close Round feature — locks scores, sends results notification to all players
- [x] All notifications default to email + push (players can opt out via profile toggles)
- [x] Golf-themed PWA icon with flag, ball, and GPGA text
- [x] Mobile bottom nav bar — increased to 64px height with safe area padding
- [x] Rounds info bar — stacked layout for mobile, labelled action buttons
- [x] Fines optimistic UI — instant updates, debounced refresh, single API call per fine change
- [x] Open fines — filtered from fine sheet, only visible on assigned player/round
- [x] Close/cancel button on fines player selection
- [x] Login page — removed demo credentials
- [x] TS build errors fixed (db.ts, notifications.ts, notify.ts)
- [x] Dev server — concurrently for running API + Vite together

## TODO — Next Session

### High Priority
- [ ] **Email domain** — Register GPGA domain, verify in Resend, set RESEND_FROM env var. Currently using sandbox (onboarding@resend.dev) which only sends to account owner
- [ ] **Commit + deploy** — Uncommitted changes from end of session (fines optimizations, UI fixes, icon)

### Medium Priority
- [ ] **Course images** — Upload image when creating/editing a round, show on dashboard
- [ ] **Admin broadcast** — Master can send custom message to all players

### Low Priority
- [ ] **Rich email templates** — HTML email design instead of plain text
- [ ] **Notification grouping** — Batch multiple notifications into digest
- [ ] **Offline queue** — Queue failed email/push sends for retry

## Architecture Notes

All notifications flow through one function: `server/notify.ts → notify()`.
Handlers call it with playerIds, type, title, body, and flags for email/push.
notify() checks player preferences (notify_email, notify_push columns) before sending.
Resend from address configured via RESEND_FROM env var (default: onboarding@resend.dev).
Time-based notifications are generated on dashboard load via `/api/notifications/check`.
No cron jobs needed — Vercel compatible.
