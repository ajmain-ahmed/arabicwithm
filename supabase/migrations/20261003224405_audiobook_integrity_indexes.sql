create index book_audio_progress_chapter_idx on public.book_audio_progress(chapter_id);
-- Explicitly service-only; browser roles retain no grants or policies.
create policy chapter_audio_service on public.book_chapter_audio for all to service_role using(true) with check(true);
create policy audio_progress_service on public.book_audio_progress for all to service_role using(true) with check(true);
