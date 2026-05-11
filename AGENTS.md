<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# ArabicWithM — Agent Guide

## Project Overview

ArabicWithM is a Next.js 16 web application that helps users learn Arabic through cartoons, CEFR-graded flashcards, and a custom spaced-repetition system (SRS). The stack is React 19 + TypeScript 5, styled primarily with Material UI v9 (`@mui/material`), and backed by Supabase for authentication and PostgreSQL data.

Key features:
- **Cartoons**: Arabic-subtitled cartoon episodes with inline vocabulary lookup, synced to a YouTube player.
- **Flashcards**: Themed vocabulary decks organised by CEFR level (A0–C2).
- **Word Bank (Revision)**: An SM-2-based SRS session manager with daily new-card limits and rating buttons (Again / Hard / Good / Easy).
- **User Profiles**: Progress tracking, level stats, and password reset via Supabase Auth.

## Technology Stack

| Layer | Technology | Version / Notes |
|-------|-----------|-----------------|
| Framework | Next.js | 16.2.3 (App Router) |
| React | react & react-dom | 19.2.4 |
| Language | TypeScript | 5.x (strict mode) |
| Styling | Tailwind CSS | v4 (configured but minimally used; MUI `sx` is primary) |
| UI Library | Material UI | v9 (`@mui/material`, `@mui/icons-material`) |
| Animation | Framer Motion | 12.x |
| Drag & Drop | @dnd-kit | core + sortable + utilities |
| State | Zustand | 5.x (client stores) |
| Backend / Auth | Supabase | `@supabase/supabase-js` + `@supabase/ssr` |
| Markdown | gray-matter | front-matter parsing for cartoon episodes |
| Fonts | Google Fonts | EB Garamond, Jost, Cookie, Cormorant Garamond (loaded inline in components) |

## Project Structure

```
arabic-with-m/
├── app/                          # Next.js App Router
│   ├── actions/                  # Server Actions (data fetching & mutations)
│   │   ├── vocab.ts              # Vocab/theme fetching, progress upserts
│   │   ├── revision.ts           # SRS session fetch, answer submission, toggle revision
│   │   └── profile.ts            # User profile RPC call
│   ├── auth/callback/page.tsx    # OAuth callback handler
│   ├── cartoons/                 # Cartoon routes
│   │   ├── page.tsx              # Server: list all shows
│   │   ├── CartoonsPage.tsx      # Client: shows grid
│   │   ├── [show]/page.tsx       # Server: show detail
│   │   ├── [show]/ShowPage.tsx   # Client: episodes list
│   │   └── [show]/[episode]/     # Episode watch page
│   ├── components/               # Shared components
│   │   ├── navbar.tsx            # Top nav with mega-menu, mobile drawer, auth
│   │   ├── AuthDialog.tsx        # Sign-in / register / forgot-password modal
│   │   ├── footer.tsx            # Site footer
│   │   ├── StudySection.tsx      # Homepage study CTA section
│   │   └── CartoonSection.tsx    # Homepage cartoons CTA section
│   ├── flashcards/               # Flashcard routes
│   │   ├── page.tsx              # Server: level list
│   │   ├── FlashcardsLandingPage.tsx
│   │   ├── [slug]/page.tsx       # Server: resolve level slug → theme list + quiz
│   │   └── components/TutorialDialog.tsx
│   ├── lib/                      # Shared utilities
│   │   ├── supabase/client.ts    # Browser Supabase client singleton
│   │   ├── study.ts              # Level metadata helpers
│   │   ├── cartoons.ts           # File-system cartoon parsing
│   │   ├── arabic.ts             # Arabic token normalisation & diacritic stripping
│   │   └── sm2.ts                # SM-2 spaced-repetition algorithm
│   ├── profile/page.tsx          # User profile dashboard
│   ├── reset-password/page.tsx   # Password reset form
│   ├── revision/page.tsx         # SRS revision session page
│   ├── AuthContext.tsx           # React Context for Supabase auth state
│   ├── globals.css               # Tailwind v4 import + basic variables
│   ├── layout.tsx                # Root layout (Navbar + Footer + AuthProvider)
│   └── page.tsx                  # Homepage
├── content/cartoons/             # Markdown episode content
│   └── {show}/
│       ├── _meta.json            # Show metadata
│       └── {episode}.md          # Episode script + vocab notes
├── public/                       # Static assets (images, banners, cards)
├── store/                        # Zustand client stores
│   ├── vocabStore.ts             # Theme/vocab caching + local progress updates
│   └── revisionStore.ts          # Revision IDs cache + session cache
├── next.config.ts                # Next.js config (security headers, CSP)
├── eslint.config.mjs             # ESLint 9 flat config (Next.js presets)
├── postcss.config.mjs            # Tailwind v4 PostCSS plugin
└── tsconfig.json                 # TypeScript (path alias `@/*` → `./*`)
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
```

There are **no test scripts** defined. The project currently has no automated test suite (no Jest, Vitest, Playwright, or Cypress configured).

## Environment Variables

Create a `.env.local` file in the project root with these variables:

```bash
# Supabase (required)
NEXT_PUBLIC_SUPABASE_URL=https://<project>.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<anon-key>
SUPABASE_URL=https://<project>.supabase.co
SUPABASE_SERVICE_KEY=<service-role-key>

# Site URL (used in auth emails)
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

**Security note:** `SUPABASE_SERVICE_KEY` is a secret with elevated privileges. It is used only in Server Actions (`"use server"`) to query the database. Never expose it to the client.

## Code Style and Conventions

- **Component types**: Server Components are the default. Mark Client Components explicitly with `'use client'` at the top of the file.
- **Styling**: The codebase uses MUI's `sx` prop extensively for inline styling. CSS custom properties (e.g. `--bark: #2c1a0e`, `--gold: #b8860b`) are defined inline in component `<style>` tags or `globals.css`.
- **Fonts**: EB Garamond is used for Arabic/serif text; Jost is used for UI/sans-serif text. These are imported via `@import url(...)` inside component-level `<style>` blocks, not in a global CSS file.
- **Path alias**: Use `@/` for imports from the project root (e.g. `@/app/lib/arabic`, `@/store/vocabStore`).
- **File naming**: PascalCase for components (`AuthDialog.tsx`), camelCase for utilities (`cartoons.ts`), kebab-case for routes (`reset-password`).
- **TypeScript**: Strict mode is enabled. Prefer explicit types for props and Server Action return values.
- **State management**: Server-fetched data flows through Server Actions → Zustand stores (with 5-minute client-side caching). Auth state lives in `AuthContext.tsx`.

## Authentication Flow

1. **Sign up / Sign in**: `AuthDialog.tsx` uses `supabase.auth.signUp/signInWithPassword` or `signInWithOAuth({ provider: 'google' })`.
2. **OAuth callback**: After Google sign-in, Supabase redirects to `/auth/callback`. The callback page (`app/auth/callback/page.tsx`) calls `supabase.auth.getSession()` and then redirects to `/`.
3. **Password reset**: Users request a reset link in `AuthDialog` or `profile/settings`. The link redirects to `/reset-password`, which calls `supabase.auth.updateUser({ password })`.
4. **Auth context**: `AuthContext.tsx` wraps the app, listens to `onAuthStateChange`, and provides `{ user, session, loading }` via `useAuth()`.

## Data Architecture

### Supabase Schema (key tables)
- `levels` — CEFR levels (A0–C2)
- `themes` — Vocabulary themes per level
- `vocab` — Arabic words with `word_ar`, `word_di`, `word_tr`, `theme_id`, `level_id`
- `definitions` — POS, meaning, and multilingual definitions per vocab row
- `examples` — Example sentences (`ex_ar`, `ex_di`, `ex_tr`, `ex_en`, `interactive`)
- `progress` — User progress per word (`is_completed`, `is_in_revision`, SRS fields: `repetitions`, `interval_days`, `ease_factor`, `learning_step`, `lapses`, `last_review_at`, `next_review_at`)

### Server Actions pattern
All DB mutations and sensitive reads live in `app/actions/*.ts` with `"use server"`. They use:
- `createClient` from `@supabase/supabase-js` with the service key for DB queries.
- `createServerClient` from `@supabase/ssr` with cookie access for auth verification.

### Client-side caching
- `vocabStore.ts`: Caches theme vocab + progress for 5 minutes.
- `revisionStore.ts`: Caches the user's revision ID set and the current session cards for 5 minutes.

## Key Domain Logic

### Arabic Text Processing (`app/lib/arabic.ts`)
- `stripDiacritics(token)` — removes harakat/tatweel for matching.
- `normalizeArabicToken(token)` — strips diacritics, definite articles (`ال`, `وال`, `بال`, etc.), single-letter proclitics, and common enclitic pronoun suffixes. Used for fuzzy vocabulary lookup in cartoon scripts.

### SM-2 SRS (`app/lib/sm2.ts`)
- `computeAnswerResult(current, answer)` implements a simplified SM-2 algorithm.
- Cards start in a learning phase (0-day interval). After 2 correct answers they graduate to review intervals.
- Ratings: `again` resets learning; `hard` uses 1.2× interval; `good` uses `interval × ease_factor`; `easy` uses `interval × ease_factor × 1.3`.
- Daily new-card limit is hard-coded to 20 in `app/actions/revision.ts` (`DAILY_NEW_LIMIT`).

### Cartoon Content Pipeline
1. Show metadata is read from `content/cartoons/{show}/_meta.json`.
2. Episodes are `.md` files parsed with `gray-matter`. Frontmatter contains `youtubeId`, `level`, `episode`, `tags`.
3. The script body contains timestamps, Arabic (diacritic + plain), and English lines.
4. At build/request time, Arabic tokens are extracted from the markdown and matched against the `vocab` table to build an inline `vocabMap` for tooltip lookup.

## Security Considerations

- `reactStrictMode` is **disabled** in `next.config.ts`.
- Security headers (CSP, X-Frame-Options, X-Content-Type-Options, Referrer-Policy) are set in `next.config.ts`.
- The CSP allows YouTube iframe embeds and the Supabase API domain.
- All DB mutations validate the authenticated user ID server-side.
- Input validation is present on Server Actions (e.g. `levelCode.length > 10` checks, `vocabId <= 0` guards).

## Deployment

The project is designed for deployment on **Vercel** (standard Next.js target). No custom `vercel.json` or Dockerfile is present. Ensure the Supabase environment variables are configured in the hosting platform's dashboard.

## Testing

There is currently **no test suite** in the project. If you add tests, place the config files at the project root and update `package.json` scripts accordingly. The team has no existing testing conventions to follow.

## When Modifying Code

1. **Check if a file is a Client Component** before adding browser-only hooks (`useState`, `useEffect`, etc.). If it is a Server Component and you need interactivity, either convert it to `'use client'` or extract a client sub-component.
2. **Prefer Server Actions** for any data mutation or sensitive read. Do not call Supabase service key from the browser.
3. **Preserve the design system**: Use the existing CSS variable names (`--bark`, `--forest`, `--gold`, `--gold-lt`, `--muted`, `--cream`, `--sand`) and font pairings (EB Garamond for Arabic/headings, Jost for UI text).
4. **Keep MUI `sx` prop usage consistent** with the existing patterns (e.g. `borderRadius: '10px'` for cards, `borderRadius: '9999px'` for pills, `fontFamily: 'Jost, sans-serif'`).
5. **Respect the path alias**: Always use `@/` imports rather than relative paths when crossing top-level directories.
