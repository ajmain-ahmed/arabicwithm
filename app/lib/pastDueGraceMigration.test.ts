// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { readFileSync } from 'node:fs'
import { randomUUID } from 'node:crypto'

/* The grace migration replaces private.has_premium: past_due/unpaid
   subscriptions keep access until the paid period ends. */
let db: PGlite
const active = randomUUID(), trialing = randomUUID(), pastDue = randomUUID(), unpaid = randomUUID(),
  pastDueExpired = randomUUID(), canceled = randomUUID(), incomplete = randomUUID(), free = randomUUID()

async function hasPremium(userId: string) {
  return (await db.query<{ value: boolean }>('select account_has_premium($1) as value', [userId])).rows[0].value
}

beforeAll(async () => {
  db = new PGlite()
  await db.exec(`create schema auth;create schema private;create role anon;create role authenticated;create role service_role bypassrls;
create table auth.users(id uuid primary key);
create table public.account_roles(user_id uuid primary key,role text);
create function public.account_role(uuid) returns text language sql as 'select coalesce((select role from public.account_roles where user_id=$1),''user'')';
create table private.manual_premium_grants(user_id uuid primary key,enabled boolean,changed_by uuid,reason text,updated_at timestamptz default now());
create table private.manual_premium_audit(user_id uuid,enabled boolean,changed_by uuid,reason text,changed_at timestamptz default now());
create table public.subscriptions(user_id uuid primary key,customer_id text,subscription_id text,status text not null default 'incomplete',current_period_end timestamptz not null default '1970-01-01',cancel_at_period_end boolean not null default false,event_created bigint not null default 0);
grant all on all tables in schema public to service_role;
grant all on all tables in schema private to service_role;
insert into auth.users(id) values('${active}'),('${trialing}'),('${pastDue}'),('${unpaid}'),('${pastDueExpired}'),('${canceled}'),('${incomplete}'),('${free}');
insert into public.subscriptions(user_id,customer_id,status,current_period_end) values
 ('${active}','cus-a','active','2099-01-01'),
 ('${trialing}','cus-t','trialing','2099-01-01'),
 ('${pastDue}','cus-p','past_due','2099-01-01'),
 ('${unpaid}','cus-u','unpaid','2099-01-01'),
 ('${pastDueExpired}','cus-pe','past_due','2020-01-01'),
 ('${canceled}','cus-c','canceled','2099-01-01'),
 ('${incomplete}','cus-i','incomplete','1970-01-01');`)
  await db.exec(readFileSync('supabase/migrations/20261105180000_premium_past_due_grace.sql', 'utf8'))
  await db.exec(`create function public.account_has_premium(p_user_id uuid) returns boolean language sql stable set search_path='' as $$ select private.has_premium(p_user_id); $$;`)
}, 30000)

afterAll(async () => { await db?.close() })

describe('past_due grace in private.has_premium', () => {
  it('grants premium during the paid period for active, trialing, past_due and unpaid', async () => {
    expect(await hasPremium(active)).toBe(true)
    expect(await hasPremium(trialing)).toBe(true)
    expect(await hasPremium(pastDue)).toBe(true)
    expect(await hasPremium(unpaid)).toBe(true)
  })
  it('ends entitlement at period end even when the payment never recovers', async () => {
    expect(await hasPremium(pastDueExpired)).toBe(false)
  })
  it('keeps canceled, incomplete and subscription-free users restricted', async () => {
    expect(await hasPremium(canceled)).toBe(false)
    expect(await hasPremium(incomplete)).toBe(false)
    expect(await hasPremium(free)).toBe(false)
  })
})
