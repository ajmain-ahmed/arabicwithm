<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# ArabicWithM — Agent Guide

## Project Overview

ArabicWithM is a Next.js 16 web application that helps users learn Arabic through cartoons. The stack is React 19 + TypeScript 5, styled primarily with Material UI v9 (`@mui/material`), and backed by Supabase for authentication and PostgreSQL data.

Key features:
- **Cartoons**: Arabic-subtitled cartoon episodes with inline vocabulary lookup, synced to a YouTube player.
- **User Authentication**: Sign-up / sign-in, Google OAuth, and password reset via Supabase Auth.
- **Admin CMS**: Protected `/admin/*` routes for managing cartoon shows and episodes.

## Technology Stack

| Layer | Technology | Version / Notes |
|-------|-----------|-----------------|
| Framework | Next.js | 16.2.3 (App Router) |
| React | react & react-dom | 19.2.4 |
| Language | TypeScript | 5.x (strict mode) |
| Styling | Tailwind CSS | v4 (configured but minimally used; MUI `sx` is primary) |
| UI Library | Material UI | v9 (`@mui/material`, `@mui/icons-material`) |
| Animation | Framer Motion | 12.x |
| State | Zustand | 5.x (`playerStore.ts` only) |
| Backend / Auth | Supabase | `@supabase/supabase-js` + `@supabase/ssr` |
| Fonts | Google Fonts | EB Garamond / Cormorant Garamond (Arabic/serif), Jost (UI/sans-serif). Loaded inline in component `<style>` blocks. The root layout also installs Geist/Geist_Mono via `next/font/google` but they are rarely used. |
| Testing | Vitest | 4.x with `@vitejs/plugin-react` and `jsdom` |
| Icons | lucide-react | used alongside MUI icons in newer components |

## Project Structure

```
├── app/                          # Next.js App Router
│   ├── actions/                  # Server Actions (data fetching & mutations)
│   │   ├── auth.ts               # Admin authentication helpers
│   │   ├── admin.ts              # Admin CMS for shows and episodes
│   │   └── cartoons.ts           # Public cartoon browsing/watching + transcript enrichment
│   ├── (admin)/admin/            # Admin CMS pages + components (protected by isAdminUser)
│   │   ├── components/           # AdminNav, AdminThemeProvider, AdminTextField, etc.
│   │   ├── episodes/
│   │   ├── shows/
│   │   └── page.tsx              # Redirects to /admin/shows
│   ├── auth/callback/page.tsx    # OAuth callback handler
│   ├── cartoons/                 # Cartoon routes
│   │   ├── page.tsx              # Server: list all shows
│   │   ├── CartoonsPage.tsx      # Client: shows grid
│   │   ├── [show]/page.tsx       # Server: show detail
│   │   ├── [show]/ShowPage.tsx   # Client: episodes list
│   │   └── [show]/[episode]/     # Episode watch page
│   │       ├── page.tsx          # Server: fetches episode + wordMap
│   │       └── EpisodePage.tsx   # Client: player, script, tooltips
│   ├── components/               # Shared components
│   │   ├── navbar/               # Active top nav (index.tsx + MegaMenuGrid, MobileDrawer, UserMenu, etc.)
│   │   ├── AuthDialog.tsx        # Sign-in / register / forgot-password modal
│   │   ├── footer.tsx            # Site footer
│   │   ├── MobileBottomNav.tsx   # Mobile bottom navigation bar
│   │   ├── FloatingVideoPlayer.tsx # Global picture-in-picture video player
│   │   ├── ErrorBoundary.tsx     # Global error boundary wrapper
│   │   ├── ThemeProvider.tsx     # MUI ThemeProvider wrapper using app/theme.ts
│   │   ├── GlobalDataInit.tsx    # Currently a pass-through wrapper
│   │   ├── CartoonSection.tsx    # Homepage cartoons CTA section
│   │   ├── HomeHero.tsx          # Homepage hero banner
│   │   ├── content-grid/         # Reusable content grid + filter sidebar + card
│   │   ├── page-layout/          # Reusable page sections (PageBanner)
│   │   ├── settings-controls/    # Shared PillToggle, ToggleRow, DesktopTextScaleSlider, SettingsDialog
│   │   └── vocab-tooltip/        # Inline Arabic vocabulary tooltip system
│   ├── lib/                      # Shared utilities
│   │   ├── supabase/
│   │   │   ├── client.ts         # Browser Supabase client singleton
│   │   │   └── supabase.ts       # Service-role client export
│   │   ├── arabic.ts             # Arabic token normalisation & diacritic stripping
│   │   ├── cartoons.ts           # File-system cartoon parsing + transcript helpers
│   │   ├── date.ts               # Centralised date formatting helpers
│   │   ├── display.ts            # Formatting helpers for POS, CEFR, etc.
│   │   ├── errors.ts             # errorMessage() helper
│   │   ├── fs.ts                 # isPathContained() path-traversal guard
│   │   ├── jsonb.ts              # Safe JSONB parser
│   │   ├── rateLimit.ts          # Simple in-memory rate limiter for Server Actions
│   │   ├── slug.ts               # Episode slug auto-suggestion
│   │   ├── useIsAdmin.ts         # Client hook for admin status
│   │   └── useYouTubePlayer.ts   # YouTube iframe player hook
│   ├── reset-password/page.tsx   # Password reset form
│   ├── AuthContext.tsx           # React Context for Supabase auth state
│   ├── globals.css               # Tailwind v4 import + full AWM :root design-token variables
│   ├── layout.tsx                # Root layout (Navbar + Footer + AuthProvider + MobileBottomNav + FloatingVideoPlayer)
│   ├── page.tsx                  # Homepage
│   └── theme.ts                  # Central MUI theme + design tokens
├── content/                      # Static content files
│   └── cartoons/                 # Legacy show metadata + episode markdown scripts (not used by public site)
├── public/                       # Static assets
│   ├── banners/
│   ├── books/                    # (legacy assets)
│   ├── cards/                    # (legacy assets)
│   ├── cartoons/
│   ├── dragons/                  # Decorative images (unused)
│   ├── homepage/
│   ├── levels/                   # (legacy assets)
│   └── themes/                   # (legacy assets)
├── store/                        # Zustand client stores
│   └── playerStore.ts            # PiP video player state
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

# Admin user IDs for CMS editing privileges (optional)
ADMIN=<supabase-user-uuid>
ADMIN2=<supabase-user-uuid>
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
- **Path alias**: Use `@/` for imports from the project root (e.g. `@/app/lib/arabic`, `@/store/playerStore`).
- **File naming**: PascalCase for components (`AuthDialog.tsx`), camelCase for utilities (`cartoons.ts`), kebab-case for routes (`reset-password`).
- **TypeScript**: Strict mode is enabled. Prefer explicit types for props and Server Action return values.
- **State management**: Auth state lives in `AuthContext.tsx`. The only Zustand store is `playerStore.ts` for PiP video state.
- **Comments**: Inline section dividers are common, e.g. `/* ── theme progress ── */`.

## Authentication Flow

1. **Sign up / Sign in**: `AuthDialog.tsx` uses `supabase.auth.signUp/signInWithPassword` or `signInWithOAuth({ provider: 'google' })`.
2. **OAuth callback**: After Google/email sign-in, Supabase redirects to `/auth/callback`. The callback page (`app/auth/callback/page.tsx`) calls `supabase.auth.getSession()` and then redirects to `/`.
3. **Password reset**: Users request a reset link in `AuthDialog`. The link redirects to `/reset-password`, which calls `supabase.auth.updateUser({ password })`.
4. **Auth context**: `AuthContext.tsx` wraps the app, listens to `onAuthStateChange`, and provides `{ user, session, loading }` via `useAuth()`.
5. **Admin gating**: `isAdminUser()` in `app/actions/auth.ts` checks the authenticated user's ID against `ADMIN` / `ADMIN2` env vars. The `/admin` layout calls this function and redirects non-admins to `/`.

## Data Architecture

### Supabase Schema (key tables)
- `shows` — Cartoon/show metadata. Columns: `id`, `slug`, `title`, `title_ar`, `description`, `cover`, `level`, `category`.
- `episodes` — Episode metadata and transcript. The `transcript` JSONB column stores a JSON array of `{ tokens, timestamp, translation }` blocks. A legacy `{ scriptBlocks, vocabList, grammarPoints }` object is still read but not written for new episodes.

### Server Actions pattern
All DB mutations and sensitive reads live in `app/actions/*.ts` with `"use server"`. They use:
- `serviceClient` from `app/lib/supabase.ts` (a `createClient` from `@supabase/supabase-js` using the service key) for DB queries.
- `createServerClient` from `@supabase/ssr` with cookie access for auth verification.
- Direct queries against `shows` and `episodes` only.
- Admin actions are gated by `guardAdmin()` / `isAdminUser()` from `app/actions/auth.ts`.

### Client-side caching
- `store/playerStore.ts`: Tracks picture-in-picture video player state globally.

## Key Domain Logic

### Arabic Text Processing (`app/lib/arabic.ts`)
- `stripDiacritics(token)` — removes harakat/tatweel for matching.
- `normalizeArabicToken(token)` — strips diacritics, definite articles (`ال`, `وال`, `بال`, etc.), single-letter proclitics (when the remaining stem is ≥ 4 chars), and common enclitic pronoun suffixes.
- `normalizeTransliteration(token)` — strips Latin diacritics for loose transliteration matching.

### Cartoon Content Pipeline
1. Show metadata is read from the `shows` table in Supabase (cover paths are normalised against `public/cartoons/`).
2. Episode metadata and transcripts are stored in the `episodes` table. New transcripts are a JSON array of `{ tokens, timestamp, translation }` blocks.
3. Each token in the new format must include `pos` (part of speech) and lowercase `cefr`. The legacy `{ scriptBlocks, vocabList, grammarPoints }` object is still read for old episodes.
4. At request time, `fetchEpisodeForPublic` normalises the transcript into `ScriptBlock` objects, propagating `pos` and `cefr` onto each `CartoonWordEntry`. The resulting `wordMap` and `diacritizedMap` power the inline hover tooltips.
5. Legacy markdown episodes still exist in `content/cartoons/` but are not used by the public site.

### Admin CMS
- `/admin` redirects to `/admin/shows`.
- `/admin/shows` lists shows and allows create/edit/delete.
- `/admin/episodes` lists episodes and allows create/edit/delete.
- `app/(admin)/admin/components/EpisodeEditDialog.tsx` provides a transcript JSON editor for episode content.
- Episode slug auto-suggestion uses `suggestNextEpisodeSlug()` in `app/lib/slug.ts`.

## Testing

The project uses **Vitest** with `jsdom` and `@vitejs/plugin-react`.

- **Config**: `vitest.config.ts` at project root.
- **Current tests**:
  - `app/lib/arabic.test.ts` — Arabic token normalisation.
  - `app/lib/cartoons.test.ts` — New/legacy transcript format detection and `pos`/`cefr` propagation.
  - `app/lib/slug.test.ts` — Episode slug auto-suggestion.
- **How to run**: `npm test`
- There is no CI/CD pipeline configured. If you add tests, create new `*.test.ts` / `*.test.tsx` files alongside the code they test.

## Security Considerations

- `reactStrictMode` is **disabled** in `next.config.ts`.
- Security headers (CSP, X-Frame-Options, X-Content-Type-Options, Referrer-Policy) are set in `next.config.ts`.
- The CSP allows YouTube iframe embeds and the Supabase API domain.
- All DB mutations validate the authenticated user ID server-side.
- `cartoons.ts` and `fs.ts` use `isPathContained()` path-traversal guards to ensure filesystem reads stay inside their content directories.
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
7. **Database scope**: The application only uses the `shows` and `episodes` Supabase tables. Do not introduce queries against other tables without explicit direction.

## Arabic Content Ingestion

When the user supplies Arabic/English material for a cartoon transcript or book
chapter, read and follow `docs/content-ingestion.md`. Treat it as the canonical
schema, Hans Wehr matching policy, validation checklist, and Supabase routing
guide. Do not guess ambiguous dictionary senses, and do not mutate content until
the user identifies the target and explicitly asks for it to be added or updated.
