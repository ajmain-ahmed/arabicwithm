alter table public.book_chapter_audio
  add column timing_data jsonb;

alter table public.book_chapter_audio
  add constraint book_chapter_audio_timing_data_object
  check (timing_data is null or jsonb_typeof(timing_data) = 'object');

comment on column public.book_chapter_audio.timing_data is 'Optional per-language sentence timing map. Playback accepts it only when its content hash matches the current chapter.';
