CREATE OR REPLACE FUNCTION transcript_private.for_you_hashes(p_text text)
 RETURNS text[]
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO ''
AS $function$
 with words as (select regexp_split_to_array(public.normalise_transcript_word(p_text),' +') w)
 select coalesce(array_agg(distinct md5(array_to_string(w[i:i+3],' '))),'{}')
 from words cross join lateral generate_series(1,least(cardinality(w)-3,256)) i;
$function$
;
CREATE OR REPLACE FUNCTION transcript_private.classify_for_you_reference(p_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare v_cohort text; v_old_cohort text;
begin
 -- Serialise classification jobs, without taking a lock in the read-only feed.
 perform pg_advisory_xact_lock(hashtextextended('for_you_classification',0));
 select cohort into v_old_cohort from transcript_private.intro_windows where transcript_id=p_id limit 1;
 select coalesce(nullif(source_channel_id,''),nullif(lower(btrim(channel)),'')) into v_cohort
 from public.youtube_transcripts where id=p_id;
 update public.transcript_segments s set
   for_you_fingerprints=transcript_private.for_you_hashes(s.original_text),
   for_you_music_only=lower(btrim(s.original_text)) ~
     '^([[:space:]\[\]()♪♫]|music|instrumental|intro music|theme music|موسيقى|موسيقي|موسيقا|اغنية البداية|أغنية البداية|تصفيق)+$'
 where s.transcript_id=p_id;
 if v_cohort is null then
   update public.transcript_segments set for_you_theme_score=0
   where transcript_id=p_id and for_you_theme_score<>0;
 end if;
 delete from transcript_private.intro_windows where transcript_id=p_id;
 if v_cohort is not null then
   insert into transcript_private.intro_windows(transcript_id,anchor_id,cohort,segment_ids,fingerprints,window_size)
   select p_id,s.id,v_cohort,w.ids,transcript_private.for_you_hashes(w.words),sizes.n
   from public.transcript_segments s cross join (values(3),(6),(12)) sizes(n) cross join lateral (
     select array_agg(n.id order by n.start_seconds,n.position,n.id) ids,
       string_agg(n.original_text,' ' order by n.start_seconds,n.position,n.id) words,
       max(n.end_seconds)-min(n.start_seconds) duration,
       max(n.gap) gap
     from (select x.*, x.start_seconds-lag(x.end_seconds) over(order by x.start_seconds,x.position,x.id) gap
       from (select x.* from public.transcript_segments x
         where x.transcript_id=p_id and (x.start_seconds,x.position,x.id)>=(s.start_seconds,s.position,s.id)
           and x.start_seconds<s.start_seconds+60 and not x.for_you_music_only
         order by x.start_seconds,x.position,x.id limit sizes.n) x) n
   ) w
   where s.transcript_id=p_id and s.start_seconds<=120
     and w.duration between 8 and 60 and coalesce(w.gap,0)<=2
     and cardinality(regexp_split_to_array(public.normalise_transcript_word(w.words),' +'))>=12
     and cardinality(transcript_private.for_you_hashes(w.words))>=4;
 end if;
 -- Revisit peers when the third episode arrives, including already indexed clips.
 with windows as materialized (
   select a.segment_ids from transcript_private.intro_windows a
   where a.cohort in(v_cohort,v_old_cohort) and
     (select count(distinct b.transcript_id) from transcript_private.intro_windows b
       where b.cohort=a.cohort and b.transcript_id<>a.transcript_id
         and b.fingerprints && a.fingerprints
         and (select count(*) from unnest(a.fingerprints) f where f=any(b.fingerprints))
             >=0.8*greatest(cardinality(a.fingerprints),cardinality(b.fingerprints)))>=2
 ), flagged as (select distinct unnest(segment_ids) id from windows)
 update public.transcript_segments s set for_you_theme_score=case
   when exists(select 1 from flagged f where f.id=s.id) then 0.95 else 0 end
 where s.transcript_id in(select t.id from public.youtube_transcripts t
   where coalesce(nullif(t.source_channel_id,''),nullif(lower(btrim(t.channel)),'')) in(v_cohort,v_old_cohort))
   and s.for_you_theme_score is distinct from (case
     when exists(select 1 from flagged f where f.id=s.id) then 0.95::real else 0::real end);
 perform transcript_private.exclude_best_stories_intro(p_id);
delete from transcript_private.for_you_classification_queue where transcript_id=p_id;
end $function$
;
