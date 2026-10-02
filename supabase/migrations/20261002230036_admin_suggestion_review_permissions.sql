-- Admins already have canonical CMS write access. Only Editors are prohibited from reviewing suggestions.
-- Keep the authenticated server actor, service-only grants, snapshot conflicts and annotation validation.
create or replace function public.review_content_suggestion(p_actor uuid,p_id uuid,p_action text,p_response text,p_tokens jsonb default null)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare s public.content_suggestions; doc jsonb; block jsonb; arabic text;
begin
 if public.account_role(p_actor)<>'admin' then raise exception 'Forbidden'; end if;
 if p_action not in ('accept','reject','reply') or length(coalesce(p_response,''))>10000 then raise exception 'Invalid review'; end if;
 select * into s from public.content_suggestions where id=p_id for update;
 if not found then raise exception 'Suggestion not found'; end if;
 if p_action='reply' then update public.content_suggestions set admin_response=p_response,updated_at=now() where id=p_id; return jsonb_build_object('ok',true); end if;
 if s.status<>'pending' then raise exception 'Suggestion is no longer pending'; end if;

 if p_action='accept' then
  if s.content_type='book' then select content into doc from public.chapters where id=s.target_id and book_id=s.parent_id for update;
  else select transcript into doc from public.episodes where id=s.target_id and show_id=s.parent_id for update; end if;
  if doc is null or doc is distinct from s.original_document or doc->s.line_index is distinct from s.original_block then
   return jsonb_build_object('ok',false,'conflict',true,'current',doc->s.line_index,'message','Source changed or removed. Review the current source and request a new suggestion.');
  end if;
  block:=doc->s.line_index;
  if s.suggested_arabic is not null and s.suggested_arabic<>s.original_arabic then
   if p_tokens is null or jsonb_typeof(p_tokens)<>'array' or jsonb_array_length(p_tokens)=0 then raise exception 'Arabic corrections require annotated replacement tokens'; end if;
   if exists(select 1 from jsonb_array_elements(p_tokens) t where jsonb_typeof(t)<>'object' or nullif(trim(t->>'arabic'),'') is null or nullif(trim(t->>'pos'),'') is null or coalesce(t->>'cefr','') not in ('a1','a2','b1','b2','c1','c2')) then raise exception 'Each token requires Arabic, POS and lowercase CEFR'; end if;
   select string_agg(t->>'arabic',' ' order by ord) into arabic from jsonb_array_elements(p_tokens) with ordinality x(t,ord);
   if arabic is distinct from s.suggested_arabic then raise exception 'Replacement tokens must match the proposed Arabic'; end if;
   block:=jsonb_set(block,'{tokens}',p_tokens);
  end if;
  if s.suggested_english is not null then block:=jsonb_set(block,'{translation}',to_jsonb(s.suggested_english)); end if;
  if block is distinct from s.original_block then
   doc:=jsonb_set(doc,array[s.line_index::text],block);
   if s.content_type='book' then update public.chapters set content=doc,updated_at=now() where id=s.target_id;
   else update public.episodes set transcript=doc,updated_at=now() where id=s.target_id; end if;
  end if;
 end if;
 update public.content_suggestions set status=case when p_action='accept' then 'accepted' else 'rejected' end,
 reviewed_by=p_actor,reviewed_at=now(),admin_response=p_response,suggested_tokens=p_tokens,updated_at=now() where id=p_id;
 return jsonb_build_object('ok',true);
end $$;
revoke all on function public.review_content_suggestion(uuid,uuid,text,text,jsonb) from public,anon,authenticated;
grant execute on function public.review_content_suggestion(uuid,uuid,text,text,jsonb) to service_role;
