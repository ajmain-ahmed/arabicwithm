-- Run this in your Supabase SQL Editor (or via CLI)
-- It creates a single RPC that returns every level/theme combo with its word count.
-- Callers can aggregate by level or read per-theme breakdowns as needed.

create or replace function get_vocab_level_theme_stats()
returns table (
  level text,
  theme text,
  word_count bigint
)
language sql
stable
as $$
  select
    vocabulary.level,
    vocabulary.theme,
    count(*) as word_count
  from vocabulary
  where vocabulary.level is not null
    and vocabulary.theme is not null
  group by vocabulary.level, vocabulary.theme
  order by vocabulary.level, vocabulary.theme;
$$;
