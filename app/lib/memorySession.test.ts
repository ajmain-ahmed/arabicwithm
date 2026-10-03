import { expect, it } from "vitest";
import {
  initialPractice,
  practiceReducer,
  memorySessionSchema,
  type SavedMemorySession,
} from "./memorySession";
const cards = Array.from({ length: 6 }, (_, i) => ({
  id: `episode:${i}`,
  showId: "show",
  showSlug: "show",
  showTitle: "Show",
  episodeId: "episode",
  episodeSlug: "episode",
  episodeTitle: "Episode",
  timestamp: null,
  arabic: "source",
  english: "translation",
}));
const state: SavedMemorySession = {
  cards,
  index: 0,
  completed: 0,
  sessionXp: 0,
  direction: "arabic",
  completionIds: cards.map(
    (_, i) => `11111111-1111-4111-8111-${String(i).padStart(12, "0")}`,
  ),
};
it("accepts canonical 5-XP known cards beyond the old 20-XP session bound", () => {
  expect(
    memorySessionSchema.safeParse({
      ...state,
      index: 5,
      completed: 5,
      sessionXp: 25,
    }).success,
  ).toBe(true);
});
it.each([
  { index: 7 },
  { completed: 1 },
  { completionIds: [] },
  { cards: [cards[0], cards[0]] },
])("rejects inconsistent restored queues %j", (patch) => {
  expect(memorySessionSchema.safeParse({ ...state, ...patch }).success).toBe(
    false,
  );
});
it("advances once after reveal, rejects duplicate reviews, completes and restarts cleanly", () => {
  let s = practiceReducer(initialPractice(cards), {
    type: "begin",
    session: state,
  });
  for (let i = 0; i < cards.length; i++) {
    s = practiceReducer(s, { type: "reveal" });
    const event = {
      type: "advance" as const,
      completionId: state.completionIds[i],
      awarded: 5,
    };
    s = practiceReducer(s, event);
    const duplicate = practiceReducer(s, event);
    expect(duplicate).toBe(s);
    expect(s.index).toBe(i + 1);
    expect(s.revealed).toBe(false);
  }
  expect(s).toMatchObject({ phase: "complete", completed: 6, sessionXp: 30 });
  s = practiceReducer(s, { type: "begin", session: state });
  expect(s).toMatchObject({
    phase: "practice",
    index: 0,
    completed: 0,
    revealed: false,
    sessionXp: 0,
  });
});
it("ignores empty starts, final-card events and stale repeated skips", () => {
  const empty = initialPractice([]);
  expect(practiceReducer(empty, { type: "reveal" })).toBe(empty);
  expect(
    practiceReducer(empty, {
      type: "begin",
      session: { ...state, cards: [], completionIds: [] },
    }),
  ).toBe(empty);
  let s = practiceReducer(initialPractice(cards), {
    type: "begin",
    session: state,
  });
  const event = { type: "skip" as const, completionId: state.completionIds[0] };
  s = practiceReducer(s, event);
  expect(practiceReducer(s, event)).toBe(s);
  expect(s.completed).toBe(0);
});
