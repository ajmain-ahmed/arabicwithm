The top-right desktop account avatar now reads the same canonical `user_metadata.avatar_url` and `avatar_crop` as the profile page. A successful profile Save updates the existing Supabase Auth state; the navbar immediately renders the saved image without a page reload. Draft chooser selections and Cancel retain their existing behaviour.

`app/components/navbar/UserAvatar.tsx` preserves the 32px circle, existing styling, legacy images/crops and initials fallback. URLs use the existing profile-image validation helper. No new persistent avatar field, image upload or global draft store was introduced.

The focused render/rerender test passes. The production-mode desktop profile test verifies the saved navbar image before reloading, and the mobile profile Save/Cancel regression also passes. The existing responsive navbar layout is retained. Latest website changes have not been committed/pushed by this task.
