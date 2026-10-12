-- Existing unlabelled audio and progress remain Arabic; paths are untouched.
alter table public.book_chapter_audio add column language text not null default 'ar'
  check (language in ('ar', 'en'));
alter table public.book_chapter_audio drop constraint book_chapter_audio_chapter_id_key;
alter table public.book_chapter_audio add constraint book_chapter_audio_chapter_language_key unique (chapter_id, language);
alter table public.book_audio_progress add column language text not null default 'ar'
  check (language in ('ar', 'en'));
alter table public.book_audio_progress drop constraint book_audio_progress_pkey;
alter table public.book_audio_progress add primary key (user_id, chapter_id, language);
comment on table public.book_chapter_audio is 'One private audiobook source per chapter and language, mediated by server actions.';
