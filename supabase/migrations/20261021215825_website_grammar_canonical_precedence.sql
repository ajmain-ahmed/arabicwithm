-- Canonical edits win; raw enrichment only fills omitted, exactly aligned keys.
create or replace function private.website_grammar_index_segment(p_id bigint) returns void
language plpgsql security definer set search_path='' as $$
declare s public.transcript_segments; p jsonb; raw jsonb; item jsonb;
begin
 select * into s from public.transcript_segments where id=p_id;
 delete from private.website_grammar_sources where segment_id=p_id;
 if s.id is null or s.for_you_manual_excluded or s.for_you_music_only or s.for_you_theme_score>=.7 then return;end if;
 p=s.canonical_paragraph;
 -- Some import projections omit additive grammar labels. Use exact time/text
 -- matching to the canonical import block, never approximate word alignment.
 select b into raw from public.youtube_transcripts v cross join lateral jsonb_array_elements(case when jsonb_typeof(v.raw_transcript->'content')='array' then v.raw_transcript->'content' else '[]'::jsonb end) b
 where v.id=s.transcript_id and b->>'text'=s.original_text and b->>'offset' ~ '^\d+(\.\d+)?$' and (b->>'offset')::numeric/1000=s.start_seconds limit 1;
 if jsonb_typeof(raw->'tokens')='array' and jsonb_array_length(raw->'tokens')>0 then
  raw=jsonb_build_object('tokens',(select jsonb_agg(w||jsonb_build_object('arabic',coalesce(w->>'arabic',w->>'ar',w->>'surface'),'pos',coalesce(w->>'pos',w->>'POS')) order by ord) from jsonb_array_elements(raw->'tokens') with ordinality x(w,ord)), 'translation',coalesce(raw->>'english',raw->>'translation',s.english_text));
  if jsonb_typeof(p->'tokens') is distinct from 'array' then p=raw;
  elsif jsonb_array_length(p->'tokens')=jsonb_array_length(raw->'tokens') and not exists(
   select 1 from jsonb_array_elements(p->'tokens') with ordinality c(w,n) join jsonb_array_elements(raw->'tokens') with ordinality r(w,n) using(n) where c.w->>'arabic' is distinct from r.w->>'arabic'
  ) then
   -- Fill omitted projection keys only. Explicit canonical values, including
   -- null (an invalidated fact), always override older import metadata.
   p=jsonb_set(p,'{tokens}',(select jsonb_agg(r.w||c.w order by n) from jsonb_array_elements(p->'tokens') with ordinality c(w,n) join jsonb_array_elements(raw->'tokens') with ordinality r(w,n) using(n)));
  end if;
 end if;
 item=private.website_grammar_extract(p);
 if item is not null then insert into private.website_grammar_sources(segment_id,sentence_hash,payload,modes,cefr_rank,length_band)
 values(s.id,item->>'sentence_hash',item-'modes'-'cefr_rank'-'length_band'-'sentence_hash',array(select jsonb_array_elements_text(item->'modes')),(item->>'cefr_rank')::integer,(item->>'length_band')::integer);end if;
end $$;
