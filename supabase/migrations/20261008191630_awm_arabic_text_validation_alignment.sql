-- Keep paragraph text and token Arabic-letter rules identical. No data changes.
begin;
create or replace function transcript_private.validate_standalone_timing_source(p_raw jsonb) returns void
language plpgsql set search_path='' as $$
declare c jsonb; k jsonb; n integer; i integer:=0;
begin
 if jsonb_typeof(p_raw->'content') is distinct from 'array' or octet_length(p_raw::text)>20971520 then
  raise exception 'Invalid transcript or import exceeds the 20 MB budget';
 end if;
 n:=jsonb_array_length(p_raw->'content');
 if n<1 then raise exception 'Transcript needs at least one timed segment'; end if;
 for c in select value from jsonb_array_elements(p_raw->'content') loop
  i:=i+1;
  if jsonb_typeof(c->'text') is distinct from 'string' or length(btrim(c->>'text'))<1 or not transcript_private.has_awm_arabic_letter(c->>'text')
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
end $$;
commit;
