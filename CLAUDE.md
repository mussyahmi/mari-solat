# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev       # Start dev server on port 3005
npm run build     # Production build
npm run lint      # ESLint check
firebase deploy --only hosting:marisolat  # Deploy to Firebase Hosting
```

No test suite exists in this project.

## Architecture

**MariSolat** is a Malaysian prayer times PWA built on Next.js 16 (App Router) with Firebase as the backend.

### Routing
All routes are under `app/` using Next.js App Router. Pages are client components (`"use client"`) except the root layout. Key pages: `/` (prayer times dashboard), `/arah-kiblat` (Qibla), `/qada-solat` (makeup prayers), `/satu-pertiga-malam` (night prayer), `/tetapan` (settings).

### Prayer Time Data
Fetched from `https://api.waktusolat.app/` on the client side. Zone codes (e.g. `WLY01`) are persisted in localStorage under `msolat_zone_code` and `msolat_zone_name`. `lib/zoneState.ts` tracks whether the user manually selected a zone (module-level flag, resets on page refresh). Geolocation silently attempts to detect the nearest zone.

### Push Notifications (FCM)
- **Client** (`lib/fcm.ts`): Registers service worker, generates VAPID token, stores in Firestore under the user's UID
- **Server** (`lib/fcm-admin.ts`): Sends batched notifications (500/batch), cleans up invalid tokens
- **Cron routes** (`app/api/cron/azan/` and `app/api/cron/qada-reminder/`): Secured with `CRON_SECRET` env var; azan cron runs hourly and sends notifications when current time matches a prayer time

### Azan Playback
`lib/azan.ts` handles client-side audio playback and per-prayer notification preferences. Audio files live in `public/audio/` (`azan-subuh.mp3`, `azan-standard.mp3`).

### State
No global state library. State lives in:
- **localStorage** — zone selection, azan preferences, user UUID for analytics
- **React hooks** — page-level state, prayer countdown (updates every second)
- **Firestore** — FCM tokens, qada prayer counts, challenge participation, chat messages

### Firebase
`firebase.ts` initialises the client SDK (Auth + Firestore). Server-side routes use Firebase Admin via `lib/fcm-admin.ts`. Firestore security rules are in `firestore.rules` — user data is strictly UID-scoped.

### UI
shadcn/ui components in `components/ui/`. TailwindCSS v4 with CSS variables. Theme via `next-themes`. Design is minimalist: `divide-y divide-border/50` lists, no outer-border cards, green primary accent (`oklch(0.42 0.13 162)` light / `oklch(0.70 0.14 158)` dark).

### Analytics
`lib/track.ts` posts visitor zone + lat/lng to a Google Apps Script endpoint (`NEXT_PUBLIC_ANALYTICS_URL`). Tracked once per session via a localStorage flag.

## App Identity
- App name: **MariSolat** (no space)
- All UI text is in **Malay (BM)**
- Design principle: minimalist — prefer whitespace and plain lists over cards/borders

## Deployment Workflow
See the memory file for the "okay commit it" workflow which bumps version, commits, pushes, and deploys to Firebase Hosting automatically.
