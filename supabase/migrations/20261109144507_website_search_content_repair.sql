-- The existing /search action calls this RPC, but no migration previously defined it.
-- Only the server role may pass p_books, which is derived from verified identity.
create or replace function public.website_search_content_v1(
 p_query text,p_after text default '',p_limit integer default 21,p_books boolean default false
) returns table(key text,kind text,title text,source text,arabic text,english text,href text)
language plpgsql stable security invoker set search_path='' set statement_timeout='6s' as $$
declare needle text; take integer:=least(greatest(coalesce(p_limit,21),1),21);
begin
 if p_query is null or length(btrim(p_query))<2 or length(p_query)>120 or length(coalesce(p_after,''))>120 then
  raise exception 'Invalid search input' using errcode='22023';
 end if;
 needle:=translate(lower(btrim(p_query)),'ًٌٍَُِّْٰـ','');
 return query
 with hits as (
  (select 's:'||s.id::text as key,'show'::text as kind,s.title::text as title,''::text as source,''::text as arabic,''::text as english,'/cartoons/'||s.slug as href
   from public.shows s where 's:'||s.id::text>coalesce(p_after,'') and position(needle in translate(lower(coalesce(s.title,'')),'ًٌٍَُِّْٰـ',''))>0 order by s.id limit take)
  union all
  (select 'e:'||e.id::text,'episode',e.title::text,coalesce(s.title,'')::text,'','', '/cartoons/'||s.slug||'/'||e.slug
   from public.episodes e join public.shows s on s.id=e.show_id
   where 'e:'||e.id::text>coalesce(p_after,'') and position(needle in translate(lower(coalesce(e.title,'')||' '||coalesce(s.title,'')),'ًٌٍَُِّْٰـ',''))>0 order by e.id limit take)
  union all
  (select 'b:'||b.id::text,'book',b.title::text,''::text,'','', '/books/'||b.slug
   from public.books b where 'b:'||b.id::text>coalesce(p_after,'') and position(needle in translate(lower(coalesce(b.title,'')),'ًٌٍَُِّْٰـ',''))>0 order by b.id limit take)
  union all
  (select 'c:'||c.id::text,'chapter',c.title::text,b.title::text,left(t.ar,240),left(t.en,240),'/books/'||b.slug||'/'||c.slug
   from public.chapters c join public.books b on b.id=c.book_id
   cross join lateral (
    select coalesce((select string_agg(v,' ') from jsonb_array_elements_text(jsonb_path_query_array(c.content,'$.**.arabic')) v),'') as ar,
     coalesce((select string_agg(v,' ') from jsonb_array_elements_text(jsonb_path_query_array(c.content,'$.**.translation')||jsonb_path_query_array(c.content,'$.**.english')) v),'') as en
   ) t
   where p_books and b.is_completed is not false and 'c:'||c.id::text>coalesce(p_after,'')
    and position(needle in translate(lower(coalesce(c.title,'')||' '||t.ar||' '||t.en),'ًٌٍَُِّْٰـ',''))>0 order by c.id limit take)
 ) select h.key,h.kind,h.title,h.source,h.arabic,h.english,h.href from hits h order by h.key limit take;
end;
$$;
revoke all on function public.website_search_content_v1(text,text,integer,boolean) from public,anon,authenticated;
grant execute on function public.website_search_content_v1(text,text,integer,boolean) to service_role;
