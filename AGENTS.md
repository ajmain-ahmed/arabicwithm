<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# ArabicWithM — Agent Guide

## Project Overview

ArabicWithM is a Next.js 16 web application that helps users learn Arabic through cartoons, CEFR-graded flashcards, graded news articles, Arabic literature (poetry & encyclopedia articles), and interactive book reading. The stack is React 19 + TypeScript 5, styled primarily with Material UI v9 (`@mui/material`), and backed by Supabase for authentication and PostgreSQL data.

Key features:
- **Cartoons**: Arabic-subtitled cartoon episodes with inline vocabulary lookup, synced to a YouTube player.
- **Flashcards**: Themed vocabulary decks organised by CEFR level (A0–C2). Each card supports an interactive sentence-builder mini-game (drag-and-drop Arabic word ordering) when example data is marked `interactive`.
- **News**: Graded Arabic news articles (A0–C2) parsed from markdown, plus live RSS feeds from CNN Arabic and France24 Arabic with inline vocabulary tooltips.
- **Literature**: Classical Arabic poetry (via Qafiyah API) and Arabic Wikipedia articles with inline vocabulary support.
- **Written Arabic (Books)**: Interactive Arabic book reader with inline vocabulary, grammar notes, and word-by-word annotations. Content lives in `content/books/`.
- **User Profiles & Dashboard**: User account, level stats, password reset via Supabase Auth, and a personalised dashboard home.

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
| Input Validation | zod | used in Server Actions for sanitisation (transitive dependency) |
| Fonts | Google Fonts | EB Garamond (Arabic/serif), Jost (UI/sans-serif). Loaded inline in component `<style>` blocks. The root layout also installs Geist/Geist_Mono via `next/font/google` but they are rarely used. |
| Testing | Vitest | 4.x with `@vitejs/plugin-react` and `jsdom` |
| Icons | lucide-react | used alongside MUI icons in newer components |

## Project Structure

```
├── app/                          # Next.js App Router
│   ├── actions/                  # Server Actions (data fetching & mutations)
│   │   ├── vocab.ts              # Vocab/theme fetching and admin edits
│   │   ├── profile.ts            # User profile data aggregation
│   │   ├── dashboard.ts          # Dashboard stats, streaks, achievements (~284 lines)
│   │   ├── literature.ts         # Qafiyah API & Wikipedia fetching (~204 lines)
│   │   └── siwar.ts              # SIWAR Arabic dictionary API proxy (~127 lines)
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
│   │   ├── MobileBottomNav.tsx   # Mobile bottom navigation bar
│   │   ├── ErrorBoundary.tsx     # Global error boundary wrapper
│   │   ├── GlobalDataInit.tsx    # Client init wrapper: fetches custom session metadata once per app load
│   │   ├── StudySection.tsx      # Homepage study CTA section
│   │   ├── CartoonSection.tsx    # Homepage cartoons CTA section
│   │   ├── HomeHero.tsx          # Homepage hero banner
│   │   ├── CefrLevelsSection.tsx # Homepage CEFR level grid
│   │   ├── ChooseYourPath.tsx    # Homepage path selector
│   │   ├── content-grid/         # Reusable content grid + filter sidebar + card
│   │   ├── dashboard/            # Dashboard UI components (WelcomeHeader, StatsCard, StudyStreak, etc.)
│   │   ├── page-layout/          # Reusable page sections (PageBanner, HowItWorksSection, PlacementTestCTA)
│   │   ├── vocab-tooltip/        # Inline Arabic vocabulary tooltip system (WordTooltip, ArabicText, HtmlTooltip)
│   │   └── wordbank/             # (removed)
│   ├── flashcards/               # Flashcard routes
│   │   ├── page.tsx              # Server: level list
│   │   ├── FlashcardsLandingPage.tsx  # Client: level grid (~280 lines)
│   │   ├── [slug]/page.tsx       # Client: theme list + quiz (~1,840 lines)
│   │   ├── [slug]/themes/        # Dedicated theme landing page
│   │   └── components/           # Flashcard sub-components (FlashcardQuiz, SentenceBuilder, DefinitionPanel, etc.)
│   ├── lib/                      # Shared utilities
│   │   ├── supabase/client.ts    # Browser Supabase client singleton
│   │   ├── study.ts              # Level metadata helpers (slug/label mapping)
│   │   ├── cartoons.ts           # File-system cartoon parsing + vocabMap building
│   │   ├── books.ts              # File-system book parsing (metadata, chapters, sentences, vocab)
│   │   ├── news.ts               # File-system news article parsing + vocabMap building
│   │   ├── news-parser.ts        # RSS / HTML parsing for live news feeds
│   │   ├── rss.ts                # RSS feed fetching & normalisation
│   │   ├── arabic.ts             # Arabic token normalisation & diacritic stripping
│   │   ├── sm2.ts                # (removed)
│   │   ├── sm2.test.ts           # (removed)
│   │   └── rateLimit.ts          # Simple in-memory rate limiter for Server Actions
│   ├── learn/reading/written/    # Book reader routes
│   │   ├── page.tsx              # Server: book list
│   │   ├── WrittenBooksPage.tsx  # Client: book grid + chapter navigation
│   │   └── [slug]/               # Chapter reader
│   ├── literature/               # Literature routes
│   │   ├── page.tsx              # Server: fetches poems + wiki articles
│   │   └── LiteraturePage.tsx    # Client: literature grid
│   ├── news/                     # News routes
│   │   ├── page.tsx              # Server: fetches articles + RSS feeds
│   │   ├── NewsPage.tsx          # Client: news grid with level filters
│   │   └── [slug]/               # Individual article reader
│   ├── profile/page.tsx          # User profile dashboard (~1,173 lines)
│   ├── reset-password/page.tsx   # Password reset form (~172 lines)
│   ├── revision/                 # (removed)
│   ├── AuthContext.tsx           # React Context for Supabase auth state (~68 lines)
│   ├── globals.css               # Tailwind v4 import + basic variables (NOT the main design palette)
│   ├── layout.tsx                # Root layout (Navbar + Footer + AuthProvider + GlobalDataInit + MobileBottomNav)
│   └── page.tsx                  # Homepage (~310 lines)
├── content/                      # Static content files
│   ├── books/                    # Book metadata (_meta.json), chapters (page*.json), covers
│   ├── cartoons/                 # Show metadata (_meta.json) + episode markdown scripts
│   └── news/                     # Graded news article markdown files (articles/a0/ ... articles/a2/)
├── migrations/                   # SQL schema migrations (removed progress/review_logs migrations)
├── public/                       # Static assets
│   ├── article-images/
│   ├── banners/
│   ├── books/
│   ├── cards/
│   ├── cartoons/
│   ├── dragons/                  # Decorative images (unused)
│   ├── homepage/
│   ├── levels/
│   └── themes/
├── store/                        # Zustand client stores
│   ├── vocabStore.ts             # Theme/vocab caching
│   └── revisionStore.ts          # (removed)
├── next.config.ts                # Next.js config (security headers, CSP, remote image patterns)
├── eslint.config.mjs             # ESLint 9 flat config (Next.js presets)
├── postcss.config.mjs            # Tailwind v4 PostCSS plugin
├── vitest.config.ts              # Vitest config (jsdom, React plugin, `@/` alias)
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

# Run unit tests (Vitest)
npm test
```

## Testing

The project has a minimal test suite using **Vitest** with `jsdom` and `@vitejs/plugin-react`.

- **Config**: `vitest.config.ts` at project root.
- **Current tests**: `app/lib/arabic.test.ts` — basic tests for Arabic token normalisation.
- **How to run**: `npm test`
- There is no CI/CD pipeline configured. If you add tests, update `vitest.config.ts` or create new `*.test.ts` / `*.test.tsx` files alongside the code they test.

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

# Admin user ID for vocab editing privileges (optional)
ADMIN=<supabase-user-uuid>

# SIWAR Arabic dictionary API key (optional)
SIWAR=<api-key>
```

**Security note:** `SUPABASE_SERVICE_KEY` is a secret with elevated privileges. It is used only in Server Actions (`"use server"`) to query the database. Never expose it to the client.

## Code Style and Conventions

- **Component types**: Server Components are the default. Mark Client Components explicitly with `'use client'` at the top of the file.
- **Styling**: The codebase uses MUI's `sx` prop extensively for inline styling. Tailwind utility classes are almost never used. The design palette is implemented via hardcoded hex values in `sx` props rather than CSS custom properties. A few components (e.g. `navbar.tsx`, `profile/page.tsx`) declare component-local CSS custom properties in inline `<style>` blocks, but these are not global.
- **Design palette** (commonly used literal colours):
  - `#2c1a0e` — dark bark (headings, primary text)
  - `#b8860b` — gold (accents, primary buttons, borders)
  - `#f5ede0` — cream (light backgrounds)
  - `#7a6e65` — muted brown (secondary text)
  - `#9e8a7a` — lighter muted (labels, tertiary text)
  - `#d4a843` — gold light (gradients)

- **Fonts**: EB Garamond is used for Arabic/serif text; Jost is used for UI/sans-serif text. These are imported via `@import url(...)` inside component-level `<style>` blocks (e.g. `WelcomeScreen.tsx`, `DashboardHome.tsx`). The root `layout.tsx` also loads Geist/Geist_Mono via `next/font/google`, but they are not the dominant fonts.
- **Path alias**: Use `@/` for imports from the project root (e.g. `@/app/lib/arabic`, `@/store/vocabStore`).
- **File naming**: PascalCase for components (`AuthDialog.tsx`), camelCase for utilities (`cartoons.ts`), kebab-case for routes (`reset-password`).
- **TypeScript**: Strict mode is enabled. Prefer explicit types for props and Server Action return values.
- **State management**: Server-fetched data flows through Server Actions → Zustand stores. Auth state lives in `AuthContext.tsx`.
- **Comments**: Inline section dividers are common, e.g. `/* ── theme progress ── */`.
- **Zod validation**: Server Actions in `vocab.ts` use `zod` schemas to sanitise user input (e.g. `levelCode`, `vocabId`).

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
- `app_vocab` — Word data used by the cartoon episode reader and admin vocabulary tools:
  - `word_id` (bigint, primary key)
  - `word_ar` (plain Arabic)
  - `word_di` (diacritic form)
  - `word_tr` (transliteration)
  - `root` (optional string)
  - `level` (CEFR string)
  - `theme` (optional theme name)
  - `source` (optional source tag)
  - `definitions` — JSONB array of meanings (e.g. `[{english, simple_ar, simple_ar_tr, direct_english}]`)
  - `examples` — JSONB array of sentences (e.g. `[{ar, en, tr, ar_di}]`)
  - `forms` — JSONB array of POS tags (e.g. `[{type: "noun"}]`)
- `shows` — Cartoon/show metadata.
- `episodes` — Episode metadata and transcript (the `transcript` JSONB contains `scriptBlocks`, `vocabList`, and `grammarPoints`).
- (The `progress`, `review_logs`, and `daily_sessions` tables have been removed.)

### Server Actions pattern
All DB mutations and sensitive reads live in `app/actions/*.ts` with `"use server"`. They use:
- `createClient` from `@supabase/supabase-js` with the service key for DB queries.
- `createServerClient` from `@supabase/ssr` with cookie access for auth verification.
- Direct queries against the `vocabulary`, `app_vocab`, `shows`, and `episodes` tables. `study.ts` uses one RPC call (`get_vocab_level_theme_stats`). No other RPC calls are used.
- `checkRateLimit` from `@/app/lib/rateLimit` guards mutation endpoints with an in-memory rate limiter.

### Client-side caching
- `vocabStore.ts`: Caches theme vocab indefinitely (until invalidated via `invalidateTheme` / `invalidateThemeList`). Cache keys use `` `${themeName}:${levelCode}` ``.

## Key Domain Logic

### Arabic Text Processing (`app/lib/arabic.ts`)
- `stripDiacritics(token)` — removes harakat/tatweel for matching.
- `normalizeArabicToken(token)` — strips diacritics, definite articles (`ال`, `وال`, `بال`, etc.), single-letter proclitics (when the remaining stem is ≥ 4 chars), and common enclitic pronoun suffixes. Used for fuzzy vocabulary lookup in news articles and books. Cartoon tooltips now use explicit `db` keys stored in the episode transcript to look up `app_vocab` rows.

### JSONB Parsing (`app/actions/vocab.ts`)
- `getPos(formsJson)` — extracts POS from `forms[0].type`.
- `flattenForms(formsJson)` — flattens nested `forms[0].conjugations` into the UI-friendly `FormRow[]` shape.



### Cartoon Content Pipeline
1. Show metadata is read from the `shows` table in Supabase (cover paths are normalised against `public/cartoons/`).
2. Episode metadata and transcripts are stored in the `episodes` table. The `transcript` JSONB column contains `scriptBlocks`, `vocabList`, and `grammarPoints`.
3. Each script block has a timestamp, title, Arabic diacritic/plain lines, notes, and a `words` array.
4. Each word in a script block has a `db` key. At request time, `fetchEpisodeForPublic` collects all `db` keys, looks them up in the `app_vocab` table (matching either `word_di` or `word_ar`), and enriches the word entries with English definition, transliteration, CEFR level, and part of speech. The resulting `wordMap` and `diacritizedMap` power the inline hover tooltips.

### News Content Pipeline
1. Static articles are `.md` files in `content/news/articles/{level}/{slug}.md`.
2. Frontmatter contains `title`, `image`, `source`, `date`, `cefr`, `topics`.
3. Body is Markdown prose. Arabic tokens are normalised and matched against the `vocabulary` table for inline tooltips.
4. Live RSS feeds are fetched via `app/lib/rss.ts` and parsed/normalised in `app/lib/news-parser.ts`.

### Book Content Pipeline
1. Book metadata is read from `content/books/{book}/_meta.json`.
2. Chapters are `page{n}.json` files containing sentence-level data with Arabic, transliteration, English, and per-sentence vocabulary entries.
3. `app/lib/books.ts` parses the JSON and builds a vocabMap for inline lookups in the reader.



### Flashcard Quiz Architecture (`app/flashcards/[slug]/page.tsx`)
- This is a client component that handles theme selection, card flipping, and the interactive sentence-builder mini-game.
- Uses `@dnd-kit` for drag-and-drop word ordering in interactive examples.
- Themes are identified by name (string) rather than numeric ID.



## Security Considerations

- `reactStrictMode` is **disabled** in `next.config.ts`.
- Security headers (CSP, X-Frame-Options, X-Content-Type-Options, Referrer-Policy) are set in `next.config.ts`.
- The CSP allows YouTube iframe embeds and the Supabase API domain.
- All DB mutations validate the authenticated user ID server-side.
- Input validation is present on Server Actions using `zod` schemas (e.g. `levelCode.length > 10` checks, `vocabId <= 0` guards).
- `cartoons.ts`, `news.ts`, and `books.ts` use path-traversal guards (`isPathContained`) to ensure all filesystem reads stay inside their respective content directories.
- `rateLimit.ts` provides simple per-key rate limiting for Server Actions. It is in-memory only and therefore suitable for single-instance deployments (e.g. Vercel hobby plan).

## Deployment

The project is designed for deployment on **Vercel** (standard Next.js target). No custom `vercel.json` or Dockerfile is present. Ensure the Supabase environment variables are configured in the hosting platform's dashboard.

## When Modifying Code

1. **Check if a file is a Client Component** before adding browser-only hooks (`useState`, `useEffect`, etc.). If it is a Server Component and you need interactivity, either convert it to `'use client'` or extract a client sub-component.
2. **Prefer Server Actions** for any data mutation or sensitive read. Do not call Supabase service key from the browser.
3. **Preserve the design system**: Use the existing colour values (`#2c1a0e`, `#b8860b`, `#f5ede0`, `#7a6e65`, `#9e8a7a`, `#d4a843`) and font pairings (EB Garamond for Arabic/headings, Jost for UI text).
4. **Keep MUI `sx` prop usage consistent** with the existing patterns (e.g. `borderRadius: '10px'` for cards, `borderRadius: '9999px'` for pills, `fontFamily: 'Jost, sans-serif'`).
5. **Respect the path alias**: Always use `@/` imports rather than relative paths when crossing top-level directories.
6. **Testing**: Run `npm test` after modifying shared utilities. Add new test cases for new edge cases.
