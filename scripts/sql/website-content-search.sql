-- Additive rollout script. Not applied automatically by the website build.
-- No data rewrites, tables, RLS changes or statement-timeout increases.
create or replace function public.website_search_normalise_v1(value text)
returns text language sql immutable parallel safe set search_path=pg_catalog as $$
  select lower(translate(regexp_replace(coalesce(value,''), '[ً-ٰٟـ]', '', 'g'), 'أإآى', 'اااي'))
$$;

create or replace function public.website_search_blocks_v1(value jsonb)
returns jsonb language sql immutable parallel safe set search_path=pg_catalog as $$
  select case when jsonb_typeof(value)='array' then value
    when jsonb_typeof(value->'scriptBlocks')='array' then value->'scriptBlocks' else '[]'::jsonb end
$$;

create or replace function public.website_search_arabic_v1(block jsonb)
returns text language sql immutable parallel safe set search_path=pg_catalog as $$
  select coalesce(nullif(block->>'arabic',''),nullif(block->>'text',''),
    (select string_agg(coalesce(t->>'prefix','')||coalesce(t->>'arabic',t->>'word','')||coalesce(t->>'suffix',''),' ' order by n)
      from jsonb_array_elements(case when jsonb_typeof(block->'tokens')='array' then block->'tokens'
        when jsonb_typeof(block->'words')='array' then block->'words' else '[]'::jsonb end) with ordinality a(t,n)), '')
$$;

create or replace function public.website_search_document_v1(value jsonb)
returns text language sql immutable parallel safe set search_path=pg_catalog,public as $$
 select public.website_search_normalise_v1(coalesce(string_agg(public.website_search_arabic_v1(b)||' '||coalesce(b->>'translation',b->>'english',''),' ' order by n),''))
 from jsonb_array_elements(public.website_search_blocks_v1(value)) with ordinality a(b,n)
$$;
-- Existing pg_trgm extension; expression indexes require no duplicated data.
create index if not exists website_episode_text_search_v1 on public.episodes using gin (public.website_search_document_v1(transcript) public.gin_trgm_ops);
create index if not exists website_chapter_text_search_v1 on public.chapters using gin (public.website_search_document_v1(content) public.gin_trgm_ops);

create or replace function public.website_search_content_v1(p_query text,p_after text default '',p_limit integer default 21,p_books boolean default false)
returns table(key text,kind text,title text,source text,arabic text,english text,href text)
language sql stable security invoker set search_path=pg_catalog,public as $$
 with q as (select public.website_search_normalise_v1(trim(p_query)) needle where length(trim(p_query)) between 2 and 120),
 results as (
 select 's:'||s.id as key,'show'::text kind,s.title, s.title source,coalesce(s.title_ar,'') arabic,
   left(coalesce(s.description,''),350) english, '/cartoons/'||s.slug href
 from public.shows s,q where strpos(public.website_search_normalise_v1(s.title||' '||coalesce(s.title_ar,'')),q.needle)>0
 union all
 select 'e:'||e.id,'episode',e.title,s.title,left(coalesce(hit.arabic,''),600),
   left(coalesce(hit.english,e.description,''),350),'/cartoons/'||s.slug||'/'||e.slug||coalesce('?t='||nullif(hit.ts,''),'')
 from public.episodes e join public.shows s on s.id=e.show_id cross join q
 left join lateral (
   select public.website_search_arabic_v1(b) arabic,coalesce(b->>'translation',b->>'english','') english,
     case when (b->>'timestamp') ~ '^\d+(\.\d+)?$' then b->>'timestamp'
       when (b->>'timestamp') ~ '^\d+:\d{2}$' then ((split_part(b->>'timestamp',':',1)::integer*60)+split_part(b->>'timestamp',':',2)::integer)::text else '' end ts
   from jsonb_array_elements(public.website_search_blocks_v1(e.transcript)) with ordinality a(b,n)
   where public.website_search_document_v1(e.transcript) like '%'||replace(replace(replace(q.needle,'\','\\'),'%','\%'),'_','\_')||'%'
     and strpos(public.website_search_normalise_v1(public.website_search_arabic_v1(b)||' '||coalesce(b->>'translation',b->>'english','')),q.needle)>0
   order by n limit 1
 )hit on true
 where strpos(public.website_search_normalise_v1(e.title),q.needle)>0 or hit.arabic is not null
 union all
 select 'b:'||b.id,'book',b.title,b.title,coalesce(b.title_ar,''),left(coalesce(b.description,''),350),'/books/'||b.slug
 from public.books b,q where strpos(public.website_search_normalise_v1(b.title||' '||coalesce(b.title_ar,'')),q.needle)>0
 union all
 select 'c:'||c.id,'chapter',c.title,b.title,left(hit.arabic,600),left(hit.english,350),'/books/'||b.slug||'/'||c.slug||'#sentence-'||(hit.n-1)
 from public.chapters c join public.books b on b.id=c.book_id cross join q
 cross join lateral (
   select public.website_search_arabic_v1(block) arabic,coalesce(block->>'translation','') english,n
   from jsonb_array_elements(public.website_search_blocks_v1(c.content)) with ordinality a(block,n)
   where strpos(public.website_search_normalise_v1(public.website_search_arabic_v1(block)||' '||coalesce(block->>'translation','')),q.needle)>0
   order by n limit 1
 )hit where p_books and public.website_search_document_v1(c.content) like '%'||replace(replace(replace(q.needle,'\','\\'),'%','\%'),'_','\_')||'%'
 ) select * from results where key>coalesce(p_after,'') order by key limit greatest(1,least(coalesce(p_limit,21),21))
$$;
-- Only the existing server service client may call the aggregate search.
revoke all on function public.website_search_content_v1(text,text,integer,boolean) from public,anon,authenticated;
grant execute on function public.website_search_content_v1(text,text,integer,boolean) to service_role;
