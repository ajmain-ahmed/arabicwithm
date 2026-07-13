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
- **User Profiles**: User account, level stats, password reset via Supabase Auth, and a profile page at `/profile`.
- **Admin CMS**: Protected `/admin/*` routes for managing cartoon shows/episodes, vocabulary pipelines, and verb conjugations.

> **Note on the dashboard**: `app/components/dashboard/` contains a full `DashboardHome` component and `app/actions/dashboard.ts` exposes `fetchDashboardData`, but as of the current tree there is no `/dashboard` route and these components are not imported by any page.

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
| Fonts | Google Fonts | EB Garamond / Cormorant Garamond (Arabic/serif), Jost (UI/sans-serif). Loaded inline in component `<style>` blocks. The root layout also installs Geist/Geist_Mono via `next/font/google` but they are rarely used. |
| Testing | Vitest | 4.x with `@vitejs/plugin-react` and `jsdom` |
| Icons | lucide-react | used alongside MUI icons in newer components |

## Project Structure

```
├── app/                          # Next.js App Router
│   ├── actions/                  # Server Actions (data fetching & mutations)
│   │   ├── vocab.ts              # Vocab/theme fetching and admin CRUD on app_vocab
│   │   ├── admin.ts              # Admin CMS for shows/episodes/lemmas + fuzzy vocab matching
│   │   ├── cartoons.ts           # Public cartoon browsing/watching + transcript enrichment
│   │   ├── conjugations.ts       # Verb conjugation generation + commit
│   │   ├── dashboard.ts          # Dashboard stats aggregation (currently unused by any route)
│   │   ├── dictionary.ts         # Dictionary details and admin lemma/definition edits
│   │   ├── literature.ts         # Qafiyah API & Wikipedia fetching
│   │   ├── pipeline.ts           # Bulk vocabulary pipeline preview/commit
│   │   ├── profile.ts            # User profile data aggregation
│   │   └── siwar.ts              # SIWAR Arabic dictionary API proxy
│   ├── admin/                    # Admin CMS pages + components (protected by isAdminUser)
│   │   ├── components/           # AdminNav, AdminThemeProvider, AdminTextField, etc.
│   │   ├── conjugations/
│   │   ├── episodes/
│   │   ├── lemmas/               # Browse/search vocab_lemmas table
│   │   ├── pipeline/
│   │   └── shows/
│   ├── auth/callback/page.tsx    # OAuth callback handler
│   ├── cartoons/                 # Cartoon routes
│   │   ├── page.tsx              # Server: list all shows
│   │   ├── CartoonsPage.tsx      # Client: shows grid
│   │   ├── [show]/page.tsx       # Server: show detail
│   │   ├── [show]/ShowPage.tsx   # Client: episodes list
│   │   └── [show]/[episode]/     # Episode watch page
│   │       ├── page.tsx          # Server: fetches episode + wordMap
│   │       └── EpisodePage.tsx   # Client: player, script, tooltips (~2,100 lines)
│   ├── components/               # Shared components
│   │   ├── navbar/               # Active top nav (index.tsx + MegaMenuGrid, MobileDrawer, UserMenu, etc.)
│   │   ├── AuthDialog.tsx        # Sign-in / register / forgot-password modal
│   │   ├── footer.tsx            # Site footer
│   │   ├── MobileBottomNav.tsx   # Mobile bottom navigation bar
│   │   ├── FloatingVideoPlayer.tsx # Global picture-in-picture video player
│   │   ├── ErrorBoundary.tsx     # Global error boundary wrapper
│   │   ├── ErrorPage.tsx         # Reusable client error page
│   │   ├── ThemeProvider.tsx     # MUI ThemeProvider wrapper using app/theme.ts
│   │   ├── GlobalDataInit.tsx    # Currently a pass-through wrapper
│   │   ├── StudySection.tsx      # Homepage study CTA section
│   │   ├── CartoonSection.tsx    # Homepage cartoons CTA section
│   │   ├── HomeHero.tsx          # Homepage hero banner
│   │   ├── CefrLevelsSection.tsx # Homepage CEFR level grid
│   │   ├── ChooseYourPath.tsx    # Homepage path selector
│   │   ├── content-grid/         # Reusable content grid + filter sidebar + card
│   │   ├── dashboard/            # Dashboard UI components (currently unused)
│   │   ├── page-layout/          # Reusable page sections (PageBanner, HowItWorksSection, PlacementTestCTA)
│   │   ├── settings-controls/    # Shared PillToggle, ToggleRow, DesktopTextScaleSlider, SettingsDialog
│   │   └── vocab-tooltip/        # Inline Arabic vocabulary tooltip system
│   ├── flashcards/               # Flashcard routes
│   │   ├── page.tsx              # Server: level list
│   │   ├── FlashcardsLandingPage.tsx  # Client: level grid
│   │   ├── [slug]/page.tsx       # Client: theme list + quiz (~436 lines)
│   │   ├── [slug]/themes/        # Dedicated theme landing page
│   │   └── components/           # Flashcard sub-components
│   ├── lib/                      # Shared utilities
│   │   ├── supabase/
│   │   │   ├── client.ts         # Browser Supabase client singleton
│   │   │   └── supabase.ts       # Service-role client export
│   │   ├── arabic.ts             # Arabic token normalisation & diacritic stripping
│   │   ├── books.ts              # File-system book parsing
│   │   ├── cartoons.ts           # File-system cartoon parsing + transcript helpers
│   │   ├── date.ts               # Centralised date formatting helpers
│   │   ├── errors.ts             # errorMessage() helper
│   │   ├── fs.ts                 # isPathContained() path-traversal guard
│   │   ├── jsonb.ts              # Safe JSONB parser
│   │   ├── news.ts               # File-system news article parsing + vocabMap building
│   │   ├── news-parser.ts        # RSS / HTML parsing for live news feeds
│   │   ├── pipelineValidation.ts # Transcript token validation for pipeline
│   │   ├── rateLimit.ts          # Simple in-memory rate limiter for Server Actions
│   │   ├── rss.ts                # RSS feed fetching & normalisation
│   │   ├── study.ts              # CEFR metadata helpers
│   │   └── useYouTubePlayer.ts   # YouTube iframe player hook
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
│   ├── profile/                  # User profile
│   │   ├── page.tsx              # Main profile page (~721 lines)
│   │   ├── components/           # Refactored profile pieces (currently unused)
│   │   └── types.ts              # Profile section types
│   ├── reset-password/page.tsx   # Password reset form
│   ├── AuthContext.tsx           # React Context for Supabase auth state
│   ├── globals.css               # Tailwind v4 import + full AWM :root design-token variables
│   ├── layout.tsx                # Root layout (Navbar + Footer + AuthProvider + MobileBottomNav + FloatingVideoPlayer)
│   ├── page.tsx                  # Homepage
│   └── theme.ts                  # Central MUI theme + design tokens
├── content/                      # Static content files
│   ├── books/                    # Book metadata (_meta.json), chapters (page*.json), covers
│   ├── cartoons/                 # Legacy show metadata + episode markdown scripts
│   └── news/                     # Graded news article markdown files (articles/a0/ ... articles/a2/)
├── migrations/                   # Empty (SQL migrations live in supabase/migrations/)
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
│   ├── playerStore.ts            # PiP video player state
│   └── vocabStore.ts             # Theme/vocab caching
├── supabase/migrations/          # SQL schema migrations
│   └── 001_add_level_stats_rpc.sql
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

# Admin user IDs for vocab/CMS editing privileges (optional)
ADMIN=<supabase-user-uuid>
ADMIN2=<supabase-user-uuid>

# SIWAR Arabic dictionary API key (optional)
SIWAR=<api-key>
```

**Security note:** `SUPABASE_SERVICE_KEY` is a secret with elevated privileges. It is used only in Server Actions (`"use server"`) and in `app/lib/supabase.ts` to query the database. Never expose it to the client.

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

- **Fonts**: EB Garamond / Cormorant Garamond are used for Arabic/serif text; Jost is used for UI/sans-serif text; Cookie is used for the decorative brand logo. These are imported via `@import url(...)` inside component-level `<style>` blocks. The root `layout.tsx` loads Geist/Geist_Mono, EB Garamond, Jost, and Cookie via `next/font/google`, but only EB Garamond, Jost, and Cookie are the dominant faces.
- **Path alias**: Use `@/` for imports from the project root (e.g. `@/app/lib/arabic`, `@/store/vocabStore`).
- **File naming**: PascalCase for components (`AuthDialog.tsx`), camelCase for utilities (`cartoons.ts`), kebab-case for routes (`reset-password`).
- **TypeScript**: Strict mode is enabled. Prefer explicit types for props and Server Action return values.
- **State management**: Server-fetched data flows through Server Actions → Zustand stores. Auth state lives in `AuthContext.tsx`.
- **Comments**: Inline section dividers are common, e.g. `/* ── theme progress ── */`.
- **Zod validation**: Server Actions in `vocab.ts` use `zod` schemas to sanitise user input (e.g. `levelCode.length > 10` checks, `vocabId <= 0` guards).

## Authentication Flow

1. **Sign up / Sign in**: `AuthDialog.tsx` uses `supabase.auth.signUp/signInWithPassword` or `signInWithOAuth({ provider: 'google' })`.
2. **OAuth callback**: After Google/email sign-in, Supabase redirects to `/auth/callback`. The callback page (`app/auth/callback/page.tsx`) calls `supabase.auth.getSession()` and then redirects to `/`.
3. **Password reset**: Users request a reset link in `AuthDialog` or profile settings. The link redirects to `/reset-password`, which calls `supabase.auth.updateUser({ password })`.
4. **Auth context**: `AuthContext.tsx` wraps the app, listens to `onAuthStateChange`, and provides `{ user, session, loading }` via `useAuth()`.
5. **Admin gating**: `isAdminUser()` in `app/actions/vocab.ts` checks the authenticated user's ID against `ADMIN` / `ADMIN2` env vars. The `/admin` layout calls this function and redirects non-admins to `/`.

## Data Architecture

### Supabase Schema (key tables)
- `vocabulary` — Single table containing all flashcard word data:
  - `word_id` (number, primary key)
  - `word_ar` (Arabic word, plain)
  - `word_di` (diacritic form)
  - `word_tr` (transliteration)
  - `root` (optional string)
  - `level` (CEFR string: A0–C2)
  - `theme` (theme name string)
  - `definitions` — JSONB array of meanings
  - `examples` — JSONB array of sentences (may include `interactive: true`)
  - `forms` — JSONB array of POS + conjugations
- `app_vocab` — Word data used by cartoons, admin tools, and the pipeline:
  - `word_id` (bigint, primary key)
  - `word_ar` (plain Arabic)
  - `word_di` (diacritic form)
  - `word_tr` (transliteration)
  - `root` (optional string)
  - `level` (CEFR string)
  - `theme` (optional theme name)
  - `source` (optional source tag)
  - `definitions` — JSONB array of meanings
  - `examples` — JSONB array of sentences
  - `forms` — JSONB array of POS tags
- `shows` — Cartoon/show metadata. Columns: `id`, `slug`, `title`, `title_ar`, `description`, `cover`, `level`, `category`. (`order` and `genre` have been removed.)
- `episodes` — Episode metadata and transcript. The `transcript` JSONB column is now a JSON array of `{ tokens, timestamp, translation }` blocks using the new token format. A legacy `{ scriptBlocks, vocabList, grammarPoints }` object is still read but not written for new episodes.
- `vocab_lemmas` / `vocab_definitions` — Normalised lemma/definition tables used by the admin pipeline and dictionary actions.
- `verb_conjugations` — Morphology rows for verb lemmas. Columns: `conjugation_id`, `lemma`, `root`, `form_number`, `type`, `conjugation_ar`, `conjugation_diacritic`, `transliteration`, `english_translation`, `is_active`, `source`. `type` is one of `past`, `present`, `imperative`, `verbal_noun`, `active_participle`, `passive_participle`. (The old tense/pronoun model has been replaced.)
- (The `progress`, `review_logs`, and `daily_sessions` tables have been removed.)

### Server Actions pattern
All DB mutations and sensitive reads live in `app/actions/*.ts` with `"use server"`. They use:
- `serviceClient` from `app/lib/supabase.ts` (a `createClient` from `@supabase/supabase-js` using the service key) for DB queries.
- `createServerClient` from `@supabase/ssr` with cookie access for auth verification.
- Direct queries against `vocabulary`, `app_vocab`, `shows`, `episodes`, `vocab_lemmas`, `vocab_definitions`, and `verb_conjugations`.
- `study.ts` uses one RPC call (`get_vocab_level_theme_stats`). No other RPC calls are used.
- `checkRateLimit` from `@/app/lib/rateLimit` guards mutation endpoints with an in-memory rate limiter.

### Client-side caching
- `store/vocabStore.ts`: Caches theme vocab indefinitely (until invalidated via `invalidateTheme` / `invalidateThemeList`). Cache keys use `${themeName}:${levelCode}` for vocab and `levelCode` for theme lists.
- `store/playerStore.ts`: Tracks picture-in-picture video player state globally.

## Key Domain Logic

### Arabic Text Processing (`app/lib/arabic.ts`)
- `stripDiacritics(token)` — removes harakat/tatweel for matching.
- `normalizeArabicToken(token)` — strips diacritics, definite articles (`ال`, `وال`, `بال`, etc.), single-letter proclitics (when the remaining stem is ≥ 4 chars), and common enclitic pronoun suffixes. Used for fuzzy vocabulary lookup in news articles and books.
- `normalizeTransliteration(token)` — strips Latin diacritics for loose transliteration matching.

### JSONB Parsing (`app/actions/vocab.ts`)
- `getPos(formsJson)` — extracts POS from `forms[0].type`.
- `flattenForms(formsJson)` — flattens nested `forms[0].conjugations` into the UI-friendly `FormRow[]` shape.

### Cartoon Content Pipeline
1. Show metadata is read from the `shows` table in Supabase (cover paths are normalised against `public/cartoons/`).
2. Episode metadata and transcripts are stored in the `episodes` table. New transcripts are a JSON array of `{ tokens, timestamp, translation }` blocks.
3. Each token in the new format must include `pos` (part of speech) and lowercase `cefr`. The legacy `{ scriptBlocks, vocabList, grammarPoints }` object is still read for old episodes.
4. At request time, `fetchEpisodeForPublic` normalises the transcript into `ScriptBlock` objects, propagating `pos` and `cefr` onto each `CartoonWordEntry`. The resulting `wordMap` and `diacritizedMap` power the inline hover tooltips.
5. Legacy markdown episodes still exist in `content/cartoons/` but are not used by the public site.

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
- Level slugs (`Beginner`, `Apprentice`, etc.) are mapped to CEFR codes (`A0`–`C2`) in `SLUG_TO_LEVEL`.

### Admin Pipeline (`app/admin/pipeline/`)
- `/admin/pipeline` is now a MUI Stepper wizard (`app/admin/pipeline/PipelineWizard.tsx`).
- Admins can either **create a new show** or **add an episode to an existing show**, then run the shared vocabulary pipeline.
- Episode slug auto-suggestion uses `suggestNextEpisodeSlug()` in `app/lib/slug.ts`.
- `previewPipeline()` validates transcript tokens and returns existing/new lemma candidates.
- `commitPipeline()` writes lemmas into `vocab_lemmas`.
- `buildDefinitionsPromptData()` builds the LLM prompt for definitions; admins copy/paste the LLM JSON and `validateDefinitionRows()` (in `app/lib/pipelineValidation.ts`) validates it before commit via `commitDefinitions()`.
- Conjugations are generated the same way: `buildConjugationsPrompt()` builds the prompt, `validateConjugationRows()` (in `app/lib/conjugations.ts`) validates the LLM JSON, and `commitConjugations()` writes rows to `verb_conjugations`. The old remote Python conjugation service has been removed.

## Testing

The project uses **Vitest** with `jsdom` and `@vitejs/plugin-react`.

- **Config**: `vitest.config.ts` at project root.
- **Current tests**:
  - `app/lib/arabic.test.ts` — Arabic token normalisation.
  - `app/lib/cartoons.test.ts` — New/legacy transcript format detection, `pos`/`cefr` propagation, and normalisation.
  - `app/lib/pipelineValidation.test.ts` — Transcript token flattening and schema validation (including required `pos` and lowercase `cefr`).
  - `app/lib/slug.test.ts` — Episode slug auto-suggestion.
  - `app/lib/conjugations.test.ts` — Conjugation row validation and prompt building.
- **How to run**: `npm test`
- There is no CI/CD pipeline configured. If you add tests, create new `*.test.ts` / `*.test.tsx` files alongside the code they test.

## Security Considerations

- `reactStrictMode` is **disabled** in `next.config.ts`.
- Security headers (CSP, X-Frame-Options, X-Content-Type-Options, Referrer-Policy) are set in `next.config.ts`.
- The CSP allows YouTube iframe embeds and the Supabase API domain.
- All DB mutations validate the authenticated user ID server-side.
- Input validation is present on Server Actions using `zod` schemas (e.g. `levelCode.length > 10` checks, `vocabId <= 0` guards).
- `cartoons.ts`, `news.ts`, `books.ts`, and `fs.ts` use `isPathContained()` path-traversal guards to ensure filesystem reads stay inside their respective content directories.
- `rateLimit.ts` provides simple per-key rate limiting for Server Actions. It is in-memory only and therefore suitable for single-instance deployments (e.g. Vercel hobby plan).
- Admin actions are gated by `isAdminUser()` which compares the authenticated user's UUID against the `ADMIN` / `ADMIN2` environment variables.

## Deployment

The project is designed for deployment on **Vercel** (standard Next.js target). No custom `vercel.json` or Dockerfile is present. Ensure the Supabase environment variables are configured in the hosting platform's dashboard.

## When Modifying Code

1. **Check if a file is a Client Component** before adding browser-only hooks (`useState`, `useEffect`, etc.). If it is a Server Component and you need interactivity, either convert it to `'use client'` or extract a client sub-component.
2. **Prefer Server Actions** for any data mutation or sensitive read. Do not call Supabase service key from the browser.
3. **Preserve the design system**: Use the existing colour values (`#2c1a0e`, `#b8860b`, `#f5ede0`, `#7a6e65`, `#9e8a7a`, `#d4a843`) and font pairings (EB Garamond / Cormorant Garamond for Arabic/headings, Jost for UI text).
4. **Keep MUI `sx` prop usage consistent** with the existing patterns (e.g. `borderRadius: '10px'` for cards, `borderRadius: '9999px'` for pills, `fontFamily: 'Jost, sans-serif'`).
5. **Respect the path alias**: Always use `@/` imports rather than relative paths when crossing top-level directories.
6. **Testing**: Run `npm test` after modifying shared utilities. Add new test cases for new edge cases.
7. **Be aware of unused/legacy files**: `app/profile/components/` contains refactored profile pieces that are currently unused; `app/components/dashboard/` is not wired to any route. Do not delete them without confirming with the team, but do not treat them as the source of truth for active features.
