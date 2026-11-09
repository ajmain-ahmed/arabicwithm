-- Drop the six-argument compatibility shim: production now runs the
-- seven-argument webhook code, so the translated overload is retired.
drop function if exists public.apply_subscription_event(uuid,bigint,text,text,timestamptz,boolean);
notify pgrst,'reload schema';
