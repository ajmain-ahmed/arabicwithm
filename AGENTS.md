<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# ArabicWithM — Agent Guide

## Project Overview

ArabicWithM is a Next.js 16 web application that helps users learn Arabic through cartoons, graded books, and interactive activities. The stack is React 19 + TypeScript 5, styled primarily with Material UI v9 (`@mui/material`), and backed by Supabase for authentication and PostgreSQL data. Stripe powers AWM+ subscriptions and one-time support contributions.

Key features:
- **Cartoons**: Arabic-subtitled cartoon episodes with inline vocabulary lookup, synced to a YouTube player.
- **Books**: Graded Arabic books with a paginated chapter reader (Arabic/English), inline token definitions, PDF downloads (AWM+), and reading-progress tracking.
- **Audiobooks**: Per-chapter Arabic/English audio playback (private Supabase Storage signed URLs or YouTube sources), entitlement-gated.
- **AWM+ (billing)**: Stripe subscription for premium features; webhook-driven entitlement sync; one-time "Support Us" checkout.
- **Explore / For You**: Randomized short-video + book-passage feed; the For You feed is metered for free accounts with an AWM+ unlock.
- **Learning activities**: Memory flashcards, grammar bank, word search, practice wordlists — most require sign-in and some are premium-gated.
- **Profiles & social**: Public profiles with optional reading-progress sharing; My List; reviews.
- **Admin CMS**: Protected `/admin/*` routes (role `admin` in the `account_roles` table) for managing shows, episodes, books, chapters, audiobooks, phrases, Hans Wehr entries, featured content, and user roles/premium.
- **Reviewer tools**: `editor`/`admin` roles can suggest content corrections (`/reviewer`); admins review and apply them with an audit trail.

## Technology Stack

| Layer | Technology | Version / Notes |
|-------|-----------|-----------------|
| Framework | Next.js | 16.4.6 (App Router) |
| React | react & react-dom | 19.2.4 |
| Language | TypeScript | 5.x (strict mode) |
| Styling | Tailwind CSS | v4 (configured but minimally used; MUI `sx` is primary) |
| UI Library | Material UI | v9 (`@mui/material`, `@mui/icons-material`) |
| Animation | Framer Motion | 12.x |
| State | Zustand | 5.x (`store/` — see Project Structure) |
| Backend / Auth | Supabase | `@supabase/supabase-js` + `@supabase/ssr`; DB roles + RLS; two Edge Functions |
| Billing | Stripe | `stripe` server SDK; Checkout + customer portal + webhooks |
| Fonts | Google Fonts | EB Garamond / Cormorant Garamond (Arabic/serif), Jost (UI/sans-serif), book faces (Naskh/Amiri/sans) via `app/lib/fonts.ts`. |
| Testing | Vitest | 4.x with `@vitejs/plugin-react` and `jsdom`; Playwright e2e in `e2e/` |
| Icons | lucide-react | used alongside MUI icons in newer components |

## Project Structure

```
├── app/                          # Next.js App Router
│   ├── actions/                  # Server Actions (data fetching & mutations)
│   │   ├── auth.ts               # Identity + role resolution (getAuthenticatedAccess, guardAdmin, guardReviewer)
│   │   ├── admin.ts              # Admin CMS for shows/episodes/books/chapters/phrases/Hans Wehr
│   │   ├── admin-books.test.ts   # etc. — most action files have colocated tests
│   │   ├── books.ts              # Public book/chapter reads (cached) + entitlements
│   │   ├── audiobooks.ts         # Audiobook metadata, playback gating, admin audio saves
│   │   ├── cartoons.ts           # Public cartoon browsing + transcript normalization
│   │   ├── explore.ts / forYou.ts / forYouUsage.ts  # Feeds + metered-usage sync
│   │   ├── memory.ts / grammar.ts / puzzles.ts / practice.ts  # Learning activities
│   │   ├── premium.ts / entitlements.ts / support.ts          # Billing + entitlements
│   │   ├── profiles.ts / myList.ts / activity.ts / reviews.ts # User features
│   │   ├── storage.ts / profilePresets.ts / bookReleaseReminders.ts
│   │   ├── transcripts.ts        # YouTube/manual transcript admin pipeline
│   │   ├── feedback.ts / contentSearch.ts / featured.ts
│   ├── api/                      # Route handlers (all verified server-side)
│   │   ├── billing/webhook/      # Stripe webhook (signature-verified)
│   │   ├── books/[book]/download/# Entitlement-gated "PDF" (actually JSON for client render)
│   │   ├── admin/audio-upload/   # Signed upload URLs (admin + origin check)
│   │   ├── reviewer/export/      # CSV/PDF/JSON export (admin)
│   │   ├── covers/[kind]/[id]/   # Public cover proxy (rate-limited, path-validated)
│   │   └── profile-presets/      # Curated avatar/banner asset proxy
│   ├── (admin)/admin/            # Admin CMS (role-gated by layout + proxy.ts)
│   ├── reviewer/                 # Correction-suggestion workspace (editor/admin)
│   ├── auth/callback/route.ts    # OAuth code + email token_hash exchange
│   ├── auth/confirm/route.ts     # Supabase template links → shared callback
│   ├── books/                    # Library, book detail, chapter reader
│   ├── cartoons/                 # List, show detail, episode watch page
│   ├── explore/                  # Explore + For You feeds (client-heavy)
│   ├── listen/[book]/            # Audiobook player (signed-in, entitled)
│   ├── memory/ grammar/ practice/ word-search/  # Learning activities
│   ├── profile/ profile/[user]/  # Own profile redirect / public profile
│   ├── search/                   # Unified content search (RPC)
│   ├── support/ feedback/        # Stripe support checkout / feedback form
│   ├── transcripts/[id]/         # Public/admin transcript viewer
│   ├── learn/                    # Static hub linking the activities
│   ├── privacy/ terms/           # Static legal pages
│   ├── error.tsx                 # Root error boundary (branded)
│   ├── not-found.tsx             # Branded 404
│   ├── components/               # Shared components
│   │   ├── navbar/               # Top nav (dynamic-imports auth dialog + mobile drawer)
│   │   ├── home/                 # Homepage sections
│   │   ├── content-grid/         # CatalogueLayout + ContentCard + FilterSidebar
│   │   ├── vocab-tooltip/        # Inline Arabic vocabulary tooltip system
│   │   ├── settings-controls/    # Shared reader/watch settings controls
│   │   ├── AuthDialog.tsx        # Sign-in / register / forgot-password modal (Turnstile)
│   │   ├── FloatingVideoPlayer.tsx / LazyFloatingVideoPlayer.tsx  # PiP player
│   │   ├── LearningActivityTracker.tsx  # Active-time tracker (all pages)
│   │   ├── SiteShell.tsx         # Navbar + chrome composition per route
│   │   ├── ErrorBoundary.tsx     # Client error boundary (keyed by pathname)
│   │   └── ...
│   ├── lib/                      # Shared utilities
│   │   ├── supabase/
│   │   │   ├── client.ts         # Browser client (lazy proxy)
│   │   │   ├── server.ts         # createServerClient (cookie-bound)
│   │   │   ├── supabase.ts       # Service-role client (lazy proxy; server only)
│   │   │   └── database.types.ts # Generated DB types
│   │   ├── billing.ts            # Stripe client + live-key guard
│   │   ├── entitlements.ts       # resolveEntitlements / resolveBookEntitlements
│   │   ├── bookRelease.ts        # isBookReleased gate
│   │   ├── rateLimit.ts          # In-memory fixed-window limiter
│   │   ├── boundedFetch.ts       # Fetch timeouts (withDataDeadline)
│   │   ├── arabic.ts / cartoons.ts / thumbnailCrop.ts / slug.ts / errors.ts / jsonb.ts
│   │   ├── useYouTubePlayer.ts   # YouTube IFrame API hook (watch + explore + PiP)
│   │   └── ...
│   ├── AccountAccessContext.tsx  # Client role snapshot (server-verified, 5-minute refresh)
│   ├── AuthContext.tsx           # Supabase auth state; skips supabase-js for anonymous visitors
│   ├── layout.tsx / theme.ts / globals.css
│   └── page.tsx                  # Homepage
├── store/                        # Zustand client stores
│   ├── playerStore.ts            # PiP video player state
│   ├── readingProgressStore.ts   # Book reading progress (flush-on-unmount)
│   ├── myListStore.ts            # My List session cache
│   ├── forYouStore.ts            # For You session cache
│   └── exploreFeedStore.ts       # Explore feed session cache
├── supabase/
│   ├── migrations/               # ~60 migrations (RLS, RPCs, triggers) — apply via CLI
│   ├── functions/                # Edge Functions: audiobook-library, transcript-library
│   └── tests/                    # PGlite migration tests (vitest)
├── content/cartoons/             # Legacy markdown scripts (not used by public site)
├── e2e/                          # Playwright specs
├── next.config.ts                # Security headers, CSP, image patterns, 51mb action limit
├── eslint.config.mjs / postcss.config.mjs / vitest.config.ts / tsconfig.json
└── ...
```

## Build and Development Commands

```bash
# Install dependencies
npm install

# Dev server (http://localhost:3000)
npm run dev

# Production build
npm run build

# Start production server
npm start

# Lint only (no auto-fix)
npm run lint

# Run unit tests (Vitest)
npm test

# E2E tests (Playwright; needs the dev/prod server running)
npm run test:browser
```

## Environment Variables

Create a `.env.local` file in the project root with these variables:

```bash
# Supabase (required)
NEXT_PUBLIC_SUPABASE_URL=https://<project>.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<anon-key>
SUPABASE_URL=https://<project>.supabase.co
SUPABASE_SERVICE_KEY=<service-role-key>

# Site URL (used in auth emails and Stripe redirect URLs)
NEXT_PUBLIC_SITE_URL=http://localhost:3000

# Cloudflare Turnstile (optional — bot protection on auth forms; leave both unset to disable)
NEXT_PUBLIC_TURNSTILE_SITE_KEY=<turnstile-site-key>
TURNSTILE_SECRET_KEY=<turnstile-secret-key>   # server-side siteverify; keep Supabase Auth → Captcha OFF (tokens are single-use)

# Stripe (AWM+ billing + support checkout)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PREMIUM_PRICE_ID=price_...
STRIPE_LIVE_ENABLED=true   # required before sk_live_ keys are accepted (code-enforced)

# Transcript generation providers (edge function)
SUPADATA_API_KEY=...         # optional; falls back to the transcript_provider_key RPC
GLADIA_API_KEY=...           # optional
```

**Security note:** `SUPABASE_SERVICE_KEY` is a secret with elevated privileges. It is used only on the server (`app/lib/supabase.ts` and Server Actions) and in Edge Functions. Never expose it to the client. Admin/editor access is **not** env-var-based: roles live in the `account_roles` table and are enforced by DB functions (`account_role`, `change_account_role`).

## Code Style and Conventions

- **Component types**: Server Components are the default. Mark Client Components explicitly with `'use client'` at the top of the file.
- **Styling**: The codebase uses MUI's `sx` prop extensively for inline styling. Tailwind utility classes are almost never used.
- **Design system**: `app/theme.ts` is the single source of truth for the MUI theme. It exports `awmTokens` and `awmTheme` with a custom palette (`awm`) containing bark, gold, cream, forest, muted, etc. Global CSS custom properties (`--awm-*` colours, `--awm-radius-*`, `--font-serif`, `--font-sans`, `--font-decorative`) are defined in `app/globals.css`. Prefer these tokens or `theme.palette.awm.*` over hardcoded values in new code.
- **Design palette** (commonly used literal colours):
  - `#2c1a0e` / `bark` — dark bark (headings, primary text)
  - `#b8860b` / `gold` — gold (accents, primary buttons, borders)
  - `#f5ede0` / `cream` — cream (light backgrounds)
  - `#7a6e65` / `muted` — muted brown (secondary text)
  - `#9e8a7a` / `mutedLight` — lighter muted (labels, tertiary text)
  - `#d4a843` / `goldLight` — gold light (gradients)
  - `#0e2e1f` / `forest` — forest green (secondary accents)

- **Fonts**: EB Garamond / Cormorant Garamond are used for Arabic/serif text; Jost is used for UI/sans-serif text; Cookie is the decorative brand logo. The root `layout.tsx` loads all faces via `next/font` from `app/lib/fonts.ts`.
- **Path alias**: Use `@/` for imports from the project root (e.g. `@/app/lib/arabic`, `@/store/playerStore`).
- **File naming**: PascalCase for components (`AuthDialog.tsx`), camelCase for utilities (`cartoons.ts`), kebab-case for routes (`reset-password`).
- **TypeScript**: Strict mode is enabled. Prefer explicit types for props and Server Action return values.
- **State management**: Auth state lives in `AuthContext.tsx`; the verified role snapshot in `AccountAccessContext.tsx`. Client caches live in `store/` Zustand stores (see Project Structure). Server caches use `unstable_cache` with explicit tags.
- **Comments**: Inline section dividers are common, e.g. `/* ── theme progress ── */`.

## Authentication Flow

1. **Sign up / Sign in**: `AuthDialog.tsx` uses `supabase.auth.signUp/signInWithPassword` or `signInWithOAuth({ provider: 'google' })`. When `NEXT_PUBLIC_TURNSTILE_SITE_KEY` is set, a Cloudflare Turnstile widget (`app/components/Turnstile.tsx`) gates the form; before any auth call the dialog runs the `verifyTurnstileToken` Server Action, which validates the widget token against Cloudflare's **siteverify** endpoint using `TURNSTILE_SECRET_KEY` (rate-limited, 10s timeout, fail-closed). The spent token is never forwarded to Supabase — widget tokens are single-use, so Supabase Auth → Captcha must stay **disabled** (enabling both would reject real users). Auth endpoints are browser → Supabase directly, so Turnstile is their primary bot defense.
2. **Auth callback**: `app/auth/callback/route.ts` handles both PKCE `code` exchange and email-link `token_hash` verification, with an allow-listed `next` destination. `app/auth/confirm/route.ts` re-exports it for Supabase's default email templates. The app also supports legacy implicit-flow hash links (handled in `AuthContext.tsx`).
3. **Password reset**: Users request a reset link in `AuthDialog`. The link redirects to `/reset-password`, which calls `supabase.auth.updateUser({ password })`.
4. **Auth context**: `AuthContext.tsx` wraps the app, dynamically imports the browser client only when a session can exist (cookie or hash detection), listens to `onAuthStateChange`, and provides `{ user, session, loading }` via `useAuth()`.
5. **Role gating**: `app/actions/auth.ts` resolves the current identity and role via the `account_role` DB function (backed by the `account_roles` table; roles: `user`, `editor`, `admin`). `isAdminUser()` / `guardAdmin()` gate admin actions; `guardReviewer()` allows editors too. The `/admin` layout re-checks and redirects non-admins; `proxy.ts` additionally double-gates `/admin/featured`. **Server guards are the source of truth** — client role state (`useAccountAccess`) is chrome only.

## Data Architecture

### Supabase Schema (key tables)
- `shows` / `episodes` — Cartoon catalogue. `episodes.transcript` JSONB: new format is an array of `{ tokens, timestamp, translation }` blocks (each token carries `pos`, lowercase `cefr`); the legacy `{ scriptBlocks, vocabList, grammarPoints }` object is still read for old episodes.
- `books` / `chapters` — Graded books and chapter content (`content` JSONB of token blocks). Release is gated by `is_completed`; `premium_exempt` books are free.
- `book_chapter_audio` / `book_audio_progress` — Audiobook sources (private `audiobooks` storage bucket or YouTube) and per-user playback position.
- `subscriptions` — Stripe customer/subscription state, written by webhook via `apply_subscription_event`; `manual_premium_grants` covers manual comp access (audit-logged).
- `account_roles` / `access_change_audit` — Role assignments and admin/role change history.
- `content_suggestions` — Reviewer corrections (editor/admin authors, admin review workflow).
- `public_profiles` / `leaderboard_public_profiles` — Display names, public/share flags, usernames (`set_public_handle` RPC).
- `my_list` / `learning_profiles` / `learning_activity_daily` / `memory_*` / `word_search_completions` / `feedback` / `featured_show_config` / `youtube_transcripts` + `transcript_segments` (generation pipeline) — user and platform state.
- RLS is enabled on user-data tables; app reads/writes mostly go through the service-role client in Server Actions, with authorization checked in code. DB functions are `security invoker` with `search_path=''` unless explicitly definer-scoped.

### Server Actions pattern
All DB mutations and sensitive reads live in `app/actions/*.ts` with `"use server"`. They use:
- `serviceClient` from `app/lib/supabase.ts` (service key; server-only) for DB queries.
- `createServerClient` from `@supabase/ssr` with cookie access for auth verification (`getAuthClient()` in `app/lib/supabase/server.ts`).
- Zod validation on every mutation input; server-derived `userId` for user-scoped writes (never trust client-passed IDs).
- Admin actions gated by `guardAdmin()` / `guardReviewer()` from `app/actions/auth.ts`.

### Client-side caching
- `store/playerStore.ts` — PiP video player state (the only store read by `LazyFloatingVideoPlayer`).
- `store/readingProgressStore.ts` — reading positions, flushed on unmount.
- `store/myListStore.ts`, `store/forYouStore.ts`, `store/exploreFeedStore.ts` — session caches that let returning visitors restore state without re-fetching.

## Key Domain Logic

### Arabic Text Processing (`app/lib/arabic.ts`)
- `stripDiacritics(token)` — removes harakat/tatweel for matching.
- `normalizeArabicToken(token)` — strips diacritics, definite articles (`ال`, `وال`, `بال`, etc.), single-letter proclitics (when the remaining stem is ≥ 4 chars), and common enclitic pronoun suffixes.
- `normalizeTransliteration(token)` — strips Latin diacritics for loose transliteration matching.

### Cartoon Content Pipeline
1. Show, episode, and book covers are stored in the public Supabase Storage `covers` bucket at `cartoons/{slug}.webp`, `episodes/{episodeSlug}.webp`, and `books/{slug}.webp`. Public catalogue images use direct storage URLs (with pre-generated variants); the rate-limited `/api/covers/*` route handles private/legacy sources and missing-show-cover fallbacks. Admins upload WebP via `app/actions/storage.ts`.
2. Episode metadata and transcripts live in the `episodes` table (see Schema above).
3. At request time, `fetchEpisodeForPublic` normalises the transcript into `ScriptBlock` objects; lookup maps are rebuilt client-side to keep the RSC payload lean.
4. Legacy markdown episodes still exist in `content/cartoons/` but are not used by the public site.

### Books & Audiobooks
1. Chapter reading is free for signed-in users: `fetchChapterForPublic` gates on `isBookReleased` + sign-in (`canAccessBookChapter`). AWM+ gates PDF downloads, audiobooks, For You and Memory — not prose; `books.free_chapter_count` only controls the catalogue teaser/Explore preview window. The download route re-checks entitlements server-side.
2. Audiobook playback goes through the `audiobook-library` Edge Function (JWT-verified, premium-checked) or `requestChapterAudio` Server Action; files live in the private `audiobooks` bucket behind signed URLs.
3. Reading progress is stored in user metadata (`book_progress`) plus the session store; resume links carry `?page=/&block=` (both bounds-checked).

### Billing
1. `startPremiumCheckout` re-fetches the Stripe price and validates currency/amount before creating a Checkout session; the webhook re-retrieves subscription state so retries can't reinstate stale access.
2. Live keys are refused unless `STRIPE_LIVE_ENABLED=true` (`app/lib/billing.ts`).
3. Disputes and refunds (`charge.dispute.created`, `charge.refunded`) are logged loudly by the webhook but never auto-revoke access — a dispute is not a loss and the subscription usually remains owed. Review them in the Stripe dashboard and handle manually (e.g. `manual_premium_grants` or portal cancellation).
4. Account deletion is manual (users email support@arabicwithm.com). Deleting the auth user cascades the `subscriptions` row but does **not** stop Stripe billing — whoever processes a deletion must also cancel the Stripe subscription (or revoke access via `manual_premium_grants`) and confirm no active subscription remains on the customer.

### Admin CMS
- `/admin` redirects to `/admin/shows`; the CMS covers shows, episodes, books, chapters (+audio), phrases, Hans Wehr, featured content, transcripts, reviews/suggestions, and user management (roles + manual premium, both audit-logged).
- Show/episode/book edit dialogs upload WebP covers (magic-byte validated, path-pattern restricted).
- Episode slug auto-suggestion uses `suggestNextEpisodeSlug()` in `app/lib/slug.ts`.

## Testing

The project uses **Vitest** with `jsdom` and `@vitejs/plugin-react`, plus **Playwright** e2e specs in `e2e/`.

- **Config**: `vitest.config.ts` at project root.
- **Coverage**: ~160 test files alongside the code they test — unit tests for libs/actions (Arabic normalization, transcript formats, entitlements, migrations via PGlite, feed selection, reader pagination…) and component tests for the interactive pages. Migration tests replay `supabase/migrations` against in-memory Postgres.
- **How to run**: `npm test` (vitest) and `npm run test:browser` (Playwright).
- There is no CI/CD pipeline configured. If you add tests, create new `*.test.ts` / `*.test.tsx` files alongside the code they test.

## Security Considerations

- `reactStrictMode` is **disabled** in `next.config.ts`.
- Security headers (CSP, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, HSTS) are set in `next.config.ts`.
- The CSP allows YouTube iframe embeds, the Supabase API domain, news-image CDNs, Cloudflare Turnstile, and Google Tag Manager/Analytics endpoints.
- All DB mutations validate the authenticated user ID server-side; user-scoped actions derive the ID from the verified session.
- `durableRateLimit.ts` uses the service-only, atomic `website_rate_limit` RPC for search, guest feeds, Turnstile and checkout actions, with hashed keys and a local fallback. High-volume image routes retain the in-memory `rateLimit.ts`; guest transcript submission is capped DB-side.
- Admin/reviewer authorization is enforced by DB functions (`account_role`, `change_account_role` — admin-only, reason + confirmation required, last-admin protected, audit-logged) and re-checked by `guardAdmin()`/`guardReviewer()` in every privileged Server Action. Client role state is chrome, never the gate.
- Auth endpoints (sign-up, sign-in, password reset) are protected by Cloudflare Turnstile when configured: the widget renders in `AuthDialog` and the token is verified app-side via `verifyTurnstileToken` (Cloudflare siteverify, `TURNSTILE_SECRET_KEY`) before any auth call. They bypass the app-level rate limiter by design.
- Uploads are admin-only, content-sniffed (WebP magic bytes / audio validation), path-pattern restricted, and private buckets are never proxied publicly.
- The service key never ships to the browser; heavy chunks (supabase-js, auth dialog, mobile drawer, PiP player) are interaction-time dynamic imports.

## Deployment

**Production runs on Cloudflare Workers** (migrated from Vercel, Nov 2026) via [vinext](https://github.com/cloudflare/vinext) — the Next.js app builds and deploys to the `arabicwithm` Worker, with `arabicwithm.com` + `www` attached as Workers Custom Domains. The Vercel project remains only as a fallback (`arabicwithm.vercel.app`).

- Build/deploy: `npm run build:vinext`, then `CLOUDFLARE_API_TOKEN=... CLOUDFLARE_ACCOUNT_ID=... npm run deploy:vinext` (`vinext-cloudflare deploy` builds, uploads, and auto-provisions the `VINEXT_KV_CACHE` KV namespace — the shared response/data cache). Deploys authenticate with `CLOUDFLARE_API_TOKEN`/`CLOUDFLARE_ACCOUNT_ID` env vars (CI-style; no browser login).
- Config: `vite.config.ts` + `cloudflare.config.ts` (Worker name, entrypoint, assets routing, KV binding). Runtime secrets (Supabase service key, Stripe keys, Turnstile secret, etc.) live as **Worker secrets** on the `arabicwithm` Worker, set via the Cloudflare API — not in the repo. `NEXT_PUBLIC_*` values are inlined at build time, so builds must run with the production env exported.
- Local dev is unchanged (`npm run dev` still uses Next.js); `npm run dev:vinext` runs the vinext dev server for parity checks.
- The two Supabase Edge Functions still deploy via the Supabase CLI. **Note:** image-proxy limiting and per-instance caches remain local; key public/billing actions use the durable Supabase limiter.

## When Modifying Code

1. **Check if a file is a Client Component** before adding browser-only hooks (`useState`, `useEffect`, etc.). If it is a Server Component and you need interactivity, either convert it to `'use client'` or extract a client sub-component.
2. **Prefer Server Actions** for any data mutation or sensitive read. Do not call Supabase service key from the browser.
3. **Preserve the design system**: Use the existing colour values (`#2c1a0e`, `#b8860b`, `#f5ede0`, `#7a6e65`, `#9e8a7a`, `#d4a843`) and font pairings (EB Garamond / Cormorant Garamond for Arabic/headings, Jost for UI text).
4. **Keep MUI `sx` prop usage consistent** with the existing patterns (e.g. `borderRadius: '10px'` for cards, `borderRadius: '9999px'` for pills, `fontFamily: 'Jost, sans-serif'`).
5. **Respect the path alias**: Always use `@/` imports rather than relative paths when crossing top-level directories.
6. **Testing**: Run `npm test` after modifying shared utilities. Add new test cases for new edge cases.
7. **Database scope**: Schema changes belong in `supabase/migrations/` (with PGlite migration tests where behavior matters). Several RPCs used by the app (guest transcript registration/caps, worker auth) exist only in the live DB — export them into migrations before modifying around them.
8. **Authorization**: any new privileged action must call `guardAdmin()`/`guardReviewer()`/`requireEntitlement()` (or re-derive access server-side) before touching data — never rely on client-supplied IDs or flags.

## Arabic Content Ingestion

When the user supplies Arabic/English material for a cartoon transcript or book
chapter, read and follow `docs/content-ingestion.md`. Treat it as the canonical
schema, Hans Wehr matching policy, validation checklist, and Supabase routing
guide. Do not guess ambiguous dictionary senses, and do not mutate content until
the user identifies the target and explicitly asks for it to be added or updated.
