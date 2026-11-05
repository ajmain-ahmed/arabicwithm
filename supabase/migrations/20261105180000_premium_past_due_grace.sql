-- Grace period for failed renewals: a declined card must not cut a member
-- off mid-period while Stripe retries the payment. past_due/unpaid
-- subscriptions keep access until the already-paid period ends; entitlement
-- ends at period end unless the payment recovers (status flips back to
-- active via the webhook).
create or replace function private.has_premium(p_user_id uuid) returns boolean language sql stable set search_path='' as $$
 select public.account_role(p_user_id)='admin'
 or exists(select 1 from private.manual_premium_grants where user_id=p_user_id and enabled)
 or exists(select 1 from public.subscriptions where user_id=p_user_id and status in ('active','trialing','past_due','unpaid') and current_period_end>now());
$$;
revoke all on function private.has_premium(uuid) from public,anon,authenticated;
grant execute on function private.has_premium(uuid) to service_role;
notify pgrst,'reload schema';
