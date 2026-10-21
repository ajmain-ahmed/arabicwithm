create index email_preferences_user_id_idx on public.email_preferences(user_id) where user_id is not null;
