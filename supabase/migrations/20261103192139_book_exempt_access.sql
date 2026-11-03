begin;

-- Stable canonical IDs only. Existing exempt books are deliberately untouched.
do $$
begin
  if (select count(*) from public.books b join (values
    ('ad76c3ab-177b-4180-99ce-bfd7facabb10'::uuid, 'bos3'),
    ('e4ba3b2a-1a62-45ad-a2bb-1eff8a36fed7'::uuid, 'bos1'),
    ('f3b08eae-fdfc-4746-81b9-7b7d5088ff69'::uuid, 'bos2'),
    ('6fb6426f-2d56-44e0-88f6-86c39e3d1f18'::uuid, 'bpd')
  ) target(id, slug) on b.id = target.id and b.slug = target.slug) <> 4 then
    raise exception 'Verify the four canonical book IDs/slugs before applying exemptions.';
  end if;
  update public.books set premium_exempt = true, updated_at = now()
  where id in ('ad76c3ab-177b-4180-99ce-bfd7facabb10', 'e4ba3b2a-1a62-45ad-a2bb-1eff8a36fed7',
    'f3b08eae-fdfc-4746-81b9-7b7d5088ff69', '6fb6426f-2d56-44e0-88f6-86c39e3d1f18');
end $$;

-- Metadata remains public. Chapter content requires a real authenticated user,
-- independently of exemptions and existing completion/publication policies.
create policy "Signed-in book chapter content" on public.chapters as restrictive
  for select to anon, authenticated using ((select auth.uid()) is not null);

create or replace function public.read_book_chapter(p_chapter_id uuid)
returns jsonb language plpgsql stable security definer set search_path = '' set statement_timeout = '5s' as $$
declare result jsonb; caller uuid := (select auth.uid());
begin
  if caller is null then raise exception 'Sign in to read this book.' using errcode = '42501'; end if;
  select jsonb_build_object('id', c.id, 'book_id', c.book_id, 'slug', c.slug, 'title', c.title,
    'chapter_number', c.chapter_number, 'content', c.content) into result
  from public.chapters c join public.books b on b.id = c.book_id
  where c.id = p_chapter_id and b.is_completed and (
    b.premium_exempt is true or c.chapter_number <= coalesce(b.free_chapter_count, 0)
    or public.account_has_premium(caller)
  );
  if result is null then raise exception 'This chapter is unavailable or requires AWM Plus.' using errcode = '42501'; end if;
  return result;
end $$;

commit;
