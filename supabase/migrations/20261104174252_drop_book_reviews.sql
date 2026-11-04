-- Per-book user reviews removed from the book page (single UI they powered).
-- The table was created out-of-band (not in this repo's migrations) with
-- RLS policies; drop it so the database matches the application.
drop table if exists public.book_reviews;
