-- Quality is derived at selection time; source transcript wording is untouched.
create or replace function transcript_private.for_you_word_count(p_text text,p_tokens jsonb)
returns integer language sql immutable security invoker set search_path='' as $$
 select case when jsonb_typeof(p_tokens)='array' and jsonb_array_length(p_tokens)>0 then
  (select count(*)::integer from jsonb_array_elements(p_tokens) token
   where coalesce(token->>'arabic',token->>'ar',token->>'surface',case when jsonb_typeof(token)='string' then token#>>'{}' end,'') ~ '[ء-غف-ي]')
 else
  (select count(*)::integer from regexp_split_to_table(coalesce(p_text,''),'[[:space:]]+') word where word ~ '[ء-غف-ي]')
 end;
$$;
revoke all on function transcript_private.for_you_word_count(text,jsonb) from public,anon,authenticated;
grant execute on function transcript_private.for_you_word_count(text,jsonb) to service_role;
