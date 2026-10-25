# Website learning dashboard

The homepage stats strip uses `loadLearningSnapshot` for recorded learning data
and `summarizeLearningDashboard` for weekly summaries, streaks and count labels.
The public profile keeps only its streak card, fed by the same summary.
Calendar dates and weekly boundaries use Europe/London.

## Sources

- Total learning time: `learning_profiles` legacy and tracked counters.
- Reading time, watch time and word inspections: `learning_activity_daily`.
- Memory review counts: `website_memory_totals` (the XP field it also returns
  is ignored by the website and used only by the mobile app).
- Word Search completion counts: the `wordSearches` field of the existing
  `learning_xp_totals` RPC (its XP fields are likewise ignored).
- Current streak: recorded days with at least 60 active seconds, combined
  with preserved legacy active dates.
- AWM Plus: the existing subscription entitlement function and account role.
- Avatar: Auth `avatar_url` and normalized `avatar_crop` metadata and the existing
  `profile-media` bucket. The shared thumbnail editor previews the actual circular
  avatar. Its crop is applied to the original image without destructive cropping,
  so users can reposition the saved image later.
- Currently Reading: Auth `book_progress` metadata and published book chapters.

The website-only migration `20261002173850_website_learning_dashboard.sql` adds
two service-role read functions. It leaves the shared, session-bound Memory RPC
and all write paths unchanged. History summaries aggregate all recorded dates.
Anonymous and authenticated roles cannot execute these functions directly.
Profile reads retain the existing public/private gate.

The website does not award or display XP, levels or achievements; the shared
RPCs still award XP for the mobile app, and the website passes zero where an
RPC expects an XP argument.

## Reading lists

Chapter positions record where a user has opened a chapter. They do not prove
completion. The dashboard therefore reports reading/watch time and review or
completion counts, rather than claiming books, episodes or cards are mastered.

Removing a book sets `hiddenFromList` on its saved progress entry. It preserves
the chapter, timestamps, sentence bookmark and learning history. Opening that book
again clears the flag and restores it to Currently Reading.

Quick actions and profile statistics use responsive CSS grids, and decorative
hover animations respect reduced-motion preferences.
