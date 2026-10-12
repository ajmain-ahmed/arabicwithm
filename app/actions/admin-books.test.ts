// @vitest-environment node
import { PGlite } from "@electric-sql/pglite";
import { beforeAll, afterAll, beforeEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  guard: vi.fn(),
  from: vi.fn(),
  tag: vi.fn(),
  path: vi.fn(),
}));
vi.mock("@/app/actions/auth", () => ({ guardAdmin: mocks.guard }));
vi.mock("next/cache", () => ({
  updateTag: mocks.tag,
  revalidatePath: mocks.path,
}));
vi.mock("next/navigation", () => ({ unstable_rethrow: vi.fn() }));
vi.mock("@/app/lib/supabase", () => ({ serviceClient: { from: mocks.from } }));
import {
  createBook,
  fetchBookForAdmin,
  fetchBooksForAdmin,
  type BookInput,
} from "./admin";
let db: PGlite;
const input: BookInput = {
  slug: "test-book",
  title: "Test Book",
  description: "A meaningful description of this test book.",
  author: "Author",
  title_ar: null,
  cover: null,
  cover_crop: { x: 50, y: 50, zoom: 1 },
  reading_time_minutes: 12,
  level: "b1",
  category: "Drama",
};
beforeAll(async () => {
  db = new PGlite();
  await db.exec(
    `create table books(id uuid primary key default gen_random_uuid(),slug text not null unique,title text not null,author text,title_ar text,description text check(description is not null and length(btrim(description))>=20),cover text,cover_crop jsonb not null default '{"x":50,"y":50,"zoom":1}',reading_time_minutes integer check(reading_time_minutes is null or reading_time_minutes>0),level text,category text,created_at timestamptz default now(),updated_at timestamptz default now());`,
  );
}, 30000);
afterAll(async () => {
  await db?.close();
});
beforeEach(async () => {
  vi.clearAllMocks();
  mocks.guard.mockResolvedValue(undefined);
  vi.spyOn(console, "error").mockImplementation(() => {});
  await db.exec("delete from books");
  mocks.from.mockImplementation(() => {
    let payload: Record<string, unknown> | undefined, id: string | undefined;
    const run = async () => {
      try {
        if (payload) {
          const columns = Object.keys(payload),
            values = Object.values(payload).map((v) =>
              typeof v === "object" && v !== null ? JSON.stringify(v) : v,
            );
          return {
            data: (
              await db.query(
                `insert into books(${columns.join(",")}) values(${columns.map((_, i) => "$" + (i + 1)).join(",")}) returning *`,
                values,
              )
            ).rows[0],
            error: null,
          };
        }
        const rows = (
          await db.query(
            "select * from books" + (id ? " where id=$1" : ""),
            id ? [id] : [],
          )
        ).rows;
        return { data: id ? (rows[0] ?? null) : rows, error: null };
      } catch (error) {
        return { data: null, error };
      }
    };
    const q = {
      insert: (value: Record<string, unknown>) => {
        payload = value;
        return q;
      },
      select: () => q,
      eq: (_key: string, value: string) => {
        id = value;
        return q;
      },
      order: () => q,
      single: run,
      maybeSingle: run,
      then: (resolve: (value: unknown) => unknown) => run().then(resolve),
    };
    return q;
  });
});
it("valid input persists in PostgreSQL and can be retrieved/rendered in Admin lists", async () => {
  const result = await createBook({
    ...input,
    title: " Test Book ",
    slug: " test-book ",
  });
  expect(result.ok).toBe(true);
  if (!result.ok) throw new Error(result.error);
  const saved = await fetchBookForAdmin(result.data);
  expect(saved).toMatchObject({
    id: result.data,
    slug: "test-book",
    title: "Test Book",
    level: "B1",
    reading_time_minutes: 12,
    description: input.description,
  });
  expect(await fetchBooksForAdmin()).toEqual([saved]);
  expect(mocks.tag).toHaveBeenCalledWith("books-public");
  expect(mocks.path).toHaveBeenCalledWith("/admin/books");
  expect(mocks.path).toHaveBeenCalledWith("/books");
});
it.each([
  { slug: "" },
  { title: "" },
  { description: "short" },
  { reading_time_minutes: 0 },
  { reading_time_minutes: 1.5 },
  { reading_time_minutes: NaN },
  { level: "wrong" },
])("rejects invalid fields without a DB mutation %j", async (patch) => {
  expect((await createBook({ ...input, ...patch })).ok).toBe(false);
  expect(mocks.from).not.toHaveBeenCalled();
  expect(
    (await db.query<{ n: number }>("select count(*)::int n from books")).rows[0]
      .n,
  ).toBe(0);
});
it("returns a clear duplicate-slug error and preserves the first book", async () => {
  await createBook(input);
  expect(await createBook(input)).toEqual({
    ok: false,
    error: "A book already uses this slug. Choose a different slug.",
  });
  expect(
    (await db.query<{ n: number }>("select count(*)::int n from books")).rows[0]
      .n,
  ).toBe(1);
});
it("fails closed with a reviewable permission message for non-Admin users", async () => {
  mocks.guard.mockRejectedValue(new Error("Forbidden"));
  expect(await createBook(input)).toEqual({
    ok: false,
    error: "Administrator access is required to save books.",
  });
  expect(mocks.from).not.toHaveBeenCalled();
});
it("maps schema drift to an actionable result without leaking SQL", async () => {
  mocks.from.mockImplementationOnce(() => {
    const q = {
      insert: () => q,
      select: () => q,
      single: async () => ({
        data: null,
        error: { code: "42703", message: "private SQL details" },
      }),
    };
    return q;
  });
  const result = await createBook(input);
  expect(result).toMatchObject({
    ok: false,
    error: expect.stringContaining("schema"),
  });
  expect(JSON.stringify(result)).not.toContain("private SQL");
});
