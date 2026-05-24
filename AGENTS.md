<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# ArabicWithM — Agent Guide

## Project Overview

ArabicWithM is a Next.js 16 web application that helps users learn Arabic through cartoons, CEFR-graded flashcards, and a custom spaced-repetition system (SRS). The stack is React 19 + TypeScript 5, styled primarily with Material UI v9 (`@mui/material`), and backed by Supabase for authentication and PostgreSQL data.

Key features:
- **Cartoons**: Arabic-subtitled cartoon episodes with inline vocabulary lookup, synced to a YouTube player.
- **Flashcards**: Themed vocabulary decks organised by CEFR level (A0–C2). Each card supports an interactive sentence-builder mini-game (drag-and-drop Arabic word ordering) when example data is marked `interactive`.
- **Word Bank (Revision)**: An SM-2-based SRS session manager with two modes:
  - **Daily Review**: Spaced-repetition queue (New / Learning / Review) with a daily new-card limit of 20. Progress is saved to the database.
  - **Custom Practice**: Ad-hoc sessions where the user picks levels, themes, and card count. Progress is **not** saved and does not affect SRS state.
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
| Fonts | Google Fonts | EB Garamond (Arabic/serif), Jost (UI/sans-serif). Loaded inline in component `<style>` blocks. The root layout also installs Geist/Geist_Mono via `next/font/google` but they are rarely used. |

## Project Structure

```
├── app/                          # Next.js App Router
│   ├── actions/                  # Server Actions (data fetching & mutations)
│   │   ├── vocab.ts              # Vocab/theme fetching, progress upserts (~367 lines)
│   │   ├── revision.ts           # SRS session fetch, answer submission, toggle revision, custom metadata/cards (~608 lines)
│   │   └── profile.ts            # User profile data aggregation (~153 lines)
│   ├── auth/callback/page.tsx    # OAuth callback handler
│   ├── cartoons/                 # Cartoon routes
│   │   ├── page.tsx              # Server: list all shows
│   │   ├── CartoonsPage.tsx      # Client: shows grid
│   │   ├── [show]/page.tsx       # Server: show detail
│   │   ├── [show]/ShowPage.tsx   # Client: episodes list
│   │   └── [show]/[episode]/     # Episode watch page
│   │       ├── page.tsx          # Server: fetches episode + vocabMap
│   │       └── EpisodePage.tsx   # Client: player, script, tooltips (~1,456 lines)
│   ├── components/               # Shared components
│   │   ├── navbar.tsx            # Top nav with mega-menu, mobile drawer, auth (~808 lines)
│   │   ├── AuthDialog.tsx        # Sign-in / register / forgot-password modal (~468 lines)
│   │   ├── footer.tsx            # Site footer
│   │   ├── StudySection.tsx      # Homepage study CTA section
│   │   ├── CartoonSection.tsx    # Homepage cartoons CTA section
│   │   └── GlobalDataInit.tsx    # Client init wrapper: fetches custom session metadata once per app load
│   ├── flashcards/               # Flashcard routes
│   │   ├── page.tsx              # Server: level list
│   │   ├── FlashcardsLandingPage.tsx  # Client: level grid (~280 lines)
│   │   ├── [slug]/page.tsx       # Client: theme list + quiz (~1,840 lines)
│   │   └── components/TutorialDialog.tsx  # Onboarding carousel (~220 lines)
│   ├── lib/                      # Shared utilities
│   │   ├── supabase/client.ts    # Browser Supabase client singleton
│   │   ├── study.ts              # Level metadata helpers (slug/label mapping)
│   │   ├── cartoons.ts           # File-system cartoon parsing + vocabMap building
│   │   ├── arabic.ts             # Arabic token normalisation & diacritic stripping
│   │   └── sm2.ts                # SM-2 spaced-repetition algorithm
│   ├── profile/page.tsx          # User profile dashboard (~834 lines)
│   ├── reset-password/page.tsx   # Password reset form (~172 lines)
│   ├── revision/                 # SRS revision session (~3,374 lines across 21 files)
│   │   ├── page.tsx              # Thin orchestrator (~144 lines)
│   │   ├── WelcomeScreen.tsx     # Daily vs Custom tabbed entry screen (~378 lines)
│   │   ├── CustomSessionConfig.tsx  # Level/theme picker for custom practice (~391 lines)
│   │   ├── types.ts              # Shared types, queue helpers, point-scoring logic (~114 lines)
│   │   ├── hooks/
│   │   │   ├── useAnkiQueue.ts   # Deck queue manager (dot tracking, re-insertion) (~137 lines)
│   │   │   └── useRevisionSession.ts  # Session orchestration hook (~389 lines)
│   │   └── components/           # ~15 UI sub-components (flashcard, layout, dialogs, points, results, etc.)
│   ├── AuthContext.tsx           # React Context for Supabase auth state (~60 lines)
│   ├── globals.css               # Tailwind v4 import + basic variables (NOT the main design palette)
│   ├── layout.tsx                # Root layout (Navbar + Footer + AuthProvider + GlobalDataInit) (~41 lines)
│   └── page.tsx                  # Homepage (~310 lines)
├── content/cartoons/             # Markdown episode content
│   └── {show}/
│       ├── _meta.json            # Show metadata
│       └── {episode}.md          # Episode script + vocab notes
├── public/                       # Static assets
│   ├── banners/
│   ├── cards/
│   ├── cartoons/
│   ├── dragons/                  # Decorative images used in revision screens
│   ├── homepage/
│   ├── levels/
│   └── themes/
├── store/                        # Zustand client stores
│   ├── vocabStore.ts             # Theme/vocab caching + local progress updates (~137 lines)
│   └── revisionStore.ts          # Revision IDs cache, session cache (TTL), custom metadata cache (TTL) (~254 lines)
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

There are **no test scripts** defined. The project currently has no automated test suite (no Jest, Vitest, Playwright, or Cypress configured). No CI/CD configuration files (GitHub Actions, GitLab CI, etc.) exist in the repository.

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
- **Styling**: The codebase uses MUI's `sx` prop extensively for inline styling. Tailwind utility classes are almost never used. The design palette is implemented via hardcoded hex values in `sx` props rather than CSS custom properties. A few components (e.g. `navbar.tsx`) declare component-local CSS custom properties in inline `<style>` blocks, but these are not global.
- **Design palette** (commonly used literal colours):
  - `#2c1a0e` — dark bark (headings, primary text)
  - `#b8860b` — gold (accents, primary buttons, borders)
  - `#f5ede0` — cream (light backgrounds)
  - `#7a6e65` — muted brown (secondary text)
  - `#9e8a7a` — lighter muted (labels, tertiary text)
  - `#d4a843` — gold light (gradients)
- **Queue colours** (revision UI):
  - New: `#1565c0`
  - Learning: `#c13a00`
  - Review: `#2e7d32`
- **Rating colours** (revision UI):
  - Again: `#c62828`
  - Hard: `#e65100`
  - Good: `#2e7d32`
  - Easy: `#1565c0`
- **Fonts**: EB Garamond is used for Arabic/serif text; Jost is used for UI/sans-serif text. These are imported via `@import url(...)` inside component-level `<style>` blocks (e.g. `WelcomeScreen.tsx`). The root `layout.tsx` also loads Geist/Geist_Mono via `next/font/google`, but they are not the dominant fonts.
- **Path alias**: Use `@/` for imports from the project root (e.g. `@/app/lib/arabic`, `@/store/vocabStore`).
- **File naming**: PascalCase for components (`AuthDialog.tsx`), camelCase for utilities (`cartoons.ts`), kebab-case for routes (`reset-password`).
- **TypeScript**: Strict mode is enabled. Prefer explicit types for props and Server Action return values.
- **State management**: Server-fetched data flows through Server Actions → Zustand stores. Auth state lives in `AuthContext.tsx`.
- **Comments**: Inline section dividers are common, e.g. `/* ── theme progress ── */`.

## Authentication Flow

1. **Sign up / Sign in**: `AuthDialog.tsx` uses `supabase.auth.signUp/signInWithPassword` or `signInWithOAuth({ provider: 'google' })`.
2. **OAuth callback**: After Google sign-in, Supabase redirects to `/auth/callback`. The callback page (`app/auth/callback/page.tsx`) calls `supabase.auth.getSession()` and then redirects to `/`.
3. **Password reset**: Users request a reset link in `AuthDialog` or `profile/settings`. The link redirects to `/reset-password`, which calls `supabase.auth.updateUser({ password })`.
4. **Auth context**: `AuthContext.tsx` wraps the app, listens to `onAuthStateChange`, and provides `{ user, session, loading }` via `useAuth()`.

## Data Architecture

### Supabase Schema (key tables)
- `vocabulary` — Single table containing all word data:
  - `word_id` (number, primary key)
  - `word_ar` (Arabic word, plain)
  - `word_di` (diacritic form)
  - `word_tr` (transliteration)
  - `root` (optional string)
  - `level` (CEFR string: A0–C2)
  - `theme` (theme name string)
  - `definitions` — JSONB array of meanings (e.g. `[{english, simple_ar, simple_ar_tr, direct_english}]`)
  - `examples` — JSONB array of sentences (e.g. `[{ar, en, tr, ar_di, interactive?}]`)
  - `forms` — JSONB array of POS + conjugations (e.g. `[{type: "verb", conjugations: {past: {con_ar, con_di, con_en, con_tr, type}}}]`)
- `progress` — User progress per word (`vocab_id` references `vocabulary.word_id`):
  - `user_id` (string, UUID)
  - `status` (`0` = in revision, `1` = completed)
  - SRS fields: `repetitions`, `interval_days`, `ease_factor`, `learning_step`, `lapses`, `last_review_at`, `next_review_at`, `last_rating`, `first_review_at`

### Server Actions pattern
All DB mutations and sensitive reads live in `app/actions/*.ts` with `"use server"`. They use:
- `createClient` from `@supabase/supabase-js` with the service key for DB queries.
- `createServerClient` from `@supabase/ssr` with cookie access for auth verification.
- Direct queries against the `vocabulary` and `progress` tables. No RPC calls are used.

### Client-side caching
- `vocabStore.ts`: Caches theme vocab + progress indefinitely (until invalidated via `invalidateTheme` / `invalidateThemeList`). Cache keys use `` `${themeName}:${levelCode}` ``.
- `revisionStore.ts`: Caches the user's revision ID set (no TTL), the current session cards for **5 minutes**, and custom session metadata for **10 minutes**.

## Key Domain Logic

### Arabic Text Processing (`app/lib/arabic.ts`)
- `stripDiacritics(token)` — removes harakat/tatweel for matching.
- `normalizeArabicToken(token)` — strips diacritics, definite articles (`ال`, `وال`, `بال`, etc.), single-letter proclitics (when the remaining stem is ≥ 4 chars), and common enclitic pronoun suffixes. Used for fuzzy vocabulary lookup in cartoon scripts.

### JSONB Parsing (`app/actions/vocab.ts`, `app/actions/revision.ts`)
- `getPos(formsJson)` — extracts POS from `forms[0].type`.
- `flattenForms(formsJson)` — flattens nested `forms[0].conjugations` into the UI-friendly `FormRow[]` shape.

### SM-2 SRS (`app/lib/sm2.ts`)
- `computeAnswerResult(current, answer)` implements a simplified SM-2 algorithm.
- Cards start in a learning phase (0-day interval). After 2 correct answers they graduate to review intervals.
- Ratings: `again` resets learning; `hard` uses 1.2× interval; `good` uses `interval × ease_factor`; `easy` uses `interval × ease_factor × 1.3`.
- Daily new-card limit is hard-coded to 20 in `app/actions/revision.ts` (`DAILY_NEW_LIMIT`).

### Cartoon Content Pipeline
1. Show metadata is read from `content/cartoons/{show}/_meta.json`.
2. Episodes are `.md` files parsed with `gray-matter`. Frontmatter contains `youtubeId`, `youtubeShort`, `level`, `episode`, `tags`, `description`.
3. The script body contains timestamps, Arabic (diacritic + plain), and English lines.
4. At request time, Arabic tokens are extracted from the markdown and matched against the `vocabulary` table to build an inline `vocabMap` for tooltip lookup.

### Revision Session Architecture (`app/revision/page.tsx`)
- The page is a thin orchestrator component (~144 lines) that delegates to `useRevisionSession` hook.
- `useAnkiQueue` is a custom hook that manages the card deck, dot-progress tracking, and re-insertion of "Again" cards.
- Answers are batched locally in `pendingAnswersRef` and flushed to the server via `submitRevisionAnswersBatch`:
  - On session completion
  - On tab hide / page leave / beforeunload
  - On soft navigation (cleanup effect)
- **Daily sessions** mutate the Zustand cache optimistically and persist to DB.
- **Custom sessions** do not touch the DB or the Zustand cache; they are pure frontend practice.

### Flashcard Quiz Architecture (`app/flashcards/[slug]/page.tsx`)
- This is a large client component (~1,840 lines) that handles theme selection, card flipping, progress tracking, and the interactive sentence-builder mini-game.
- Uses `@dnd-kit` for drag-and-drop word ordering in interactive examples.
- Progress is synced via `upsertWordProgressBatch`.
- Themes are identified by name (string) rather than numeric ID.

## Security Considerations

- `reactStrictMode` is **disabled** in `next.config.ts`.
- Security headers (CSP, X-Frame-Options, X-Content-Type-Options, Referrer-Policy) are set in `next.config.ts`.
- The CSP allows YouTube iframe embeds and the Supabase API domain.
- All DB mutations validate the authenticated user ID server-side.
- Input validation is present on Server Actions (e.g. `levelCode.length > 10` checks, `vocabId <= 0` guards).
- `cartoons.ts` uses a path-traversal guard (`isPathContained`) to ensure all filesystem reads stay inside `content/cartoons/`.

## Deployment

The project is designed for deployment on **Vercel** (standard Next.js target). No custom `vercel.json` or Dockerfile is present. Ensure the Supabase environment variables are configured in the hosting platform's dashboard.

## Testing

There is currently **no test suite** in the project. If you add tests, place the config files at the project root and update `package.json` scripts accordingly. The team has no existing testing conventions to follow.

## When Modifying Code

1. **Check if a file is a Client Component** before adding browser-only hooks (`useState`, `useEffect`, etc.). If it is a Server Component and you need interactivity, either convert it to `'use client'` or extract a client sub-component.
2. **Prefer Server Actions** for any data mutation or sensitive read. Do not call Supabase service key from the browser.
3. **Preserve the design system**: Use the existing colour values (`#2c1a0e`, `#b8860b`, `#f5ede0`, `#7a6e65`, `#9e8a7a`, `#d4a843`) and font pairings (EB Garamond for Arabic/headings, Jost for UI text).
4. **Keep MUI `sx` prop usage consistent** with the existing patterns (e.g. `borderRadius: '10px'` for cards, `borderRadius: '9999px'` for pills, `fontFamily: 'Jost, sans-serif'`).
5. **Respect the path alias**: Always use `@/` imports rather than relative paths when crossing top-level directories.
6. **Revision page specifics**:
   - Do not mutate `currentCard.data` in-place. Pass the full `AnswerResult` to the `answer` callback from `useAnkiQueue` so the queue updates immutably.
   - Do not pollute the `revisionStore` session cache with custom-practice state.
   - If you change navigation behaviour, ensure `flushPendingAnswers()` is still called on unmount/leave.
