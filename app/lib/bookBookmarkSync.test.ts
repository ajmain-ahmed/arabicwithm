import { beforeEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ getUser: vi.fn(), update: vi.fn() }));
vi.mock("@/app/lib/supabase/client", () => ({
  supabase: { auth: { getUser: mocks.getUser, updateUser: mocks.update } },
}));
import { syncBookBookmark } from "./bookBookmarkSync";
import type { BookSentenceBookmark } from "./bookSentenceBookmark";
beforeEach(() => {
  vi.resetAllMocks();
  mocks.getUser.mockResolvedValue({
    data: { user: { id: "user" } },
    error: null,
  });
  mocks.update.mockResolvedValue({ error: null });
});
it("orders save then removal across reader navigation", async () => {
  let finish!: (value: unknown) => void;
  mocks.update.mockImplementationOnce(
    () => new Promise((resolve) => (finish = resolve)),
  );
  const bookmark = { bookSlug: "book" } as BookSentenceBookmark;
  const first = syncBookBookmark("user", bookmark),
    last = syncBookBookmark("user", null);
  await Promise.resolve();
  await Promise.resolve();
  expect(mocks.update).toHaveBeenCalledTimes(1);
  finish({ error: null });
  expect(await first).toBe(true);
  expect(await last).toBe(true);
  expect(mocks.update).toHaveBeenLastCalledWith({
    data: { book_sentence_bookmark: null },
  });
});
it("turns network/API failures into a useful sync result and allows retry", async () => {
  mocks.update.mockRejectedValueOnce(new Error("network"));
  expect(await syncBookBookmark("user", null)).toBe(false);
  expect(await syncBookBookmark("user", null)).toBe(true);
});
it("does not apply an old account bookmark to a newly signed-in account", async () => {
  mocks.getUser.mockResolvedValue({
    data: { user: { id: "other" } },
    error: null,
  });
  expect(await syncBookBookmark("user", null)).toBe(false);
  expect(mocks.update).not.toHaveBeenCalled();
});
