-- Member tenure: remember when the current subscription began so the profile
-- can show "member since". Seeded once from the subscription's own `created`
-- timestamp (carried by every webhook event); later events never move it.
alter table public.subscriptions add column if not exists started_at timestamptz;

create or replace function public.apply_subscription_event(p_user_id uuid, p_event_created bigint, p_subscription_id text, p_status text, p_period_end timestamptz, p_cancel_at_period_end boolean, p_started_at timestamptz)
returns void language sql security definer set search_path = public as $$
update subscriptions set subscription_id=p_subscription_id, status=p_status, current_period_end=p_period_end,
 cancel_at_period_end=p_cancel_at_period_end, event_created=p_event_created,
 started_at=coalesce(started_at, p_started_at)
 where user_id=p_user_id and event_created <= p_event_created;
$$;
revoke all on function public.apply_subscription_event(uuid,bigint,text,text,timestamptz,boolean,timestamptz) from public, anon, authenticated;
grant execute on function public.apply_subscription_event(uuid,bigint,text,text,timestamptz,boolean,timestamptz) to service_role;
-- The signature change creates an overload rather than replacing; retire the
-- six-argument version so only the current signature exists.
drop function if exists public.apply_subscription_event(uuid,bigint,text,text,timestamptz,boolean);
notify pgrst,'reload schema';
