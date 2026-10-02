# Website learning dashboard

The homepage and profile use `loadLearningSnapshot` for recorded learning data
and `summarizeLearningDashboard` for labels, weekly summaries, levels and streaks.
The existing level curve is unchanged: recorded learning minutes and XP contribute
to progression. Calendar dates and weekly boundaries use Europe/London.

## Sources

- Total learning time: `learning_profiles` legacy and tracked counters.
- Reading time, watch time and word inspections: `learning_activity_daily`.
- XP: the existing `learning_xp_totals` RPC, including Memory, Word Search and
  legacy XP. Undated legacy XP appears in lifetime totals only.
- Memory reviews: `memory_reviews`; legacy Memory XP remains in lifetime XP.
- Word Search completions: `word_search_completions`.
- Current and longest streaks: recorded days with at least 60 active seconds,
  combined with preserved legacy active dates.
- AWM Plus: the existing subscription entitlement function and account role.
- Avatar: Auth `avatar_url` and normalized `avatar_crop` metadata and the existing
  `profile-media` bucket. The shared thumbnail editor previews the actual circular
  avatar. Its crop is applied to the original image without destructive cropping,
  so users can reposition the saved image later.
- Currently Reading: Auth `book_progress` metadata and published book chapters.

The website-only migration `20261002173850_website_learning_dashboard.sql` adds
two service-role read functions. It leaves the shared, session-bound Memory RPC
and all write paths unchanged. History summaries aggregate all recorded dates;
charts receive up to 400 dates. Anonymous and authenticated roles cannot execute
these functions directly. Profile reads retain the existing public/private gate.

## Achievements and reading lists

`ACHIEVEMENT_FAMILIES` defines categories and thresholds. Levels award a milestone
every 10 levels; other cumulative families extend by doubling their last configured
threshold. The cabinet paginates milestones instead of imposing a level cap.
Achievements are derived, so no duplicated achievement records are stored.
The profile shows up to four highlights in one Trophy Cabinet card. The full
cabinet opens in a dialog with every milestone family and pagination, without
filters. Owners can save `featured_trophies` in Auth metadata; those identifiers
are checked against earned milestones before display and cannot grant achievements.
Streak achievements use the longest recorded streak and remain earned after a gap.

Chapter positions record where a user has opened a chapter. They do not prove
completion. The dashboard therefore awards reading/watch time milestones and
review-count milestones, rather than claiming books, episodes or cards are mastered.
Earned dates are omitted because existing history cannot reliably establish them.

Removing a book sets `hiddenFromList` on its saved progress entry. It preserves
the chapter, timestamps, sentence bookmark and learning history. Opening that book
again clears the flag and restores it to Currently Reading.

Charts expose an expandable daily-value table for keyboard and touch users.
Achievement requirements and progress remain visible without tooltips. Quick
actions, profile statistics and achievements use responsive CSS grids, and new
decorative hover animations respect reduced-motion preferences.
