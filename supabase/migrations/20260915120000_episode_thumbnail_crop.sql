alter table public.shows
  add column if not exists cover_crop jsonb not null
  default '{"x": 50, "y": 50, "zoom": 1}'::jsonb;

alter table public.episodes
  add column if not exists cover_crop jsonb not null
  default '{"x": 50, "y": 50, "zoom": 1}'::jsonb;

alter table public.books
  add column if not exists cover_crop jsonb not null
  default '{"x": 50, "y": 50, "zoom": 1}'::jsonb;

alter table public.shows
  drop constraint if exists shows_cover_crop_valid;

alter table public.shows
  add constraint shows_cover_crop_valid check (
    jsonb_typeof(cover_crop) = 'object'
    and (cover_crop->>'x')::numeric between 0 and 100
    and (cover_crop->>'y')::numeric between 0 and 100
    and (cover_crop->>'zoom')::numeric between 1 and 3
  );

alter table public.episodes
  drop constraint if exists episodes_cover_crop_valid;

alter table public.episodes
  add constraint episodes_cover_crop_valid check (
    jsonb_typeof(cover_crop) = 'object'
    and (cover_crop->>'x')::numeric between 0 and 100
    and (cover_crop->>'y')::numeric between 0 and 100
    and (cover_crop->>'zoom')::numeric between 1 and 3
  );

comment on column public.episodes.cover_crop is
  'Non-destructive 4:5 thumbnail crop: focal-point percentages x/y and zoom multiplier.';

alter table public.books
  drop constraint if exists books_cover_crop_valid;

alter table public.books
  add constraint books_cover_crop_valid check (
    jsonb_typeof(cover_crop) = 'object'
    and (cover_crop->>'x')::numeric between 0 and 100
    and (cover_crop->>'y')::numeric between 0 and 100
    and (cover_crop->>'zoom')::numeric between 1 and 3
  );

comment on column public.shows.cover_crop is
  'Non-destructive 4:5 thumbnail crop: focal-point percentages x/y and zoom multiplier.';

comment on column public.books.cover_crop is
  'Non-destructive 2:3 cover crop: focal-point percentages x/y and zoom multiplier.';
