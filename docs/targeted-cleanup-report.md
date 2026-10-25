# Targeted website cleanup

Implemented locally; not deployed. Earlier website work remains intact.

1. **Checkbox:** it previously supplied the explicit boolean required by the existing app-launch action. Removed its state, visual checkbox and separate consent gate. Clicking the clearly labelled notification button now supplies that same opt-in. The existing action, consent version, guest deduplication, account withdrawal, validation and success/error states remain in use; there is no second signup flow.
2. **Store badges:** both official assets use identical 148 ? 44 px flex wrappers. Visible artwork is 40 px high. The Google PNG's transparent padding is compensated for with proportional image height; flex centring fixes the previous oversized grid-track offset. Aspect ratios and artwork are untouched. Badges pair where space permits and stack at 320 px.
3. **QR:** Git history (`841d496`, original section from `0f269f2`) contains only the inline `FakeQr` random pattern, explicitly labelled a placeholder. No QR image asset exists. After this was explained, you cancelled the QR request (?oh nevermind then?), so no placeholder or new QR was added.
4. **Banner size:** reduced outer vertical padding from 32/48 px to 20/24 px, heading from 28?42 px to 26?34 px, gaps, text spacing, badge heights and form padding. The decorative phone is 180 px on desktop and hidden below the desktop breakpoint. The email form retains readable controls and a 44 px minimum action. No download functionality was removed: the existing badges still state coming soon because real store URLs are not configured.
5. **Desktop settings:** For You's disconnected text button is replaced by a 40 px circular settings icon beside the Explore and For You controls in a centred horizontal group. Mobile retains a separate 44 px icon that fits its layout.
6. **Settings preserved:** the same dialog, state and persisted preferences control Tashk?l, inline word meanings and the English sentence. The existing video, sound and navigation logic remain in place.
7. **Book pulse:** shared Read/Listen cards animate only their green box shadow, gently breathing from 20% to 14% colour intensity over two seconds with ease-in-out. No card dimensions or position change.
8. **Motion:** the animation is confined to hover-capable, fine-pointer devices. Reduced motion disables the repeating animation while retaining the static glow. Touch cards do not pulse.
9. **Files:** `AppDownloadSection.tsx`, `AppLaunchSignup.tsx`, `ExploreViews.tsx`, `ForYouFeed.tsx`, `LibraryBookCard.tsx`, `e2e/website-update.pw.ts`, `e2e/targeted-cleanup.pw.ts` and this report. No database or backend changes.
10. **Verification:** final results below.

## Verification

- Existing signup, For You, YouTube hook and homepage unit regressions: **17 passed**.
- TypeScript and changed-component ESLint: **passed**.
- Final production build: **passed**, including TypeScript and 171 generated pages.
- Targeted browser suite: **10 passed** in 52.8 seconds.
- Changed-file ESLint and whitespace checks: **passed**.
- Visually reviewed 390 px and 1440 px CTA captures and the desktop control group. The settings fixture uses synthetic YouTube IDs, so the external player may show unavailable; this run verifies the layout/settings rather than external video availability.
- Browser checks inspect actual non-transparent badge artwork, not just image element sizes, at 320, 390, 768, 1440 and 1920 px; settings position and all three toggles at mobile/desktop widths; guest signup/deduplication and account opt-in/withdrawal; fine-pointer pulse, stable bounds, reduced motion and touch behaviour.

Screenshots: [mobile CTA](../test-results/cleanup-app-390.png), [desktop CTA](../test-results/cleanup-app-1440.png), [mobile settings](../test-results/cleanup-settings-390.png), [desktop settings](../test-results/cleanup-settings-1440.png). These are local, Git-ignored verification artifacts.
