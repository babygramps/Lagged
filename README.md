# Lagged

A personalized jet-lag protocol generator and live tracker for Vercel + Neon.

You enter any itinerary (origin/destination IANA timezones + depart/arrive timestamps + optional return leg) and your chronotype + habitual sleep window. The deterministic engine produces a per-step protocol grounded in:

- **Burgess & Khalsa light PRC** — light after CBTmin advances, before CBTmin delays.
- **Burgess 2010 melatonin PRC** — 0.5 mg fast-release, 2–4h before predicted DLMO, Days 1–4 eastward only.
- **Eastman 2005 pre-flight advance** — wake-shift + AM light + evening melatonin in the 3 days before departure.
- **Roach & Sargent 2019 antidromic-prevention** — sunglasses on arrival mornings prevent the body clock from drifting the wrong direction.

Each step fires as a notification through [ntfy.sh](https://ntfy.sh) at its scheduled time, posted by a Vercel Cron running every 5 minutes.

## Stack

- Next.js 15 (App Router) + React 19, deployed to Vercel
- Neon Postgres via the `@neondatabase/serverless` HTTP driver + Drizzle ORM
- Auth.js v5 magic-link email via Resend
- Tailwind CSS + a slim shadcn/ui subset
- Luxon for all timezone math (server-side only)
- Vitest for the engine golden tests

## Repo layout

```
app/                  Next.js App Router pages and route handlers
components/           shadcn primitives + timeline components
lib/
  engine/             Pure deterministic protocol generator (no I/O)
  db/                 Drizzle schema + Neon HTTP client
  ntfy/               Notification formatting + HTTP sender
  auth.ts             Auth.js v5 config
  time.ts             Luxon helpers used by UI/server actions
drizzle/migrations/   Generated SQL migrations
tests/engine/         Golden + edge-case tests
```

The engine is **origin/destination agnostic**: nothing about SFO, LHR, or May 2026 is baked in. The doc that inspired the project appears only as a regression fixture in `tests/engine/sfo-lhr.golden.test.ts`. Other tests exercise westward (LHR→SFO), short-trip (NYC→PAR, 2 days), small-shift (SFO→DEN), chronotype variants, and Pacific-crossing tz pairs (Sydney/Tokyo → SFO).

## Local development

```bash
pnpm install
cp .env.example .env.local      # then fill in DATABASE_URL, AUTH_SECRET, AUTH_RESEND_KEY
pnpm db:push                    # apply schema to a Neon dev branch
pnpm test                       # run engine tests
pnpm dev                        # http://localhost:3000
```

## Environment variables

| var | purpose |
|---|---|
| `DATABASE_URL` | Neon HTTP connection string (`postgres://...neon.tech/...?sslmode=require`) |
| `AUTH_SECRET` | Auth.js secret. `openssl rand -base64 32`. |
| `AUTH_URL` | Public base URL for magic-link callbacks. |
| `AUTH_RESEND_KEY` | Resend API key for sending magic-link emails. |
| `AUTH_RESEND_FROM` | From-address for magic links. |
| `NTFY_BASE_URL` | ntfy server (defaults to `https://ntfy.sh`). |
| `CRON_SECRET` | Bearer token for the `/api/cron/notify` endpoint — Vercel injects this automatically when a cron is configured. |

## Deploy to Vercel + Neon

1. Push this branch to GitHub.
2. In the Vercel dashboard, import the repo and add the **Neon** integration → it provisions a Postgres DB and injects `DATABASE_URL`.
3. Add the other env vars in Vercel Project Settings.
4. The first deploy runs `drizzle-kit migrate && next build` (see `package.json`).
5. Vercel Cron picks up `vercel.json` and starts hitting `/api/cron/notify` every 5 minutes.
6. Sign in via magic link, fill the Settings page (chronotype, habitual bedtime/wake, home tz, ntfy topic), then create a trip.

## Engine internals

`lib/engine/generateProtocol(input)` is pure. It:

1. Computes signed shift from origin/dest tz offsets at `departAt` (handles DST, short-circles ±12h).
2. Derives baseline CBTmin (= habitual wake − 2.5h) and DLMO (= habitual bedtime − 2h), with ±30 min chronotype offset (Burgess & Eastman 2005).
3. Emits pre-flight steps (eastward only, 3 days) — earlier wake, AM outdoor light, afternoon exercise, evening melatonin.
4. Emits in-flight steps — watch-set on boarding, sleep window + mask through cabin "breakfast" lighting until CBTmin passes (Roach & Sargent 2019).
5. Projects baseline CBTmin onto the destination arrival calendar day, then for each adaptation day shifts by `rate * dayIndex` hours (rate = 1 h/day east, 1.5 h/day west) until the target shift is reached.
6. Emits arrival per-day: `light_avoid` (before CBTmin), `light_seek` (after), `melatonin_dose` (Days 1–4, eastward, at DLMO − 3h), `sleep_window`, `wake`, `caffeine_cutoff`, `exercise_window`.
7. Emits return-leg sub-plan when a return is provided — westward, no melatonin, evening home-local light + forced wakefulness floor at 22:30.

Edge cases:
- `|shift| < 3h` → no protocol.
- Dest stay < 3 days → `stayOnOriginTime`, no arrival adaptation (Roach 2019).
- DST is handled by Luxon (`setZone(...).plus({hours})`).

Tunable constants live in `lib/engine/constants.ts` — bump `ENGINE_VERSION` when you change them so existing protocols can be safely re-generated.

## Notifications

- Vercel Cron hits `GET /api/cron/notify` every 5 minutes.
- The handler selects steps where `notified_at IS NULL AND scheduled_at <= now() + 5min AND scheduled_at >= now() - 30min`.
- For each, it POSTs to `${NTFY_BASE_URL}/${user.ntfy_topic}` with title, body, tags, priority, click URL back to `/trips/[id]`, and an "Mark done" action that POSTs to the complete endpoint.
- Failures only increment `notify_attempts`; success sets `notified_at`. After 5 attempts, `notified_at` is force-set with a structured log to prevent poison-message loops.
- The Settings page has a "Send test notification" button that fires a single ping to the configured topic for verification.
