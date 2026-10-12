-- Functions only: no saved content changes. Same Arabic letter class as transcriptTokenValidation.ts.
begin;
create or replace function transcript_private.has_awm_arabic_letter(value text) returns boolean
language sql immutable strict set search_path='' as $$select value ~ '[ؠ-ؿف-يٮ-ٯٱ-ۓەۥ-ۦۮ-ۯۺ-ۼۿݐ-ݿࡰ-ࢇࢉ-࢏ࢠ-ࣉﭐ-ﮱﯓ-ﴽﵐ-ﶏﶒ-ﷇﷰ-ﷻﺀ-ﻼ𐻂-𐻇𞸀-𞸃𞸅-𞸟𞸡-𞸢𞸤𞸧𞸩-𞸲𞸴-𞸷𞸹𞸻𞹂𞹇𞹉𞹋𞹍-𞹏𞹑-𞹒𞹔𞹗𞹙𞹛𞹝𞹟𞹡-𞹢𞹤𞹧-𞹪𞹬-𞹲𞹴-𞹷𞹹-𞹼𞹾𞺀-𞺉𞺋-𞺛𞺡-𞺣𞺥-𞺩𞺫-𞺻]'$$;
create or replace function transcript_private.validate_awm_token_letters(p_raw jsonb) returns void
language plpgsql set search_path='' as $$
declare item jsonb; token jsonb; s integer:=0; n integer; value jsonb; problems text[]:=array[]::text[]; field text;
begin
 if jsonb_typeof(p_raw->'content') is distinct from 'array' then return; end if;
 for item in select a.value from jsonb_array_elements(p_raw->'content') a loop
  s:=s+1;n:=0;
  if not(item ? 'tokens') then continue; end if;
  if jsonb_typeof(item->'tokens') is distinct from 'array' then problems:=array_append(problems,format('Segment %s: tokens must be an array.',s));continue; end if;
  if jsonb_array_length(item->'tokens')=0 then problems:=array_append(problems,format('Segment %s: tokens=[] — supplied enrichment must contain at least one Arabic token.',s));end if;
  for token in select a.value from jsonb_array_elements(item->'tokens') a loop
   n:=n+1;value:=coalesce(token->'ar',token->'arabic',token->'surface');
   if jsonb_typeof(value) is distinct from 'string' or not coalesce(transcript_private.has_awm_arabic_letter(value#>>'{}'),false) then
    problems:=array_append(problems,format('Segment %s, token %s: arabic=%s — must contain at least one Arabic-script letter; punctuation must be safely attached in Admin preflight.',s,n,coalesce(value::text,'missing')));
   end if;
   foreach field in array array['arabic','ar','surface'] loop
    if token ? field and token->field is distinct from value then problems:=array_append(problems,format('Segment %s, token %s: %s=%s — Arabic aliases disagree.',s,n,field,token->field));end if;
   end loop;
  end loop;
 end loop;
 if cardinality(problems)>0 then raise exception using message=array_to_string(problems,E'\n');end if;
end $$;
create or replace function transcript_private.validate_standalone_transcript_json(p_raw jsonb) returns void
language plpgsql set search_path='' as $$
declare item jsonb; token jsonb; segment integer:=0; token_number integer; field text; previous_offset numeric;
begin
 perform transcript_private.validate_awm_token_letters(p_raw);
 perform transcript_private.validate_standalone_timing_source(p_raw);
 for item in select a.value from jsonb_array_elements(p_raw->'content') a loop
  segment:=segment+1;
  if previous_offset is not null and (item->>'offset')::numeric<previous_offset then raise exception 'Segment %: offset timestamp-order error; timestamps have not been changed',segment; end if;
  previous_offset:=(item->>'offset')::numeric;
  token_number:=0;
  for token in select value from jsonb_array_elements(coalesce(item->'tokens','[]'::jsonb)) loop
   token_number:=token_number+1;
   foreach field in array array['pos','POS','entry_type','transliteration','cefr','english','gloss'] loop
    if token ? field and jsonb_typeof(token->field) is distinct from 'string' then raise exception 'Segment %, token %: % must be text',segment,token_number,field; end if;
   end loop;
   if token ? 'headword' and jsonb_typeof(token->'headword') not in ('string','null') then raise exception 'Segment %, token %: headword must be text or null',segment,token_number; end if;
   if token ? 'entry_type' and token->>'entry_type' not in ('word','phrase') then raise exception 'Segment %, token %: entry_type must be word or phrase',segment,token_number; end if;
   if token->>'entry_type'='phrase' and token ? 'headword' and (jsonb_typeof(token->'headword') is distinct from 'string' or token->>'headword' !~ '^[1-9][0-9]*$') then raise exception 'Segment %, token %: phrase headword must be a phrase ID string',segment,token_number; end if;
  end loop;
 end loop;
end $$;
create or replace function transcript_private.validate_manual_awm_canonical(p_canonical jsonb,p_first integer default 1) returns void
language plpgsql immutable set search_path='' as $$
declare item jsonb; token jsonb; segment integer:=p_first; token_number integer; field text;
begin
 if jsonb_typeof(p_canonical) is distinct from 'array' or jsonb_array_length(p_canonical)=0 then raise exception 'Canonical source: expected a non-empty paragraph array'; end if;
 for item in select value from jsonb_array_elements(p_canonical) loop
  if jsonb_typeof(item) is distinct from 'object' or not(item ?& array['tokens','timestamp','translation','paragraph'])
   or item-array['tokens','timestamp','translation','paragraph']<>'{}'::jsonb then raise exception 'Segment %: invalid canonical paragraph fields',segment; end if;
  if jsonb_typeof(item->'tokens') is distinct from 'array' or jsonb_array_length(item->'tokens')=0 then raise exception 'Segment %: tokens must be a non-empty array',segment; end if;
  if jsonb_typeof(item->'translation') is distinct from 'string' or length(item->>'translation')>10000 then raise exception 'Segment %: translation must be text (up to 10000 characters)',segment; end if;
  if jsonb_typeof(item->'timestamp') is distinct from 'string' or item->>'timestamp' !~ '^([0-9]+:[0-5][0-9]|[0-9]+:[0-5][0-9]:[0-5][0-9])(\.[0-9]{1,3})?$' then raise exception 'Segment %: timestamp must be MM:SS or HH:MM:SS, with optional milliseconds',segment; end if;
  if jsonb_typeof(item->'paragraph') is distinct from 'number' or item->>'paragraph'<>segment::text then raise exception 'Segment %: invalid paragraph position',segment; end if;
  token_number:=0;
  for token in select value from jsonb_array_elements(item->'tokens') loop
   token_number:=token_number+1;
   if jsonb_typeof(token) is distinct from 'object' or not(token ?& array['pos','arabic','english','headword','entry_type','transliteration'])
    or token-array['pos','arabic','english','headword','entry_type','transliteration']<>'{}'::jsonb then raise exception 'Segment %, token %: invalid canonical token fields',segment,token_number; end if;
   foreach field in array array['pos','arabic','english','transliteration'] loop
    if jsonb_typeof(token->field) is distinct from 'string' or length(btrim(token->>field)) not between 1 and 10000 then raise exception 'Segment %, token %: % must be non-empty text',segment,token_number,field; end if;
   end loop;
   if not transcript_private.has_awm_arabic_letter(token->>'arabic') then raise exception 'Segment %, token %: arabic must contain at least one Arabic-script letter',segment,token_number; end if;
   if token->>'entry_type' not in ('word','phrase') or jsonb_typeof(token->'entry_type') is distinct from 'string' then raise exception 'Segment %, token %: entry_type must be word or phrase',segment,token_number; end if;
   if jsonb_typeof(token->'headword') not in ('string','null') then raise exception 'Segment %, token %: headword must be text or null',segment,token_number; end if;
   if token->>'entry_type'='phrase' and (jsonb_typeof(token->'headword') is distinct from 'string' or token->>'headword' !~ '^[1-9][0-9]*$') then raise exception 'Segment %, token %: phrase headword must be a phrase ID string',segment,token_number; end if;
  end loop;
  segment:=segment+1;
 end loop;
end $$;
revoke all on function transcript_private.has_awm_arabic_letter(text),transcript_private.validate_awm_token_letters(jsonb) from public,anon,authenticated;
grant execute on function transcript_private.has_awm_arabic_letter(text),transcript_private.validate_awm_token_letters(jsonb) to service_role;
commit;
