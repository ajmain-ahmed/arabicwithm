import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  auth: { user: { id: "verified" }, loading: false } as {
    user: { id: string } | null;
    loading: boolean;
  },
  progress: vi.fn(),
  saved: vi.fn(),
  save: vi.fn(),
  review: vi.fn(),
  push: vi.fn(),
}));
vi.mock("@/app/AuthContext", () => ({ useAuth: () => mocks.auth }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mocks.push, refresh: vi.fn() }),
}));
vi.mock("@/app/components/PremiumPrompt", () => ({ default: () => null }));
vi.mock("framer-motion", () => ({
  AnimatePresence: ({ children }: { children: React.ReactNode }) => children,
  useReducedMotion: () => true,
  motion: {
    div: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  },
}));
vi.mock("@/app/actions/memory", () => ({
  loadMemoryProgress: mocks.progress,
  loadSavedMemorySession: mocks.saved,
  persistMemorySession: mocks.save,
  submitMemoryReview: mocks.review,
}));
import MemoryPage from "./MemoryPage";
import type { MemoryLibrary } from "@/app/actions/memory";
const cards = Array.from({ length: 2 }, (_, i) => ({
  id: `episode:${i}`,
  showId: "show",
  showSlug: "show",
  showTitle: "Show",
  episodeId: "episode",
  episodeSlug: "episode",
  episodeTitle: "Episode",
  timestamp: null,
  arabic: `Source ${i}`,
  english: `Translation ${i}`,
}));
const library: MemoryLibrary = {
  cards,
  shows: [],
  scope: "global",
  scopeTitle: "Random practice",
  missingScope: false,
  recommendedCardCount: 5,
  availableCardCount: 2,
  newOnly: false,
};
let host: HTMLDivElement, root: Root;
beforeEach(() => {
  vi.resetAllMocks();
  mocks.auth = { user: { id: "verified" }, loading: false };
  window.localStorage.clear();
  mocks.progress.mockResolvedValue({
    ok: true,
    data: { used: 0, premium: false, totalXp: 0 },
  });
  mocks.saved.mockResolvedValue({ ok: true, data: null });
  mocks.save.mockResolvedValue({ ok: true, data: undefined });
  mocks.review.mockResolvedValue({
    ok: true,
    data: { accepted: true, awarded: 5, used: 1, totalXp: 5 },
  });
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  host = document.createElement("div");
  document.body.appendChild(host);
  root = createRoot(host);
});
afterEach(async () => {
  await act(async () => root.unmount());
  host.remove();
});
async function mount(value = library) {
  await act(async () => root.render(<MemoryPage library={value} />));
}
function button(label: string) {
  return Array.from(host.querySelectorAll("button")).find(
    (b) => b.textContent === label,
  )!;
}
async function click(label: string) {
  await act(async () => button(label).click());
}
it("starts, reveals, reviews the next card, finishes and restarts with fresh completion IDs", async () => {
  await mount();
  await click("Start");
  const first = mocks.save.mock.calls[0][0];
  expect(host.querySelector("input")).toBeNull();
  await click("Reveal");
  await click("Knew it");
  expect(host.textContent).toContain("Card 2 of 2");
  await click("Reveal");
  await click("Didn't know");
  expect(host.textContent).toContain("Deck complete");
  expect(host.querySelector("input")).not.toBeNull();
  await click("Practise again");
  expect(host.textContent).toContain("Card 1 of 2");
  expect(mocks.save.mock.calls.at(-1)![0].completionIds).not.toEqual(
    first.completionIds,
  );
});
it("reveal then New requests a fresh canonical deck without submitting a review", async () => {
  await mount();
  await click("Start");
  await click("Reveal");
  await click("New");
  expect(mocks.push).toHaveBeenCalledWith(
    expect.stringMatching(/^\/memory\?new=1&deck=/),
    { scroll: false },
  );
  expect(mocks.review).not.toHaveBeenCalled();
  await act(async () =>
    root.render(<MemoryPage key="new-deck" library={library} />),
  );
  await click("Start");
  expect(host.textContent).toContain("Card 1 of 2");
  expect(button("Reveal")).toBeTruthy();
});
it("locks rapid review/Skip/New/Exit interactions and advances only once", async () => {
  let finish!: (value: unknown) => void;
  mocks.review.mockImplementationOnce(
    () => new Promise((resolve) => (finish = resolve)),
  );
  await mount();
  await click("Start");
  await click("Reveal");
  await act(async () => {
    button("Knew it").click();
    button("Knew it").click();
    button("Skip").click();
    button("New").click();
  });
  expect(mocks.review).toHaveBeenCalledTimes(1);
  expect(mocks.push).not.toHaveBeenCalled();
  await act(async () =>
    finish({
      ok: true,
      data: { accepted: true, awarded: 5, used: 1, totalXp: 5 },
    }),
  );
  expect(host.textContent).toContain("Card 2 of 2");
});
it("retains the revealed card and completion ID on failed review and retries safely", async () => {
  mocks.review.mockResolvedValueOnce({
    ok: false,
    error: "Database temporarily unavailable",
  });
  await mount();
  await click("Start");
  await click("Reveal");
  await click("Knew it");
  expect(host.textContent).toContain("Database temporarily unavailable");
  expect(host.textContent).toContain("Card 1 of 2");
  await click("Knew it");
  expect(mocks.review.mock.calls[0][2]).toBe(mocks.review.mock.calls[1][2]);
  expect(host.textContent).toContain("Card 2 of 2");
});
it("handles an empty queue and unavailable progress without starting a session", async () => {
  await mount({ ...library, cards: [], availableCardCount: 0 });
  expect(host.textContent).toContain("No usable transcript cards");
  expect(button("Start")).toBeUndefined();
  expect(mocks.save).not.toHaveBeenCalled();
});
it("does not advance or navigate when a review resolves after unmount", async () => {
  let finish!: (value: unknown) => void;
  mocks.review.mockImplementationOnce(
    () => new Promise((resolve) => (finish = resolve)),
  );
  await mount();
  await click("Start");
  await click("Reveal");
  await click("Knew it");
  await act(async () => root.render(<div>Left Memory</div>));
  await act(async () =>
    finish({
      ok: true,
      data: { accepted: true, awarded: 5, used: 1, totalXp: 5 },
    }),
  );
  expect(host.textContent).toBe("Left Memory");
  expect(mocks.push).not.toHaveBeenCalled();
});
it("guest rapid review clicks count one card and need no backend", async () => {
  mocks.auth.user = null;
  await mount();
  await click("Start");
  await click("Reveal");
  await act(async () => {
    button("Knew it").click();
    button("Knew it").click();
  });
  expect(host.textContent).toContain("Card 2 of 2");
  expect(host.textContent).toContain("1 / 30 cards today");
  expect(mocks.review).not.toHaveBeenCalled();
});

it("does not let an old progress refresh erase a successful review", async () => {
  let finish!: (value: unknown) => void;
  mocks.progress
    .mockResolvedValueOnce({
      ok: true,
      data: { used: 0, premium: false, totalXp: 0 },
    })
    .mockImplementationOnce(() => new Promise((resolve) => (finish = resolve)));
  await mount();
  await click("Start");
  await click("Reveal");
  await click("Knew it");
  await act(async () =>
    finish({ ok: true, data: { used: 0, premium: false, totalXp: 0 } }),
  );
  expect(host.textContent).toContain("1 / 30 cards today");
  expect(host.textContent).toContain("Card 2 of 2");
});
