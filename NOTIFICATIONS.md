# Notification System + PWA — Status

## Completed

- [x] PWA manifest, service worker, icons, meta tags
- [x] Service worker registered in main.tsx
- [x] Dependencies installed (resend, web-push)
- [x] VAPID keys generated and in .env
- [x] Database tables: notifications, push_subscriptions
- [x] server/notify.ts — unified 3-channel function (in-app + email + push)
- [x] server/routes/notifications.ts — list, unread count, mark read, read-all, clear-read, check
- [x] server/routes/push.ts — subscribe/unsubscribe
- [x] Routers mounted in server/index.ts + api/index.ts
- [x] Trigger: New round added → all season players (in-app + email + push)
- [x] Trigger: Round updated (date/course/tee change) → all season players (in-app + push)
- [x] Trigger: Fines confirmed → individual player (in-app + push)
- [x] Trigger: Fine marked as paid → individual player (in-app + push)
- [x] Time-based: 7-day round reminder (on dashboard load)
- [x] Time-based: 24-hour round reminder (on dashboard load)
- [x] Time-based: Fine overdue reminder (on dashboard load)
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

## TODO — Next Session

### High Priority
- [x] **Email setup** — Resend API key added to .env. Also add to Vercel env vars for production.
- [x] **Trigger: Round Closed** — Admin action to mark a round complete, sends results (medal, SF, fines) to all participants
- [ ] **Course images** — Upload image when creating/editing a round, show on dashboard Next Round card
- [ ] **Commit + deploy** — Nothing committed from this session. Need to commit all changes and push to deploy on Vercel.

### Medium Priority
- [x] **Test push end-to-end** — Verified: in-app, email (Resend), and browser push all working
- [x] **Test on actual mobile device** — PWA installed on phone, push notifications confirmed working
- [x] **Notification preferences** — Two global toggles (email/push) per player in Profile > Edit
- [x] **Golf course seed data** — 18 Western Cape courses seeded in db.ts initSchema

### Low Priority
- [ ] **Rich email templates** — HTML email design instead of plain text
- [ ] **Admin broadcast** — Master can send custom message to all players
- [ ] **Notification grouping** — Batch multiple notifications into digest
- [ ] **Offline queue** — Queue failed email/push sends for retry

## Architecture Notes

All notifications flow through one function: `server/notify.ts → notify()`.
Handlers call it with playerIds, type, title, body, and flags for email/push.
Time-based notifications are generated on dashboard load via `/api/notifications/check`.
No cron jobs needed — Vercel compatible.
