alter table public.book_chapter_audio
  add column storage_bucket text,
  add column external_url text;

alter table public.book_chapter_audio drop constraint book_chapter_audio_source_type_check;
alter table public.book_chapter_audio drop constraint book_chapter_audio_source;
alter table public.book_chapter_audio add constraint book_chapter_audio_source_type_check
  check (source_type in ('supabase_storage', 'youtube', 'external_url'));
alter table public.book_chapter_audio add constraint book_chapter_audio_source check (
  (source_type = 'supabase_storage' and storage_path is not null and external_video_id is null and external_url is null)
  or (source_type = 'youtube' and external_video_id is not null and storage_path is null and storage_bucket is null and external_url is null)
  or (source_type = 'external_url' and external_url like 'https://%' and storage_path is null and storage_bucket is null and external_video_id is null)
);
comment on column public.book_chapter_audio.storage_bucket is 'Null on legacy records means audiobooks. Store paths, never temporary signed URLs.';
-- Retain the existing privacy, size limit, and storage policies.
update storage.buckets set allowed_mime_types = array['audio/mpeg','audio/mp4','audio/x-m4a','audio/aac','audio/wav','audio/x-wav','audio/ogg'] where id = 'audiobooks';
