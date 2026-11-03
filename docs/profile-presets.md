1. **Final header.** My Profile now has a full-width responsive banner, a circular avatar at its lower-left edge, and identity text below the overlapping image. Existing account, subscription, settings and support sections retain their layout and behavior. Banner artwork uses `object-fit: cover` in a wide frame, rather than stretching.

2. **Desktop offset.** The avatar uses `theme.spacing(4)` (32px) from the banner’s left edge at desktop widths. Intermediate/tablet widths use `theme.spacing(3)` (24px). Identity text uses the same inset.

3. **Mobile offset.** The avatar uses `theme.spacing(2)` (16px), with an 88px diameter below 600px. Larger layouts use a 112px diameter. It remains on the left at narrow widths.

4. **Overlap rule.** The avatar anchor is absolutely positioned at the banner bottom with `translateY(50%)`. Its centre aligns with the banner’s lower boundary, leaving half the image on each side. Following content reserves half the avatar diameter plus 24px, avoiding collisions without a large spacer.

5. **Not centred.** Browser geometry checks verify both the exact left inset and the avatar centre on the banner’s bottom boundary. They also verify that the avatar’s horizontal centre is clearly left of the banner centre at 320, 390, 768 and 1440px.

6. **Profile-picture collection.** The authenticated `listProfilePresets` action dynamically traverses and paginates `profile-pictures` using [Supabase Storage listing](https://supabase.com/docs/reference/javascript/storage-from-list). Folder entries, placeholders, invalid paths, empty/oversized objects and unsupported image types are omitted. Nested valid images remain discoverable. No production filenames are hard-coded. Ten live avatar objects were listed and successfully read during the audit.

7. **Banner collection.** The same dynamic pipeline reads `profile-banners`. Its contents changed during implementation as new banners were added; the final read-only inventory saw six banner objects, without a code change. The chooser supports empty collections and Refresh. A live read check successfully accessed the five banners present at that earlier check; production assets were never uploaded, modified or deleted by this task.

8. **Pickers.** A shared MUI dialog provides circular avatar previews (3 columns on mobile, 5 on desktop) and wide 3:1 banner previews (1 column on mobile, 2 on desktop). It includes loading, empty and safe error states, retry/refresh, scrolling, selected-state borders/`aria-pressed`, focus styling, and native keyboard-operable buttons. The chooser discovers new Storage objects on refresh or reopening.

9. **Edit/Save/Cancel.** Only Edit mode makes the avatar and banner interactive. The images themselves are the controls. Choosing updates the profile preview immediately; Done retains that draft choice. Chooser Cancel restores the choice from when that chooser opened. Profile Cancel restores all previously saved images and discards pending references. Save Changes uses the existing profile action and persists the choices; reloading retains them. Selecting a preset does not upload or copy an image.

10. **Legacy upload UI.** Removed the camera/change-photo badge, file input, upload conversion and crop-upload flow from `ProfileAvatar`. The legacy home-header editor now links to My Profile instead of exposing another upload dialog. Its display remains intact. No legacy Storage image was deleted.

11. **Existing users/defaults.** Valid existing HTTP avatar/banner references continue to display. Existing avatar crops remain until a new preset is saved; a selected preset resets that user’s crop to the centred default. Missing avatars retain the existing initial-letter fallback. Missing banners use the existing site banner/background. No onboarding selection or mass reset is introduced.

12. **Security/RLS.** No RLS policy or bucket visibility was changed. Both curated buckets remain private, Storage objects have RLS enabled, and existing ordinary-role write policies do not grant writes to either preset bucket. Listing requires a verified signed-in user. Save validates the exact allowed bucket, safe path, current object existence, MIME and size before any profile mutation; it derives the target profile from authenticated identity, not a submitted user ID. The restricted read-only image route serves only validated images from these two curated collections, with MIME/no-sniff headers, short public image caching and the existing rate-limit helper. It never fetches arbitrary URLs, other buckets or user-upload folders, and exposes no upload/delete method. Server-only Storage code keeps the service key out of client bundles. Existing Auth metadata remains display data, not an authorization source.

13. **Database.** No schema changes, migrations, bucket changes or production profile writes were needed. Reused existing Auth metadata fields `avatar_url`, `avatar_crop` and `banner_url`, alongside the existing `public_profiles` Save flow. New selections store stable root-relative image-route URLs identifying canonical Storage objects; expiring signed links and duplicate media records/files are not stored. `fetchPublicProfile` explicitly resolves these new references while preserving existing images.

14. **Files changed.**

    - `app/actions/profiles.ts`
    - `app/actions/profiles.test.ts`
    - `app/actions/profilePresets.ts` (new)
    - `app/actions/profilePresets.test.ts` (new)
    - `app/api/profile-presets/[bucket]/[...path]/route.ts` (new)
    - `app/api/profile-presets/[bucket]/[...path]/route.test.ts` (new)
    - `app/lib/profilePresets.ts` (new)
    - `app/lib/profilePresets.test.ts` (new)
    - `app/lib/profilePresetStorage.ts` (new)
    - `app/lib/profilePresetStorage.test.ts` (new)
    - `app/profile/ProfileAvatar.tsx`
    - `app/profile/ProfileAvatar.test.tsx`
    - `app/profile/ProfileView.tsx`
    - `app/profile/ProfileView.test.tsx`
    - `app/profile/ProfileHeader.tsx` (new)
    - `app/profile/ProfilePresetPicker.tsx` (new)
    - `app/components/home/HomeProfileHeader.tsx`
    - `e2e/fixture-server.mjs` (isolated preset fixtures only)
    - `e2e/profile-presets.pw.ts` (new)
    - `docs/profile-presets.md` (this report)
    - `docs/validation/profile-presets/` (screenshots)

15. **Validation/screenshots.** 54 unit/component tests passed across 11 files, including related homepage regressions. All six production-mode browser cases passed in Chrome and all six passed in Edge. They cover the four widths above, measured left/half-overlap geometry, legacy avatar display, no camera/file controls, both chooser sources, keyboard selection, preview, Save/reload, both Cancel levels, live fixture additions, nested images, empty/error/retry states and invalid image endpoints. TypeScript, changed-file ESLint and production builds passed. The simulated Storage failure intentionally logs the safe error during its recovery test; the test passes. Browser tests use isolated synthetic accounts and images, not production profile writes. Live Storage checks and policy inspection were read-only. Edge header/picker screenshots were visually reviewed. Implementation is local; no commit, push or frontend deployment was performed for this new feature.
