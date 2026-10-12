CREATE OR REPLACE FUNCTION transcript_private.validate_canonical(p_canonical jsonb, p_first integer DEFAULT 1)
 RETURNS void
 LANGUAGE plpgsql
 IMMUTABLE
 SET search_path TO ''
AS $function$
declare item jsonb; token jsonb; gloss text; position integer:=0;
begin
 if jsonb_typeof(p_canonical) is distinct from 'array' then raise exception 'invalid_canonical_transcript'; end if;
 if jsonb_array_length(p_canonical)=0 then raise exception 'invalid_canonical_transcript'; end if;
 for item in select value from jsonb_array_elements(p_canonical) loop
  if jsonb_typeof(item) is distinct from 'object'
   or not(item ?& array['tokens','timestamp','translation','paragraph'])
   or item-array['tokens','timestamp','translation','paragraph']<>'{}'::jsonb
   or jsonb_typeof(item->'tokens') is distinct from 'array'
   or jsonb_typeof(item->'translation') is distinct from 'string'
   or length(btrim(item->>'translation')) not between 1 and 10000
   or jsonb_typeof(item->'timestamp') is distinct from 'string'
   or item->>'timestamp' !~ '^([0-9]{2}:[0-5][0-9]|[0-9]{2}:[0-5][0-9]:[0-5][0-9])$'
   or jsonb_typeof(item->'paragraph') is distinct from 'number'
   or item->>'paragraph'<>(p_first+position)::text
   then raise exception 'invalid_canonical_transcript'; end if;
  if jsonb_array_length(item->'tokens')=0 then raise exception 'invalid_canonical_transcript'; end if;
  for token in select value from jsonb_array_elements(item->'tokens') loop
   if jsonb_typeof(token) is distinct from 'object'
    or not(token ?& array['pos','arabic','english','headword','entry_type','transliteration'])
    or token-array['pos','arabic','english','headword','entry_type','transliteration']<>'{}'::jsonb
    or token->>'entry_type' is distinct from 'word'
    or jsonb_typeof(token->'pos') is distinct from 'string'
    or token->>'pos' not in ('noun','proper noun','proper_noun','verb','adjective','adverb','pronoun','preposition','conjunction','particle','interjection','demonstrative','question word','number','numeral','expression','unknown')
    or jsonb_typeof(token->'arabic') is distinct from 'string' or length(btrim(token->>'arabic')) not between 1 and 10000
    or (select count(*) from regexp_matches(public.normalise_transcript_word(token->>'arabic'),'[[:alnum:]]+','g'))<>1
    or jsonb_typeof(token->'english') is distinct from 'string' or length(btrim(token->>'english')) not between 1 and 80
    or jsonb_typeof(token->'transliteration') is distinct from 'string' or length(btrim(token->>'transliteration')) not between 1 and 10000
    or (jsonb_typeof(token->'headword') is distinct from 'null' and
      (jsonb_typeof(token->'headword') is distinct from 'string' or token->>'headword' !~ U&'^[\0621-\063A\0641-\064A\064B-\0652\0670]+( [\0621-\063A\0641-\064A\064B-\0652\0670]+)*$'))
    then raise exception 'invalid_canonical_transcript'; end if;
   gloss:=lower(regexp_replace(btrim(token->>'english'),'\s+',' ','g'));
   if gloss in ('contextual word','meaning','translation','unknown word','word','n/a','todo','placeholder','dictionary meaning')
    or array_length(regexp_split_to_array(gloss,'\s+'),1)>10
    or gloss ~ '\m(conj|prep|pron|adj|adv|pl|sing|s\.o|s\.th)\.|\m(apoc|impf|perf|with foll)\M'
    or (gloss='[unclear]' and (token->>'pos'<>'unknown' or token->'headword'<>'null'::jsonb))
    then raise exception 'invalid_canonical_transcript'; end if;
  end loop;
  position:=position+1;
 end loop;
end $function$;

CREATE OR REPLACE FUNCTION transcript_private.guard_canonical_write()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
begin
 if tg_table_name='youtube_transcripts' then
  if new.canonical_transcript is not null then
   perform transcript_private.validate_canonical(new.canonical_transcript);
  end if;
 else
  if new.canonical_paragraph is not null then
   perform transcript_private.validate_canonical(jsonb_build_array(new.canonical_paragraph),new.position+1);
  end if;
 end if;
 return new;
end $function$;

CREATE OR REPLACE FUNCTION transcript_private.retain_source_paragraphs(p_id uuid)
 RETURNS void
 LANGUAGE sql
 SET search_path TO ''
AS $function$
  with source as (
    select c, row_number() over(order by (c->>'offset')::double precision,ord)-1 pos
    from public.youtube_transcripts t
    cross join lateral jsonb_array_elements(case when jsonb_typeof(t.raw_transcript->'content')='array'
      then t.raw_transcript->'content' else '[]'::jsonb end) with ordinality a(c,ord)
    where t.id=p_id
  ), matched as (
    select s.id,s.position,s.start_seconds,s.english_text,o.c
    from source o join public.transcript_segments s on s.transcript_id=p_id and s.position=o.pos
    where s.canonical_paragraph is null
      and s.original_text=o.c->>'text'
      and s.start_seconds=(o.c->>'offset')::double precision/1000
      and s.end_seconds=((o.c->>'offset')::double precision+(o.c->>'duration')::double precision)/1000
      and jsonb_typeof(o.c->'tokens')='array'
      and exists(select 1 from jsonb_array_elements(case when jsonb_typeof(o.c->'tokens')='array' then o.c->'tokens' else '[]'::jsonb end) w
        where jsonb_typeof(w->'english')='string' and btrim(w->>'english')<>'')
      and not exists(select 1 from jsonb_array_elements(case when jsonb_typeof(o.c->'tokens')='array' then o.c->'tokens' else '[]'::jsonb end) w
        where jsonb_typeof(w->'arabic') is distinct from 'string' or btrim(w->>'arabic')=''
          or (w ? 'english' and jsonb_typeof(w->'english') not in ('string','null')))
      and public.normalise_transcript_word(regexp_replace(s.original_text,U&'[^[:alnum:]\0610-\061A\064B-\065F\0670\06D6-\06ED\0640]+',' ','g'))
        =public.normalise_transcript_word(regexp_replace((select string_agg(w->>'arabic',' ' order by ord)
          from jsonb_array_elements(case when jsonb_typeof(o.c->'tokens')='array' then o.c->'tokens' else '[]'::jsonb end) with ordinality a(w,ord)),
          U&'[^[:alnum:]\0610-\061A\064B-\065F\0670\06D6-\06ED\0640]+',' ','g'))
  )
  update public.transcript_segments s set canonical_paragraph=jsonb_build_object(
    'tokens',(select jsonb_agg(jsonb_build_object(
      'arabic',w->>'arabic','english',coalesce(w->>'english',''),
      'pos',replace(coalesce(w->>'pos','unknown'),'_',' '),'headword',w->>'headword',
      'entry_type',coalesce(w->>'entry_type','word'),'transliteration',coalesce(w->>'transliteration','')
    ) order by ord) from jsonb_array_elements(m.c->'tokens') with ordinality a(w,ord)),
    'timestamp',transcript_private.canonical_timestamp(m.start_seconds),
    'translation',coalesce(case when jsonb_typeof(m.c->'translation')='string' then nullif(btrim(m.c->>'translation'),'') end,
      case when jsonb_typeof(m.c->'english')='string' then nullif(btrim(m.c->>'english'),'') end,m.english_text,''),
    'paragraph',m.position+1)
  from matched m where s.id=m.id;
$function$;

CREATE OR REPLACE FUNCTION public.admin_import_youtube_transcript(p_actor uuid, p_youtube_id text, p_title text, p_channel text, p_raw jsonb, p_searchable boolean DEFAULT false)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v uuid; l uuid:=gen_random_uuid(); c jsonb; k jsonb; n integer; i integer:=0;
begin
 if public.account_role(p_actor)<>'admin' then raise exception 'Forbidden'; end if;
 if p_youtube_id is null or p_youtube_id !~ '^[A-Za-z0-9_-]{11}$' or p_title is null or length(btrim(p_title)) not between 1 and 300
 or length(coalesce(p_channel,''))>300 or jsonb_typeof(p_raw->'content') is distinct from 'array' or octet_length(p_raw::text)>20971520 then raise exception 'Invalid transcript or import exceeds the 20 MB budget'; end if;
 n:=jsonb_array_length(p_raw->'content');
 if n<1 then raise exception 'Transcript needs at least one timed segment'; end if;
 for c in select value from jsonb_array_elements(p_raw->'content') loop
  i:=i+1;
  if jsonb_typeof(c->'text') is distinct from 'string' or length(btrim(c->>'text'))<1 or c->>'text' !~ U&'[\0600-\06FF]'
  or jsonb_typeof(c->'offset') is distinct from 'number' or jsonb_typeof(c->'duration') is distinct from 'number' then raise exception 'Segment %: needs Arabic text, offset and duration',i; end if;
  if (c->>'offset')::numeric<0 or (c->>'offset')::numeric<>trunc((c->>'offset')::numeric)
  or (c->>'duration')::numeric<=0 or (c->>'duration')::numeric<>trunc((c->>'duration')::numeric)
  or (c->>'offset')::numeric+(c->>'duration')::numeric>43200000 then raise exception 'Segment %: invalid millisecond interval',i; end if;
  if c ? 'english' and jsonb_typeof(c->'english') is distinct from 'string' then raise exception 'Segment %: english must be text',i; end if;
  if c ? 'tokens' then
   if jsonb_typeof(c->'tokens') is distinct from 'array' then raise exception 'Segment %: tokens must be an array',i; end if;
   for k in select value from jsonb_array_elements(c->'tokens') loop
    if jsonb_typeof(k) is distinct from 'object' or jsonb_typeof(coalesce(k->'ar',k->'arabic',k->'surface')) is distinct from 'string' then raise exception 'Segment %: token needs Arabic text',i; end if;
    if k ? 'start_ms' or k ? 'end_ms' then
     if jsonb_typeof(k->'start_ms') is distinct from 'number' or jsonb_typeof(k->'end_ms') is distinct from 'number' then raise exception 'Segment %: token needs start_ms and end_ms',i; end if;
     if (k->>'start_ms')::numeric<>trunc((k->>'start_ms')::numeric) or (k->>'end_ms')::numeric<>trunc((k->>'end_ms')::numeric)
     or (k->>'start_ms')::numeric<(c->>'offset')::numeric or (k->>'end_ms')::numeric<=(k->>'start_ms')::numeric
     or (k->>'end_ms')::numeric>(c->>'offset')::numeric+(c->>'duration')::numeric then raise exception 'Segment %: token timing outside its sentence',i; end if;
    end if;
   end loop;
  end if;
 end loop;
 perform pg_advisory_xact_lock(hashtextextended(p_youtube_id,1));
 select id into v from public.youtube_transcripts where youtube_id=p_youtube_id for update;
 if found then perform public.admin_record_transcript_origin(p_actor,v); return v; end if;
 insert into public.youtube_transcripts(youtube_id,canonical_url,title,channel,thumbnail,provider,status,searchable,raw_transcript,lease_id,lease_until,duration_seconds)
 values(p_youtube_id,'https://www.youtube.com/watch?v='||p_youtube_id,btrim(p_title),nullif(btrim(p_channel),''),'https://i.ytimg.com/vi/'||p_youtube_id||'/hqdefault.jpg','manual','indexing',p_searchable,
 jsonb_build_object('provider','manual','lang','ar','content',p_raw->'content'),l,now()+interval '3 minutes',
 (select max((x->>'offset')::double precision+(x->>'duration')::double precision)/1000 from jsonb_array_elements(p_raw->'content') x)) returning id into v;
 perform public.index_youtube_transcript(v,l);
 if not exists(select 1 from public.youtube_transcripts where id=v and status='ready') then raise exception 'Transcript could not be indexed as Arabic'; end if;
 with ordered as (select x,row_number() over(order by (x->>'offset')::double precision,ord)-1 pos from jsonb_array_elements(p_raw->'content') with ordinality a(x,ord))
 update public.transcript_segments s set english_text=nullif(btrim(o.x->>'english'),'') from ordered o where s.transcript_id=v and s.position=o.pos and s.original_text=o.x->>'text';
 update public.youtube_transcripts set translation_status=case
 when not exists(select 1 from public.transcript_segments where transcript_id=v and english_text is null) then 'ready'
 when exists(select 1 from public.transcript_segments where transcript_id=v and english_text is not null) then 'partial' else 'unavailable' end where id=v;
 perform public.admin_record_transcript_origin(p_actor,v);
 return v;
end $function$;
