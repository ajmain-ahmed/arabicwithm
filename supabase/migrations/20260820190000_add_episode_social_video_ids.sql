alter table public.episodes
  add column if not exists instagram_id text,
  add column if not exists tiktok_id text,
  add column if not exists facebook_id text;

comment on column public.episodes.instagram_id is 'Instagram Reel shortcode';
comment on column public.episodes.tiktok_id is 'TikTok numeric video ID';
comment on column public.episodes.facebook_id is 'Facebook video ID or public video URL';
