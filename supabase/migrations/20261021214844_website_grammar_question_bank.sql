-- Website-only facts, extracted from canonical admin content. No inferred i'rab.
create table private.website_grammar_labels (
 mode text not null, key text not null, arabic text not null, english text not null,
 aliases text[] not null, primary key(mode,key)
);
alter table private.website_grammar_labels enable row level security;
insert into private.website_grammar_labels values
 ('word_type','noun','اِسْمٌ','Noun',array['noun']),
 ('word_type','verb','فِعْلٌ','Verb',array['verb']),
 ('word_type','adjective','صِفَةٌ','Adjective',array['adjective']),
 ('word_type','preposition','حَرْفُ جَرٍّ','Preposition',array['preposition']),
 ('word_type','conjunction','حَرْفُ عَطْفٍ','Conjunction',array['conjunction']),
 ('word_type','pronoun','ضَمِيرٌ','Pronoun',array['pronoun']),
 ('word_type','adverb','ظَرْفٌ','Adverb',array['adverb']),
 ('word_type','particle','حَرْفٌ','Particle',array['particle']),
 ('word_type','demonstrative','اِسْمُ إِشَارَةٍ','Demonstrative',array['demonstrative','demonstrative pronoun']),
 ('sentence_role','subject','فَاعِلٌ','Doer / subject of the verb',array['subject','doer','subject doer','doer subject of the verb','subject of the verb']),
 ('sentence_role','object','مَفْعُولٌ بِهِ','Direct object',array['direct object','object']),
 ('sentence_role','topic','مُبْتَدَأٌ','Topic',array['topic','mubtada','topic of a nominal sentence']),
 ('sentence_role','predicate','خَبَرٌ','Predicate',array['predicate']),
 ('sentence_role','delayed_topic','مُبْتَدَأٌ مُؤَخَّرٌ','Delayed topic',array['delayed topic','delayed subject']),
 ('sentence_role','fronted_predicate','خَبَرٌ مُقَدَّمٌ','Fronted predicate',array['fronted predicate']),
 ('sentence_role','role_adjective','نَعْتٌ','Describing adjective',array['adjective','describing adjective','adjectival modifier']),
 ('sentence_role','idafa_first','مُضَافٌ','First noun of iḍāfa',array['mudaf','first noun of idafa','first term of idafa']),
 ('sentence_role','idafa_second','مُضَافٌ إِلَيْهِ','Second noun of iḍāfa',array['mudaf ilayh','second noun of idafa','genitive complement of idafa']),
 ('sentence_role','kana_noun','اِسْمُ كَانَ','Noun of kāna',array['noun of kana','kana noun']),
 ('sentence_role','kana_predicate','خَبَرُ كَانَ','Predicate of kāna',array['predicate of kana','kana predicate']),
 ('sentence_role','inna_noun','اِسْمُ إِنَّ','Noun of inna',array['noun of inna','inna noun']),
 ('sentence_role','inna_predicate','خَبَرُ إِنَّ','Predicate of inna',array['predicate of inna','inna predicate']),
 ('grammatical_case','nominative','مَرْفُوعٌ','Nominative',array['nominative']),
 ('grammatical_case','accusative','مَنْصُوبٌ','Accusative',array['accusative']),
 ('grammatical_case','genitive','مَجْرُورٌ','Genitive',array['genitive']),
 ('grammatical_case','jussive','مَجْزُومٌ','Jussive',array['jussive']);

create table private.website_grammar_sources (
 id bigint generated always as identity primary key,
 chapter_id uuid references public.chapters(id) on delete cascade,
 paragraph_index integer,
 segment_id bigint references public.transcript_segments(id) on delete cascade,
 sentence_hash text not null,
 payload jsonb not null,
 modes text[] not null,
 cefr_rank integer,
 length_band integer not null,
 sample_key double precision not null default random(),
 check ((chapter_id is not null and paragraph_index>=0 and segment_id is null) or (chapter_id is null and paragraph_index is null and segment_id is not null)),
 unique(chapter_id,paragraph_index), unique(segment_id)
);
alter table private.website_grammar_sources enable row level security;
create index website_grammar_sample on private.website_grammar_sources(length_band,sample_key);
create index website_grammar_modes on private.website_grammar_sources using gin(modes);
create index website_grammar_sentence on private.website_grammar_sources(sentence_hash);

create function private.website_grammar_identity(p_value text) returns text
language sql immutable set search_path='' as $$
 select trim(regexp_replace(lower(translate(coalesce(p_value,''),'āīūḥṣḍṭẓʿʾ','aiuhsdtz  ')), '[^a-z]+',' ','g'))
$$;

create function private.website_grammar_extract(p jsonb) returns jsonb
language plpgsql stable set search_path='' as $$
declare t record; l record; facts jsonb='[]'; tokens jsonb; english text; ar text; modes text[]; ranks integer[]='{}'; r integer;
begin
 if jsonb_typeof(p->'tokens') is distinct from 'array' then return null; end if;
 if jsonb_array_length(p->'tokens') not between 2 and 40 then return null; end if;
 english=trim(p->>'translation');
 if english is null or length(english) not between 8 and 600 or english ~* 'inaudible|unclear|internal qa|translation unavailable|theme song|music only|^\[music\]' then return null; end if;
 if exists(select 1 from jsonb_array_elements(p->'tokens') w where jsonb_typeof(w->'arabic') is distinct from 'string' or length(w->>'arabic')>100 or w->>'arabic' ~ '[A-Za-z�]' or btrim(w->>'arabic')='') then return null; end if;
 select string_agg(w->>'arabic',' ' order by ord),jsonb_agg(jsonb_build_object('arabic',w->>'arabic') order by ord) into ar,tokens from jsonb_array_elements(p->'tokens') with ordinality x(w,ord);
 if length(ar)>1200 or (select count(*) from jsonb_array_elements(p->'tokens') w where w->>'arabic' ~ '[ء-ي]')<2 then return null; end if;
 for t in select w,ord-1 idx from jsonb_array_elements(p->'tokens') with ordinality x(w,ord) loop
  r=array_position(array['A1','A2','B1','B2','C1','C2'],upper(t.w->>'cefr')); if r is not null then ranks=array_append(ranks,r);end if;
  -- A whole clitic/phrase token is not a safe single-word classification target.
  if t.w->>'entry_type'='phrase' or nullif(trim(t.w->>'prefix'),'') is not null or nullif(trim(t.w->>'suffix'),'') is not null or t.w->>'arabic' !~ '[ء-ي]' or t.w->>'arabic' ~ '\s' then continue; end if;
  for l in select labels.* from (values
   ('word_type',private.website_grammar_identity(coalesce(t.w->>'pos',t.w->>'POS'))),
   ('sentence_role',private.website_grammar_identity(t.w->'syntactic_role'->>'english')),
   ('grammatical_case',private.website_grammar_identity(t.w->'grammatical_case'->>'english'))
  ) evidence(mode,label) join private.website_grammar_labels labels on labels.mode=evidence.mode and evidence.label=any(labels.aliases) loop
   -- Explicit case is required. Reject contradictory noun/verb case combinations.
   if l.mode='grammatical_case' and ((l.key='jussive' and lower(t.w->>'pos') is distinct from 'verb') or (l.key='genitive' and lower(t.w->>'pos')='verb')) then continue;end if;
   facts=facts||jsonb_build_array(jsonb_build_object('token_index',t.idx,'mode',l.mode,'key',l.key,'arabic',l.arabic,'english',l.english));
  end loop;
 end loop;
 if jsonb_array_length(facts)=0 then return null;end if;
 select array_agg(distinct f->>'mode') into modes from jsonb_array_elements(facts) f;
 return jsonb_build_object('tokens',tokens,'translation',english,'facts',facts,'modes',modes,'cefr_rank',(select max(x) from unnest(ranks) x),'length_band',case when jsonb_array_length(tokens)<=7 then 0 when jsonb_array_length(tokens)<=16 then 1 else 2 end,'sentence_hash',md5(regexp_replace(ar,'[ً-ْٰـ[:punct:][:space:]]','','g')));
end $$;

create function private.website_grammar_refresh_chapter() returns trigger
language plpgsql security definer set search_path='' as $$
declare p record; item jsonb;
begin
 delete from private.website_grammar_sources where chapter_id=new.id;
 if jsonb_typeof(new.content)='array' then
  for p in select value,ordinality-1 idx from jsonb_array_elements(new.content) with ordinality loop
   item=private.website_grammar_extract(p.value);
   if item is not null then insert into private.website_grammar_sources(chapter_id,paragraph_index,sentence_hash,payload,modes,cefr_rank,length_band)
    values(new.id,p.idx,item->>'sentence_hash',item-'modes'-'cefr_rank'-'length_band'-'sentence_hash',array(select jsonb_array_elements_text(item->'modes')),(item->>'cefr_rank')::integer,(item->>'length_band')::integer);end if;
  end loop;
 end if;
 return new;
end $$;

create function private.website_grammar_index_segment(p_id bigint) returns void
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
  p=jsonb_build_object('tokens',(select jsonb_agg(w||jsonb_build_object('arabic',coalesce(w->>'arabic',w->>'ar',w->>'surface'),'pos',coalesce(w->>'pos',w->>'POS')) order by ord) from jsonb_array_elements(raw->'tokens') with ordinality x(w,ord)), 'translation',coalesce(raw->>'english',raw->>'translation',s.english_text));
 end if;
 item=private.website_grammar_extract(p);
 if item is not null then insert into private.website_grammar_sources(segment_id,sentence_hash,payload,modes,cefr_rank,length_band)
 values(s.id,item->>'sentence_hash',item-'modes'-'cefr_rank'-'length_band'-'sentence_hash',array(select jsonb_array_elements_text(item->'modes')),(item->>'cefr_rank')::integer,(item->>'length_band')::integer);end if;
end $$;
create function private.website_grammar_refresh_segment() returns trigger
language plpgsql security definer set search_path='' as $$ begin perform private.website_grammar_index_segment(new.id);return new;end $$;
create function private.website_grammar_refresh_transcript() returns trigger
language plpgsql security definer set search_path='' as $$ declare s record;begin
 for s in select id from public.transcript_segments where transcript_id=new.id loop perform private.website_grammar_index_segment(s.id);end loop;return new;end $$;
create trigger website_grammar_chapter after insert or update of content on public.chapters for each row execute function private.website_grammar_refresh_chapter();
create trigger website_grammar_segment after insert or update of canonical_paragraph,english_text,original_text,for_you_manual_excluded,for_you_music_only,for_you_theme_score on public.transcript_segments for each row execute function private.website_grammar_refresh_segment();
create trigger website_grammar_transcript after update of raw_transcript on public.youtube_transcripts for each row when(old.raw_transcript is distinct from new.raw_transcript) execute function private.website_grammar_refresh_transcript();

create function private.website_grammar_candidates(p_mode text,p_seed text,p_recent text[],p_cefr integer) returns jsonb
language plpgsql stable security definer set search_path='' set statement_timeout='4s' as $$
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
  where (c.id is not null and c.chapter_number>=1) or (v.status='ready' and v.source_origin='website_admin_transcript' and (v.searchable or v.explore_published) and not s.for_you_manual_excluded and not s.for_you_music_only and s.for_you_theme_score<.7)
 ), deduplicated as (select *,row_number() over(partition by sentence_hash order by md5(id::text||p_seed)) duplicate_rank from visible), varied as (
  select *,row_number() over(partition by length_band order by row_source,md5(id::text||p_seed)) band_rank from (select *,row_number() over(partition by source_id order by md5(id::text||p_seed)) row_source from deduplicated where duplicate_rank=1) x
 ), final as (select jsonb_build_object('id',id,'sentence_hash',sentence_hash,'chapter_id',chapter_id,'paragraph_index',paragraph_index,'segment_id',segment_id,'cefr_rank',cefr_rank,'payload',payload) item from varied order by band_rank,length_band limit 30)
 select coalesce(jsonb_agg(item),'[]') into result from final;
 return result;
end $$;
create function public.website_grammar_candidates(p_mode text,p_seed text,p_recent text[] default '{}',p_cefr integer default null) returns jsonb
language sql stable set search_path='' as $$ select private.website_grammar_candidates(p_mode,p_seed,p_recent,p_cefr) $$;

revoke all on private.website_grammar_labels,private.website_grammar_sources from public,anon,authenticated;
revoke all on function private.website_grammar_identity(text),private.website_grammar_extract(jsonb),private.website_grammar_refresh_chapter(),private.website_grammar_index_segment(bigint),private.website_grammar_refresh_segment(),private.website_grammar_refresh_transcript(),private.website_grammar_candidates(text,text,text[],integer),public.website_grammar_candidates(text,text,text[],integer) from public,anon,authenticated;
grant execute on function private.website_grammar_candidates(text,text,text[],integer),public.website_grammar_candidates(text,text,text[],integer) to authenticated;

-- Existing corpus is backfilled in bounded batches after deployment. Future
-- writes are synchronous, using the triggers above. This avoids holding DDL
-- locks while scanning historical content under the management API timeout.
