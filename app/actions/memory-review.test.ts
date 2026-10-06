// @vitest-environment node
import { beforeEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  user: vi.fn(),
  cookieRpc: vi.fn(),
  serviceRpc: vi.fn(),
  source: vi.fn(),
  extract: vi.fn(),
  result: { data: null as unknown, error: null as unknown },
}));
vi.mock("next/cache", () => ({ unstable_cache: (fn: unknown) => fn }));
vi.mock("next/navigation", () => ({ unstable_rethrow: vi.fn() }));
vi.mock("@/app/actions/auth", () => ({ getAuthenticatedUserId: mocks.user }));
vi.mock("@/app/actions/entitlements", () => ({
  fetchEntitlements: async () => ({ signedIn: true, memoryDailyLimit: 30 }),
}));
vi.mock("@/app/lib/supabase/server", () => ({
  getAuthClient: async () => ({ rpc: mocks.cookieRpc }),
}));
vi.mock("@/app/lib/memory", async (original) => ({
  ...(await original<typeof import("@/app/lib/memory")>()),
  extractMemoryCards: mocks.extract,
}));
vi.mock("@/app/lib/supabase", () => ({
  hasServiceClientConfig: () => true,
  serviceClient: {
    rpc: mocks.serviceRpc,
    from: () => {
      const q = {
        select: () => q,
        eq: () => q,
        maybeSingle: mocks.source,
        upsert: async () => mocks.result,
      };
      return q;
    },
  },
}));
import {
  fetchMemoryLibrary,
  recordMemoryReview,
  submitMemoryReview,
  fetchSavedMemorySession,
} from "./memory";
const user = "11111111-1111-4111-8111-111111111111",
  completion = "22222222-2222-4222-8222-222222222222";
const card = {
  id: "episode:0",
  showId: "show",
  showSlug: "show",
  showTitle: "Show",
  episodeId: "episode",
  episodeSlug: "episode",
  episodeTitle: "Episode",
  timestamp: null,
  arabic: "source",
  english: "translation",
};
const session = {
  cards: [card],
  index: 1,
  completed: 1,
  sessionXp: 0,
  direction: "arabic" as const,
  completionIds: [completion],
};
beforeEach(() => {
  vi.clearAllMocks();
  mocks.user.mockResolvedValue(user);
  mocks.extract.mockReturnValue([card]);
  mocks.source.mockResolvedValue({
    data: {
      id: "episode",
      show_id: "show",
      slug: "show",
      title: "Show",
      transcript: [],
    },
    error: null,
  });
  mocks.serviceRpc.mockResolvedValue({
    data: { accepted: true, awarded: 5, used: 1, totalXp: 5 },
    error: null,
  });
  vi.spyOn(console, "error").mockImplementation(() => {});
});
it("uses the session ledger service API after server-verified identity and source validation", async () => {
  expect(
    await recordMemoryReview(card.id, "known", completion, session),
  ).toMatchObject({ accepted: true, awarded: 5 });
  expect(mocks.serviceRpc).toHaveBeenCalledWith(
    "website_complete_memory_card_v2",
    expect.objectContaining({ p_user_id: user, p_completion_id: completion }),
  );
  expect(mocks.cookieRpc).not.toHaveBeenCalled();
});
it.each([null, {}, { accepted: true, awarded: -1, used: 1, totalXp: 1 }])(
  "rejects malformed backend responses without advancing %j",
  async (data) => {
    mocks.serviceRpc.mockResolvedValue({ data, error: null });
    expect(
      await submitMemoryReview(card.id, "known", completion, session),
    ).toMatchObject({ ok: false });
  },
);
it("returns recoverable errors for deleted sources and database failure", async () => {
  mocks.source.mockResolvedValueOnce({ data: null, error: null });
  expect(
    (await submitMemoryReview(card.id, "known", completion, session)).ok,
  ).toBe(false);
  expect(mocks.cookieRpc).not.toHaveBeenCalled();
  mocks.serviceRpc.mockResolvedValue({
    data: null,
    error: { message: "Not authorised" },
  });
  expect(
    await submitMemoryReview(card.id, "known", completion, session),
  ).toMatchObject({
    ok: false,
    error: expect.stringContaining("Your place is unchanged"),
  });
});
it("does not cache transport failures as deleted content", async () => {
  mocks.source.mockResolvedValueOnce({
    data: null,
    error: { message: "connection failed" },
  });
  expect(
    (await submitMemoryReview(card.id, "known", completion, session)).ok,
  ).toBe(false);
  expect(mocks.cookieRpc).not.toHaveBeenCalled();
});
it("rejects corrupt restored sessions and missing identities", async () => {
  mocks.source.mockResolvedValueOnce({
    data: { state: { ...session, index: 5 } },
    error: null,
  });
  expect(await fetchSavedMemorySession()).toBeNull();
  mocks.user.mockResolvedValue(null);
  expect(
    (await submitMemoryReview(card.id, "known", completion, session)).ok,
  ).toBe(false);
});

it("handles a malformed source URL as a missing selection without querying the database", async () => {
  expect(await fetchMemoryLibrary({ showId: "invalid" })).toMatchObject({
    cards: [],
    missingScope: true,
  });
  expect(mocks.source).not.toHaveBeenCalled();
});
