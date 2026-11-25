-- Approved additive localisation storage; original content remains unchanged.
-- Additive metadata storage; original content tables and JSON remain untouched.
create table public.content_localisations (
  entity_type text not null check (entity_type in
    ('book','chapter','show','episode','transcript','transcript_group','category','featured','activity')),
  entity_id text not null check (length(entity_id) between 1 and 256),
  locale text not null check (locale ~ '^[a-z]{2,3}(-[A-Za-z0-9]{2,8})*$'),
  field text not null check (field in ('title','description')),
  value text not null check (length(btrim(value)) between 1 and 20000),
  status text not null default 'draft' check (status in ('draft','approved')),
  source_hash text not null check (source_hash ~ '^[0-9a-f]{64}$'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  reviewed_at timestamptz,
  primary key (entity_type,entity_id,locale,field),
  check (status <> 'approved' or reviewed_at is not null)
);
alter table public.content_localisations enable row level security;
revoke all on public.content_localisations from public, anon, authenticated;
revoke delete, truncate, references, trigger on public.content_localisations from service_role;
grant select, insert, update on public.content_localisations to service_role;
-- No public SELECT policy: even draft titles can disclose unreleased content.
-- Server readers must FIRST enforce the parent's existing release/entitlement
-- rules, then fetch approved translations for only the selected eligible IDs.
-- Server writes must call guardAdmin and validate parent identity, source_hash
-- and current values. Never replace an existing curated translation implicitly.
-- entity_id is deliberately text to support UUID content IDs and static taxonomy
-- keys; polymorphic parent existence is validated in the guarded server layer.
