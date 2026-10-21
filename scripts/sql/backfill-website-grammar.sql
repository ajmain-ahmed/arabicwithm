-- One-time historical backfill for another environment. Future imports are
-- indexed by triggers. Run each bounded statement repeatedly, setting its
-- cursor to the previous returned cursor, until the returned cursor is null.
-- Do not run a corpus-wide backfill in the schema migration transaction.

with params as (select '00000000-0000-0000-0000-000000000000'::uuid after_id),
selected as materialized (
 select c.id,c.content from public.chapters c,params where c.id>params.after_id order by c.id limit 5 for share of c
), extracted as materialized (
 select c.id,p.ord-1 idx,private.website_grammar_extract(p.value) item from selected c
 cross join lateral jsonb_array_elements(case when jsonb_typeof(c.content)='array' then c.content else '[]'::jsonb end) with ordinality p(value,ord)
), written as (
 insert into private.website_grammar_sources(chapter_id,paragraph_index,sentence_hash,payload,modes,cefr_rank,length_band)
 select id,idx,item->>'sentence_hash',item-'modes'-'cefr_rank'-'length_band'-'sentence_hash',array(select jsonb_array_elements_text(item->'modes')),(item->>'cefr_rank')::integer,(item->>'length_band')::integer
 from extracted where item is not null on conflict(chapter_id,paragraph_index) do nothing returning id
)
select (select count(*) from written) indexed,(select max(id::text) from selected) chapter_cursor;

with params as (select 0::bigint after_id), selected as materialized (
 select s.id from public.transcript_segments s join public.youtube_transcripts v on v.id=s.transcript_id,params
 where v.source_origin='website_admin_transcript' and s.id>params.after_id order by s.id limit 300 for share of s,v
), jobs as materialized (select private.website_grammar_index_segment(id) from selected)
select (select count(*) from jobs) processed,(select max(id) from selected) segment_cursor;
