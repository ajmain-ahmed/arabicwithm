-- Read-only snapshot of the seven production function definitions, 2026-11-14.
CREATE OR REPLACE FUNCTION public.read_book_chapter(p_chapter_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
 SET statement_timeout TO '5s'
AS $function$
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
end $function$
;

CREATE OR REPLACE FUNCTION public.website_search_content_v1(p_query text, p_after text DEFAULT ''::text, p_limit integer DEFAULT 21, p_books boolean DEFAULT false)
 RETURNS TABLE(key text, kind text, title text, source text, arabic text, english text, href text)
 LANGUAGE plpgsql
 STABLE
 SET search_path TO ''
 SET statement_timeout TO '6s'
AS $function$
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
$function$
;

CREATE OR REPLACE FUNCTION public.word_search_vocabulary(p_source_type text, p_source_id uuid)
 RETURNS jsonb
 LANGUAGE sql
 STABLE
 SET search_path TO ''
AS $function$
 with source as (
   select transcript as content from public.episodes where p_source_type='episode' and id=p_source_id
   union all select content from public.chapters where p_source_type='book' and id=p_source_id and exists(select 1 from public.books released where released.id=chapters.book_id and released.is_completed)
 ), blocks as (
   select block from source cross join lateral jsonb_array_elements(
     case when jsonb_typeof(content)='array' then content
       when jsonb_typeof(content->'scriptBlocks')='array' then content->'scriptBlocks' else '[]'::jsonb end
   ) block limit 200
 ), tokens as (
   select token from blocks cross join lateral jsonb_array_elements(
     case when jsonb_typeof(block->'tokens')='array' then block->'tokens'
       when jsonb_typeof(block->'words')='array' then block->'words' else '[]'::jsonb end
   ) token limit 2000
 ), words as (
   select distinct regexp_replace(coalesce(token->>'headword',token->>'arabic'),'[^ء-ي]','','g') arabic,
     token->>'english' english,token->>'cefr' cefr
   from tokens where coalesce(token->>'entry_type','word')='word'
 )
 select coalesce(jsonb_agg(to_jsonb(selected)),'[]'::jsonb) from (
   select * from words where char_length(arabic) between 3 and 10
   order by arabic,english,cefr limit 40
 ) selected;
$function$
;

CREATE OR REPLACE FUNCTION private.sarf_context_candidates_v2()
 RETURNS jsonb
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO ''
 SET statement_timeout TO '3s'
AS $function$
with video_rows as (
 select r.value from jsonb_array_elements(private.sarf_context_candidates(null)) r(value)
 limit 88
), videos as (
 select r.value || jsonb_build_object('source_kind','transcript',
   'start_seconds',s.start_seconds,'position',s.position,'episode_id',v.episode_id)
   item
 from video_rows r join public.transcript_segments s on s.id=(r.value->>'id')::bigint
 join public.youtube_transcripts v on v.id=s.transcript_id
), chapters as (
 select c.id,c.book_id,c.chapter_number,b.title,b.level
 from public.chapters c join public.books b on b.id=c.book_id
 where exists(select 1 from private.sarf_book_occurrences o where o.chapter_id=c.id)
 order by random() limit 8
), book_rows as (
 select c.*,o.paragraph_index from chapters c
 cross join lateral (
   select min(paragraph_index)+floor(random()*(max(paragraph_index)-min(paragraph_index)+1))::integer pivot
   from private.sarf_book_occurrences where chapter_id=c.id
 ) pick
 cross join lateral (
   (select paragraph_index from private.sarf_book_occurrences
    where chapter_id=c.id and paragraph_index>=pick.pivot order by paragraph_index limit 4)
   union all
   (select paragraph_index from private.sarf_book_occurrences
    where chapter_id=c.id and paragraph_index<pick.pivot order by paragraph_index limit 4)
   limit 4
 ) o
), books as (
 select jsonb_build_object('id',r.id::text||':'||r.paragraph_index,
   'source_kind','book','source_id',r.id,'source_label',r.title,
   'book_id',r.book_id,'chapter_number',r.chapter_number,
   'paragraph_index',r.paragraph_index,'cefr',r.level,
   'paragraph',c.content->r.paragraph_index) item
 from book_rows r join public.chapters c on c.id=r.id
), bounded as (select item from videos union all select item from books)
select coalesce(jsonb_agg(item),'[]'::jsonb) from bounded;
$function$
;

CREATE OR REPLACE FUNCTION private.nahw_source(p_segment bigint, p_chapter uuid, p_paragraph integer)
 RETURNS jsonb
 LANGUAGE sql
 STABLE
 SET search_path TO ''
AS $function$
 select jsonb_build_object('id',s.id,'source_kind','transcript','source_id',v.id,
   'source_label',v.title,'start_seconds',s.start_seconds,'episode_id',v.episode_id,
   'paragraph',s.canonical_paragraph)
 from public.transcript_segments s join public.youtube_transcripts v on v.id=s.transcript_id
 where s.id=p_segment and v.status='ready' and v.searchable and v.feed_eligible
   and not s.for_you_manual_excluded and not s.for_you_music_only and s.for_you_theme_score<0.7
 union all
 select jsonb_build_object('id',c.id::text||':'||p_paragraph,'source_kind','book','source_id',c.id,
   'source_label',b.title,'book_id',b.id,'chapter_number',c.chapter_number,
   'paragraph_index',p_paragraph,'paragraph',c.content->p_paragraph)
 from public.chapters c join public.books b on b.id=c.book_id
 where b.is_completed and c.id=p_chapter and jsonb_typeof(c.content)='array' and p_paragraph>=0
   and p_paragraph<jsonb_array_length(c.content);
$function$
;

CREATE OR REPLACE FUNCTION private.website_grammar_candidates(p_mode text, p_seed text, p_recent text[], p_cefr integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
 SET statement_timeout TO '4s'
AS $function$
declare result jsonb; pivot double precision=(hashtextextended(p_seed,0)&2147483647)::double precision/2147483648;
begin
 if auth.uid() is null then raise exception 'Sign in to practise Grammar';end if;
 if p_mode not in ('word_type','sentence_role','grammatical_case') or length(p_seed)>64 or coalesce(cardinality(p_recent),0)>200 or (p_cefr is not null and p_cefr not between 1 and 6) then raise exception 'Invalid request';end if;
 with picked as materialized (
  select q.* from generate_series(0,2) band cross join lateral (
   (select q.* from private.website_grammar_sources q where length_band=band and sample_key>=pivot and modes @> array[p_mode] and (p_cefr is null or cefr_rank<=p_cefr) and not(sentence_hash=any(coalesce(p_recent,'{}'))) order by sample_key limit 60)
   union all
   (select q.* from private.website_grammar_sources q where length_band=band and sample_key<pivot and modes @> array[p_mode] and (p_cefr is null or cefr_rank<=p_cefr) and not(sentence_hash=any(coalesce(p_recent,'{}'))) order by sample_key limit 60)
  ) q
 ), visible as (
  select q.*,coalesce(c.book_id,s.transcript_id) source_id from picked q
  left join public.chapters c on c.id=q.chapter_id left join public.books b on b.id=c.book_id
  left join public.transcript_segments s on s.id=q.segment_id left join public.youtube_transcripts v on v.id=s.transcript_id
  -- Website policy: all book chapters readable to signed-in learners. Public
  -- standalone transcripts only; no user-generated/private video library rows.
  where (b.is_completed and c.id is not null and c.chapter_number>=1) or (v.status='ready' and v.source_origin='website_admin_transcript' and (v.searchable or v.explore_published) and not s.for_you_manual_excluded and not s.for_you_music_only and s.for_you_theme_score<.7)
 ), deduplicated as (select *,row_number() over(partition by sentence_hash order by md5(id::text||p_seed)) duplicate_rank from visible), varied as (
  select *,row_number() over(partition by length_band order by row_source,md5(id::text||p_seed)) band_rank from (select *,row_number() over(partition by source_id order by md5(id::text||p_seed)) row_source from deduplicated where duplicate_rank=1) x
 ), final as (select jsonb_build_object('id',id,'sentence_hash',sentence_hash,'chapter_id',chapter_id,'paragraph_index',paragraph_index,'segment_id',segment_id,'cefr_rank',cefr_rank,'payload',payload) item from varied order by band_rank,length_band limit 30)
 select coalesce(jsonb_agg(item),'[]') into result from final;
 return result;
end $function$
;

CREATE OR REPLACE FUNCTION private.practice_occurrence(p_kind text, p_key text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare r jsonb;
begin
 if p_kind='transcript' and p_key ~ '^[0-9]+$' then
  select jsonb_build_object('id',s.id::text,'source_kind','transcript','source_id',v.id::text,'source_label',v.title,
    'start_seconds',s.start_seconds,'position',s.position,'cefr',e.level,'content_hash',md5(s.canonical_paragraph::text),'paragraph',s.canonical_paragraph)
  into r from public.transcript_segments s join public.youtube_transcripts v on v.id=s.transcript_id left join public.episodes e on e.id=v.episode_id
  where s.id=p_key::bigint and v.status='ready' and v.searchable and v.feed_eligible
   and not s.for_you_manual_excluded and not s.for_you_music_only and s.for_you_theme_score<0.7;
 elsif p_kind='book' and p_key ~ '^[0-9a-f-]{36}:[0-9]+$' then
  select jsonb_build_object('id',p_key,'source_kind','book','source_id',c.id::text,'source_label',b.title,
    'book_id',b.id::text,'chapter_number',c.chapter_number,'paragraph_index',split_part(p_key,':',2)::int,'cefr',b.level,
    'content_hash',md5((c.content->split_part(p_key,':',2)::int)::text),'paragraph',c.content->split_part(p_key,':',2)::int)
  into r from public.chapters c join public.books b on b.id=c.book_id
  where b.is_completed and c.id=split_part(p_key,':',1)::uuid and jsonb_typeof(c.content->split_part(p_key,':',2)::int)='object';
 end if;
 return r;
end $function$
;
