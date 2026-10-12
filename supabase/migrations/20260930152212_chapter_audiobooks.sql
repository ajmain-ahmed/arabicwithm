create table public.book_chapter_audio (
  id uuid primary key default gen_random_uuid(),
  chapter_id uuid not null unique references public.chapters(id) on delete cascade,
  source_type text not null check (source_type in ('supabase_storage', 'youtube')),
  storage_path text,
  external_video_id text,
  duration_seconds integer check (duration_seconds is null or duration_seconds > 0),
  narrator text,
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint book_chapter_audio_source check (
    (source_type = 'supabase_storage' and storage_path is not null and external_video_id is null)
    or (source_type = 'youtube' and external_video_id is not null and storage_path is null)
  )
);

create index book_chapter_audio_published_idx on public.book_chapter_audio (is_published, chapter_id);

create table public.book_audio_progress (
  user_id uuid not null references auth.users(id) on delete cascade,
  chapter_id uuid not null references public.chapters(id) on delete cascade,
  position_seconds integer not null default 0 check (position_seconds >= 0),
  completed boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key (user_id, chapter_id)
);

alter table public.book_chapter_audio enable row level security;
alter table public.book_audio_progress enable row level security;

revoke all on public.book_chapter_audio from public, anon, authenticated;
revoke all on public.book_audio_progress from public, anon, authenticated;
grant all on public.book_chapter_audio to service_role;
grant all on public.book_audio_progress to service_role;

comment on table public.book_chapter_audio is 'One optional audiobook source per book chapter. Access is only mediated by server actions.';
comment on table public.book_audio_progress is 'Audiobook playback position, intentionally separate from text reading progress.';
