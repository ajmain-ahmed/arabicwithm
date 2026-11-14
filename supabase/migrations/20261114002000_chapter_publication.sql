-- Apply before deploying the chapter-publication application changes.
-- Preserve precisely the current release predicate for existing records.
begin;
set local lock_timeout='5s';
set local statement_timeout='30s';
lock table public.books in share mode;
lock table public.chapters in access exclusive mode;
alter table public.chapters add column is_published boolean not null default false;
update public.chapters c set is_published = (b.is_completed is distinct from false)
from public.books b where b.id=c.book_id;
comment on column public.chapters.is_published is 'Explicit Admin publication switch; public access also requires the parent Book to be released. Independent of content.production_status.';

create policy "Only published chapters" on public.chapters as restrictive
for select to anon,authenticated using (is_published);

-- These functions read with privileged access. Amend their chapter predicate,
-- keeping every entitlement, sampling and validation rule intact. Fail closed
-- if a deployed definition differs, rather than silently skipping protection.
do $$
declare entry record; definition text;
begin
 for entry in select * from (values
  ('public.read_book_chapter(uuid)', 'and b.is_completed and (', 'and b.is_completed and c.is_published and ('),
  ('public.website_search_content_v1(text,text,integer,boolean)', 'where p_books and b.is_completed is not false and', 'where p_books and b.is_completed is not false and c.is_published and'),
  ('private.nahw_source(bigint,uuid,integer)', 'where b.is_completed and c.id=p_chapter', 'where b.is_completed and c.is_published and c.id=p_chapter'),
  ('private.practice_occurrence(text,text)', 'where b.is_completed and c.id=split_part', 'where b.is_completed and c.is_published and c.id=split_part'),
  ('private.website_grammar_candidates(text,text,text[],integer)', 'where (b.is_completed and c.id is not null', 'where (b.is_completed and c.is_published and c.id is not null'),
  ('public.word_search_vocabulary(text,uuid)', 'where p_source_type=''book'' and id=p_source_id and', 'where p_source_type=''book'' and is_published and id=p_source_id and'),
  ('private.sarf_context_candidates_v2()', 'where exists(select 1 from private.sarf_book_occurrences', 'where b.is_completed and c.is_published and exists(select 1 from private.sarf_book_occurrences')
 ) as changes(signature,old_text,new_text) loop
  if to_regprocedure(entry.signature) is null then continue; end if;
  select pg_get_functiondef(to_regprocedure(entry.signature)) into definition;
  if position(entry.old_text in definition)=0 then raise exception 'Review changed function before chapter publication migration: %',entry.signature; end if;
  execute replace(definition,entry.old_text,entry.new_text);
 end loop;
end $$;
create index chapters_published_book_order on public.chapters(book_id,chapter_number) where is_published;
commit;
