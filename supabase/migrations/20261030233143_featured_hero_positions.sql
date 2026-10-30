-- Presentation metadata only; artwork remains in covers/featured.
create table public.featured_show_config (
 show_id uuid primary key references public.shows(id) on delete cascade,
 storage_path text not null unique check (storage_path ~* '^featured/[^/\\]+[.](avif|webp|jpg|jpeg|png|gif)$'),
 position_x double precision not null default 50 check (position_x between 0 and 100),
 position_y double precision not null default 50 check (position_y between 0 and 100),
 updated_at timestamptz not null default now()
);
alter table public.featured_show_config enable row level security;
revoke all on public.featured_show_config from public, anon, authenticated;
grant all on public.featured_show_config to service_role;
comment on table public.featured_show_config is 'Featured artwork framing; all reads and writes through server-side service client, writes require guardAdmin.';
