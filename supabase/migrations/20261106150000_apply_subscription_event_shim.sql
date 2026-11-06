-- Temporary compatibility shim: the currently deployed app calls
-- apply_subscription_event with six arguments; the new code passes
-- p_started_at. Until the new code is deployed, translate six-argument calls
-- so webhook processing keeps working (started_at simply stays null).
-- Drop this shim once the new app code is live.
create or replace function public.apply_subscription_event(p_user_id uuid, p_event_created bigint, p_subscription_id text, p_status text, p_period_end timestamptz, p_cancel_at_period_end boolean)
returns void language sql security definer set search_path = public as $$
 select public.apply_subscription_event(p_user_id, p_event_created, p_subscription_id, p_status, p_period_end, p_cancel_at_period_end, null);
$$;
revoke all on function public.apply_subscription_event(uuid,bigint,text,text,timestamptz,boolean) from public, anon, authenticated;
grant execute on function public.apply_subscription_event(uuid,bigint,text,text,timestamptz,boolean) to service_role;
notify pgrst,'reload schema';
