create table private.website_rate_limits (
  key_hash text primary key check (length(key_hash) = 64),
  request_count integer not null,
  reset_at timestamptz not null
);
create index website_rate_limits_reset_idx on private.website_rate_limits (reset_at);
alter table private.website_rate_limits enable row level security;
revoke all on table private.website_rate_limits from public, anon, authenticated;

create function public.website_rate_limit(p_key_hash text, p_limit integer, p_window_ms integer)
returns jsonb
language plpgsql
security definer
set search_path = ''
set statement_timeout = '2s'
as $$
declare
  v_count integer;
  v_reset timestamptz;
begin
  if length(coalesce(p_key_hash, '')) <> 64 or p_limit < 1 or p_limit > 10000 or p_window_ms < 1000 or p_window_ms > 86400000 then
    raise exception 'Invalid rate limit request' using errcode = '22023';
  end if;

  insert into private.website_rate_limits (key_hash, request_count, reset_at)
  values (p_key_hash, 1, now() + make_interval(secs => p_window_ms / 1000.0))
  on conflict (key_hash) do update set
    request_count = case when website_rate_limits.reset_at <= now() then 1 else website_rate_limits.request_count + 1 end,
    reset_at = case when website_rate_limits.reset_at <= now() then now() + make_interval(secs => p_window_ms / 1000.0) else website_rate_limits.reset_at end
  returning request_count, reset_at into v_count, v_reset;

  if random() < 0.005 then
    delete from private.website_rate_limits where reset_at < now() - interval '1 day';
  end if;

  return jsonb_build_object(
    'ok', v_count <= p_limit,
    'retryAfterSeconds', greatest(1, ceil(extract(epoch from (v_reset - now()))))
  );
end;
$$;

revoke all on function public.website_rate_limit(text, integer, integer) from public, anon, authenticated;
grant execute on function public.website_rate_limit(text, integer, integer) to service_role;
