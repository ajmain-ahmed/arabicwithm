begin;

-- Adding the column with TRUE preserves every existing readable book without
-- firing UPDATE/release triggers. Only genuinely new inserts default to FALSE.
alter table public.books add column is_completed boolean not null default true;
alter table public.books alter column is_completed set default false;

create table public.book_release_reminders (
  user_id uuid not null references auth.users(id) on delete cascade,
  book_id uuid not null references public.books(id) on delete cascade,
  created_at timestamptz not null default now(),
  fulfilled_at timestamptz,
  primary key (user_id, book_id)
);
create index book_release_reminders_pending on public.book_release_reminders(book_id) where fulfilled_at is null;
alter table public.book_release_reminders enable row level security;
revoke all on public.book_release_reminders from public, anon, authenticated;
grant select on public.book_release_reminders to authenticated;
grant all on public.book_release_reminders to service_role;
create policy "Own book release reminders" on public.book_release_reminders
  for select to authenticated using (user_id = (select auth.uid()));

-- Keep the canonical notification kind/source ID so the existing app opens the
-- correct book and honours its existing Book notification category. Retain one
-- broadcast per source while allowing one private notice per recipient/source.
alter table public.app_notifications drop constraint app_notifications_kind_source_id_key;
create unique index app_notifications_broadcast_source on public.app_notifications(kind, source_id) where user_id is null;
create unique index app_notifications_recipient_source on public.app_notifications(user_id, kind, source_id) where user_id is not null;

create function private.set_book_release_reminder(p_book_id uuid, p_subscribe boolean)
returns boolean language plpgsql security definer set search_path = '' as $$
declare owner_id uuid := (select auth.uid()); released boolean;
begin
  if owner_id is null then raise exception 'Sign in to set a reminder.' using errcode = '42501'; end if;
  if p_subscribe is null then raise exception 'Invalid reminder request.' using errcode = '22023'; end if;
  -- Serializes subscribe/cancel with the release UPDATE, eliminating the race
  -- where a reminder arrives after release fulfillment has already scanned.
  select b.is_completed into released from public.books b where b.id = p_book_id for update;
  if not found then raise exception 'Book not found.' using errcode = '22023'; end if;
  if p_subscribe then
    if not released then
      insert into public.book_release_reminders(user_id, book_id) values(owner_id, p_book_id)
      on conflict(user_id, book_id) do nothing;
    end if;
  else
    delete from public.book_release_reminders where user_id = owner_id and book_id = p_book_id and fulfilled_at is null;
  end if;
  return exists(select 1 from public.book_release_reminders where user_id = owner_id and book_id = p_book_id and fulfilled_at is null);
end $$;
revoke all on function private.set_book_release_reminder(uuid, boolean) from public, anon, authenticated;
grant execute on function private.set_book_release_reminder(uuid, boolean) to authenticated;
create function public.set_book_release_reminder(p_book_id uuid, p_subscribe boolean)
returns boolean language sql security invoker set search_path = '' as $$
  select private.set_book_release_reminder(p_book_id, p_subscribe);
$$;
revoke all on function public.set_book_release_reminder(uuid, boolean) from public, anon;
grant execute on function public.set_book_release_reminder(uuid, boolean) to authenticated;

create function private.fulfill_book_release_reminders()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if old.is_completed = false and new.is_completed = true then
    insert into public.app_notifications(user_id, kind, source_id, title, message, route)
    select r.user_id, 'book', new.id, new.title || ' is now available',
      'The book you asked us to remind you about has been released.', '/read/book/' || new.id::text
    from public.book_release_reminders r where r.book_id = new.id and r.fulfilled_at is null
    on conflict(user_id, kind, source_id) where user_id is not null do nothing;
    update public.book_release_reminders r set fulfilled_at = now()
    where r.book_id = new.id and r.fulfilled_at is null and exists (
      select 1 from public.app_notifications n where n.user_id = r.user_id and n.kind = 'book' and n.source_id = new.id
    );
  end if;
  return new;
end $$;
revoke all on function private.fulfill_book_release_reminders() from public, anon, authenticated;
create trigger fulfill_book_release_reminders after update of is_completed on public.books
  for each row execute function private.fulfill_book_release_reminders();

-- The existing insertion notification must not announce unfinished books.
-- Completed-on-create books retain the existing single broadcast behaviour.
create function private.notify_completed_book_insert()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.is_completed then
    insert into public.app_notifications(kind, source_id, title, message, route)
    values('book', new.id, 'New Book', new.title, '/read/book/' || new.id::text);
  end if;
  return new;
end $$;
revoke all on function private.notify_completed_book_insert() from public, anon, authenticated;
drop trigger if exists notify_book on public.books;
create trigger notify_book after insert on public.books for each row execute function private.notify_completed_book_insert();

-- Restrictive policy composes with existing publication/permission policies;
-- completion never makes a hidden chapter visible through a permissive policy.
create policy "Only released book chapters" on public.chapters as restrictive
  for select to anon, authenticated using (
    exists(select 1 from public.books b where b.id = chapters.book_id and b.is_completed)
  );

-- Preserve the existing shared reader entitlement model, adding only release.
create or replace function public.read_book_chapter(p_chapter_id uuid)
returns jsonb language plpgsql stable security definer set search_path = '' set statement_timeout = '5s' as $$
declare result jsonb; caller uuid := (select auth.uid());
begin
  select jsonb_build_object('id', c.id, 'book_id', c.book_id, 'slug', c.slug, 'title', c.title,
    'chapter_number', c.chapter_number, 'content', c.content) into result
  from public.chapters c join public.books b on b.id = c.book_id
  where c.id = p_chapter_id and b.is_completed and (
    b.premium_exempt is true or c.chapter_number <= coalesce(b.free_chapter_count, 0)
    or (caller is not null and public.account_has_premium(caller))
  );
  if result is null then raise exception 'This chapter is unavailable or requires AWM Plus.' using errcode = '42501'; end if;
  return result;
end $$;

-- Derived practice APIs also read chapter text with privileged functions.
-- Amend only their book visibility predicates; preserve their curated analysis,
-- sampling, hash freshness checks, transcript policy and all other behaviour.
do $$
declare entry record; definition text;
begin
  for entry in select * from (values
    ('private.nahw_source(bigint,uuid,integer)', 'where c.id=p_chapter and', 'where b.is_completed and c.id=p_chapter and'),
    ('private.practice_occurrence(text,text)', 'where c.id=split_part', 'where b.is_completed and c.id=split_part'),
    ('private.website_grammar_candidates(text,text,text[],integer)', 'where (c.id is not null and c.chapter_number>=1)', 'where (b.is_completed and c.id is not null and c.chapter_number>=1)'),
    ('public.word_search_vocabulary(text,uuid)', 'from public.chapters where p_source_type=''book'' and id=p_source_id', 'from public.chapters where p_source_type=''book'' and id=p_source_id and exists(select 1 from public.books released where released.id=chapters.book_id and released.is_completed)')
  ) as changes(signature, old_text, new_text) loop
    if to_regprocedure(entry.signature) is null then continue; end if;
    select pg_get_functiondef(to_regprocedure(entry.signature)) into definition;
    if position(entry.old_text in definition) = 0 then
      raise exception 'Review changed practice function before applying completion guard: %', entry.signature;
    end if;
    execute replace(definition, entry.old_text, entry.new_text);
  end loop;
end $$;

commit;
