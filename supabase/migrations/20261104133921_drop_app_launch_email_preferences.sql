-- App-launch email signup removed from the homepage (replaced with coming-soon
-- store badges). The consent list never gained a sender; drop it entirely.
-- The dependent index (email_preferences_user_id_idx) drops with the table.
drop table if exists public.email_preferences;
