begin;
create table public.account_roles (
 user_id uuid primary key references auth.users(id),
 role text not null check (role in ('user','editor','admin')),
 updated_at timestamptz not null default now()
);
insert into public.account_roles(user_id,role)
select id, case when raw_app_meta_data->>'role'='admin' or raw_app_meta_data->>'is_admin'='true' then 'admin'
 when raw_app_meta_data->>'role'='editor' then 'editor' else 'user' end from auth.users;
create table public.access_change_audit (
 id uuid primary key default gen_random_uuid(), target_user_id uuid not null references auth.users(id),
 previous_role text not null, new_role text not null, changed_by uuid not null references auth.users(id),
 changed_at timestamptz not null default now(), reason text not null
);
create index on public.access_change_audit(target_user_id,changed_at desc);
create table public.content_suggestions (
 id uuid primary key default gen_random_uuid(), author_id uuid not null references auth.users(id),
 content_type text not null check(content_type in ('book','show')),
 parent_id uuid not null, target_id uuid not null, line_index integer not null check(line_index>=0),
 location text not null, original_document jsonb not null, original_block jsonb not null,
 original_arabic text not null, original_english text not null,
 suggested_arabic text, suggested_english text, suggested_tokens jsonb,
 comment text not null default '', reason text not null default '',
 status text not null default 'pending' check(status in ('pending','accepted','rejected','withdrawn')),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 reviewed_by uuid references auth.users(id), reviewed_at timestamptz, admin_response text
);
create index on public.content_suggestions(author_id,status,created_at desc);
create index on public.content_suggestions(status,content_type,created_at desc);
alter table public.account_roles enable row level security;
alter table public.access_change_audit enable row level security;
alter table public.content_suggestions enable row level security;
revoke all on public.account_roles,public.access_change_audit,public.content_suggestions from public,anon,authenticated;
grant select on public.account_roles,public.content_suggestions to authenticated;
grant all on public.account_roles,public.access_change_audit,public.content_suggestions to service_role;
create policy own_role on public.account_roles for select to authenticated using(user_id=(select auth.uid()));
create policy own_suggestions on public.content_suggestions for select to authenticated using(author_id=(select auth.uid()));

-- Canonical writes remain available only through existing protected server operations.
do $$ declare t text; begin
 foreach t in array array['books','chapters','shows','episodes','book_characters','book_character_contexts','hanswehr_dictionary','hanswehr_transliteration','hanswehr_quran','phrases','examples','vocabulary','content_versions'] loop
  if to_regclass('public.'||t) is not null then
   execute format('revoke insert,update,delete,truncate,trigger,references on public.%I from anon,authenticated',t);
  end if;
 end loop;
end $$;

create function public.account_role(p_user_id uuid) returns text language sql stable security invoker set search_path='' as $$
 select coalesce((select role from public.account_roles where user_id=p_user_id),'user');
$$;

create function public.change_account_role(p_actor uuid,p_target uuid,p_role text,p_reason text)
returns void language plpgsql security invoker set search_path='' as $$
declare old_role text;
begin
 perform pg_advisory_xact_lock(73142819);
 if public.account_role(p_actor)<>'admin' then raise exception 'Forbidden'; end if;
 if p_role not in ('user','editor','admin') or length(trim(p_reason))=0 or length(p_reason)>2000 then raise exception 'Invalid role or reason'; end if;
 old_role:=public.account_role(p_target);
 if old_role=p_role then return; end if;
 if old_role='admin' and p_role<>'admin' and (select count(*) from public.account_roles where role='admin')<=1 then raise exception 'The final Admin cannot be demoted'; end if;
 insert into public.account_roles(user_id,role) values(p_target,p_role) on conflict(user_id) do update set role=excluded.role,updated_at=now();
 insert into public.access_change_audit(target_user_id,previous_role,new_role,changed_by,reason) values(p_target,old_role,p_role,p_actor,trim(p_reason));
end $$;

create schema if not exists private;
create function private.admin_user_directory(p_actor uuid,p_tab text,p_search text,p_page integer,p_size integer)
returns jsonb language plpgsql security definer set search_path='' as $$
declare result jsonb;
begin
 if public.account_role(p_actor)<>'admin' then raise exception 'Forbidden'; end if;
 if p_tab not in ('all','premium','editor','admin') or p_page<0 or p_size not between 1 and 100 or length(p_search)>200 then raise exception 'Invalid directory request'; end if;
 with accounts as (
 select u.id, u.email,coalesce(nullif(p.display_name,''),nullif(u.raw_user_meta_data->>'full_name',''),nullif(u.raw_user_meta_data->>'name',''),'Arabic learner') as name,
 u.raw_user_meta_data->>'avatar_url' as avatar,u.created_at as joined,u.last_sign_in_at as last_sign_in,
 coalesce(r.role,'user') as role,
 coalesce(s.status in ('active','trialing') and s.current_period_end>now(),false) as paid_premium,
 (coalesce(r.role,'user')='admin' or coalesce(s.status in ('active','trialing') and s.current_period_end>now(),false)) as premium,
 s.status as subscription_status,s.current_period_end,s.cancel_at_period_end,u.banned_until
 from auth.users u left join public.account_roles r on r.user_id=u.id left join public.public_profiles p on p.user_id=u.id left join public.subscriptions s on s.user_id=u.id
 where not coalesce(u.is_anonymous,false)
 ), filtered as (select * from accounts where (p_tab='all' or (p_tab='premium' and premium) or role=p_tab)
 and (strpos(lower(name),lower(p_search))>0 or strpos(lower(coalesce(email,'')),lower(p_search))>0))
 select jsonb_build_object('total',(select count(*) from filtered),'counts',(select jsonb_build_object('all',count(*),'premium',count(*) filter(where premium),'editor',count(*) filter(where role='editor'),'admin',count(*) filter(where role='admin')) from accounts),
 'users',coalesce((select jsonb_agg(x) from (select f.*,
 (select jsonb_object_agg(status,n) from (select status,count(*) n from public.content_suggestions where author_id=f.id group by status)a) as activity
 from (select * from filtered order by joined desc,id limit p_size offset p_page*p_size)f)x),'[]'::jsonb)) into result;
 return result;
end $$;
revoke all on function private.admin_user_directory(uuid,text,text,integer,integer) from public,anon,authenticated;
grant usage on schema private to service_role;
grant execute on function private.admin_user_directory(uuid,text,text,integer,integer) to service_role;
create function public.admin_user_directory(p_actor uuid,p_tab text default 'all',p_search text default '',p_page integer default 0,p_size integer default 25)
returns jsonb language sql security invoker set search_path='' as $$
 select private.admin_user_directory(p_actor,p_tab,p_search,p_page,p_size);
$$;

create function public.review_source(p_type text,p_target uuid) returns jsonb language plpgsql security invoker set search_path='' as $$
declare doc jsonb; parent uuid; label text;
begin
 if p_type='book' then
 select c.content,c.book_id,b.title||' / '||c.title into doc,parent,label from public.chapters c join public.books b on b.id=c.book_id where c.id=p_target;
 elsif p_type='show' then
 select e.transcript,e.show_id,s.title||' / '||e.title into doc,parent,label from public.episodes e join public.shows s on s.id=e.show_id where e.id=p_target;
 else raise exception 'Invalid content type'; end if;
 if doc is null or jsonb_typeof(doc)<>'array' then raise exception 'Source missing or unsupported legacy format'; end if;
 return jsonb_build_object('document',doc,'parent',parent,'location',label);
end $$;

create function public.submit_content_suggestion(p_actor uuid,p_type text,p_target uuid,p_line integer,p_document jsonb,p_arabic text,p_english text,p_comment text,p_reason text)
returns uuid language plpgsql security invoker set search_path='' as $$
declare source jsonb; block jsonb; new_id uuid;
begin
 if public.account_role(p_actor) not in ('editor','admin') then raise exception 'Forbidden'; end if;
 source:=public.review_source(p_type,p_target);
 if source->'document' is distinct from p_document then raise exception 'Source changed; reload before submitting'; end if;
 block:=source->'document'->p_line;
 if p_line<0 or block is null then raise exception 'Line not found'; end if;
 if length(coalesce(p_arabic,''))>10000 or length(coalesce(p_english,''))>10000 or length(coalesce(p_comment,''))>10000 or length(coalesce(p_reason,''))>10000 then raise exception 'Suggestion too long'; end if;
 if nullif(trim(p_arabic),'') is null and nullif(trim(p_english),'') is null and nullif(trim(p_comment),'') is null then raise exception 'Add a comment or correction'; end if;
 insert into public.content_suggestions(author_id,content_type,parent_id,target_id,line_index,location,original_document,original_block,original_arabic,original_english,suggested_arabic,suggested_english,comment,reason)
 values(p_actor,p_type,(source->>'parent')::uuid,p_target,p_line,source->>'location',p_document,block,
 coalesce((select string_agg(t->>'arabic',' ' order by ord) from jsonb_array_elements(block->'tokens') with ordinality as x(t,ord)),''),coalesce(block->>'translation',''),nullif(trim(p_arabic),''),nullif(trim(p_english),''),coalesce(p_comment,''),coalesce(p_reason,'')) returning id into new_id;
 return new_id;
end $$;

create function public.edit_content_suggestion(p_actor uuid,p_id uuid,p_withdraw boolean,p_arabic text,p_english text,p_comment text,p_reason text)
returns void language plpgsql security invoker set search_path='' as $$
begin
 if public.account_role(p_actor) not in ('editor','admin') then raise exception 'Forbidden'; end if;
 if not p_withdraw and nullif(trim(p_arabic),'') is null and nullif(trim(p_english),'') is null and nullif(trim(p_comment),'') is null then raise exception 'Add a comment or correction'; end if;
 if greatest(length(coalesce(p_arabic,'')),length(coalesce(p_english,'')),length(coalesce(p_comment,'')),length(coalesce(p_reason,'')))>10000 then raise exception 'Suggestion too long'; end if;
 update public.content_suggestions set status=case when p_withdraw then 'withdrawn' else 'pending' end,
 suggested_arabic=case when p_withdraw then suggested_arabic else nullif(trim(p_arabic),'') end,
 suggested_english=case when p_withdraw then suggested_english else nullif(trim(p_english),'') end,
 comment=case when p_withdraw then comment else coalesce(p_comment,'') end,reason=case when p_withdraw then reason else coalesce(p_reason,'') end,updated_at=now()
 where id=p_id and author_id=p_actor and status='pending';
 if not found then raise exception 'Own pending suggestion required'; end if;
end $$;

create function public.review_content_suggestion(p_actor uuid,p_id uuid,p_action text,p_response text,p_tokens jsonb default null)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare s public.content_suggestions; doc jsonb; block jsonb; arabic text;
begin
 if public.account_role(p_actor)<>'admin' then raise exception 'Forbidden'; end if;
 if p_action not in ('accept','reject','reply') or length(coalesce(p_response,''))>10000 then raise exception 'Invalid review'; end if;
 select * into s from public.content_suggestions where id=p_id for update;
 if not found then raise exception 'Suggestion not found'; end if;
 if p_action='reply' then update public.content_suggestions set admin_response=p_response,updated_at=now() where id=p_id; return jsonb_build_object('ok',true); end if;
 if s.status<>'pending' then raise exception 'Suggestion is no longer pending'; end if;
 if s.author_id=p_actor then raise exception 'Another Admin must review your suggestion'; end if;
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

-- All RPCs are service-only. The web server supplies the verified actor, never a client-supplied identity.
revoke all on function public.account_role(uuid),public.change_account_role(uuid,uuid,text,text),public.admin_user_directory(uuid,text,text,integer,integer),public.review_source(text,uuid),public.submit_content_suggestion(uuid,text,uuid,integer,jsonb,text,text,text,text),public.edit_content_suggestion(uuid,uuid,boolean,text,text,text,text),public.review_content_suggestion(uuid,uuid,text,text,jsonb) from public,anon,authenticated;
grant execute on function public.account_role(uuid),public.change_account_role(uuid,uuid,text,text),public.admin_user_directory(uuid,text,text,integer,integer),public.review_source(text,uuid),public.submit_content_suggestion(uuid,text,uuid,integer,jsonb,text,text,text,text),public.edit_content_suggestion(uuid,uuid,boolean,text,text,text,text),public.review_content_suggestion(uuid,uuid,text,text,jsonb) to service_role;
notify pgrst,'reload schema';
commit;
