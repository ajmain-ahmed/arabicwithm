// @vitest-environment node
import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { beforeAll, afterAll, expect, it } from "vitest";
let db: PGlite;
const user = "11111111-1111-4111-8111-111111111111",
  admin = "22222222-2222-4222-8222-222222222222";
beforeAll(async () => {
  db = new PGlite();
  await db.exec(`create schema auth; create role anon;create role authenticated;create role service_role;
create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
create table account_roles(user_id uuid,role text);insert into account_roles values('${admin}','admin');
create function public.account_role(p_user_id uuid) returns text language sql stable as $$select coalesce((select role from account_roles where user_id=p_user_id),'user')$$;
create table subscriptions(user_id uuid,status text,current_period_end timestamptz);
create table memory_reviews(user_id uuid,completion_id uuid,card_id text,rating text check(rating in ('again','known')),activity_date date,xp integer,created_at timestamptz default now(),primary key(user_id,completion_id));
create table memory_sessions(user_id uuid primary key,state jsonb,updated_at timestamptz default now());`);
  await db.exec(
    readFileSync(
      "supabase/migrations/20261003231524_memory_authenticated_review_integrity.sql",
      "utf8",
    ),
  );
}, 30000);
afterAll(async () => {
  await db?.close();
});
async function review(
  id = user,
  completion = randomUUID(),
  card = randomUUID(),
  premium = false,
  limit = 30,
) {
  const session = {
    cards: [{ id: card }],
    index: 1,
    completionIds: [completion],
    sessionXp: 0,
  };
  return (
    await db.query<{
      r: { accepted: boolean; awarded: number; used: number; totalXp: number };
    }>("select complete_memory_card($1,$2,$3,$4,$5,$6,$7,$8::jsonb) r", [
      id,
      completion,
      card,
      "known",
      999,
      limit,
      premium,
      JSON.stringify(session),
    ])
  ).rows[0].r;
}
it("reproduces the service-role/no-JWT failure and rejects another user", async () => {
  await db.exec("set role service_role");
  await expect(review()).rejects.toThrow("Not authorised");
  await db.exec("reset role");
  await db.query("select set_config('request.jwt.claim.sub',$1,false)", [
    admin,
  ]);
  await expect(review(user)).rejects.toThrow("Not authorised");
});
it("persists with authenticated identity, caps client XP and retries idempotently", async () => {
  await db.query("select set_config('request.jwt.claim.sub',$1,false)", [user]);
  await db.exec("set role authenticated");
  const completion = randomUUID(),
    card = randomUUID();
  expect(await review(user, completion, card)).toEqual({
    accepted: true,
    awarded: 5,
    used: 1,
    totalXp: 5,
  });
  expect(await review(user, completion, card)).toEqual({
    accepted: true,
    awarded: 5,
    used: 1,
    totalXp: 5,
  });
  await db.exec("reset role");
  expect(
    (
      await db.query<{ state: { completed: number; sessionXp: number } }>(
        "select state from memory_sessions where user_id=$1",
        [user],
      )
    ).rows[0].state,
  ).toMatchObject({ completed: 1, sessionXp: 5 });
  expect((await review(user, randomUUID(), card)).awarded).toBe(0);
});
it("does not trust a client premium flag; verified Admin access does bypass the cap", async () => {
  await db.query("select set_config('request.jwt.claim.sub',$1,false)", [user]);
  expect(
    (await review(user, randomUUID(), randomUUID(), true, 1)).accepted,
  ).toBe(false);
  await db.query("select set_config('request.jwt.claim.sub',$1,false)", [
    admin,
  ]);
  expect(
    (await review(admin, randomUUID(), randomUUID(), false, 1)).accepted,
  ).toBe(true);
  expect(
    (await review(admin, randomUUID(), randomUUID(), false, 1)).accepted,
  ).toBe(true);
});
it("denies anonymous access without weakening the authenticated contract", async () => {
  await db.exec("set role anon");
  await expect(review()).rejects.toThrow(/permission denied/);
  await db.exec("reset role");
});
