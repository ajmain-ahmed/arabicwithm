import { z } from "zod";
import { MEMORY } from "@/app/lib/entitlements";
import type { MemoryCard, MemoryDirection } from "@/app/lib/memory";
export const memorySessionSchema = z
  .object({
    cards: z
      .array(
        z.object({
          id: z.string().min(1).max(100),
          showId: z.string(),
          showSlug: z.string(),
          showTitle: z.string(),
          episodeId: z.string(),
          episodeSlug: z.string(),
          episodeTitle: z.string(),
          cover: z.string().optional(),
          timestamp: z.number().finite().nonnegative().nullable(),
          arabic: z.string().trim().min(1).max(20000),
          english: z.string().trim().min(1).max(20000),
        }),
      )
      .max(MEMORY.sessionCards),
    index: z.number().int().min(0).max(MEMORY.sessionCards),
    completed: z.number().int().min(0).max(MEMORY.sessionCards),
    sessionXp: z
      .number()
      .int()
      .min(0)
      .max(MEMORY.sessionCards * 5),
    direction: z.enum(["arabic", "english"]),
    completionIds: z.array(z.string().uuid()).max(MEMORY.sessionCards),
  })
  .superRefine((state, ctx) => {
    if (
      state.index > state.cards.length ||
      state.completed > state.index ||
      state.completionIds.length !== state.cards.length ||
      new Set(state.completionIds).size !== state.completionIds.length ||
      new Set(state.cards.map((card) => card.id)).size !== state.cards.length
    )
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Invalid Memory session queue.",
      });
  });
export type SavedMemorySession = z.infer<typeof memorySessionSchema>;
export interface PracticeState extends SavedMemorySession {
  phase: "selection" | "practice" | "complete";
  revealed: boolean;
}
export type PracticeEvent =
  | { type: "begin"; session: SavedMemorySession }
  | { type: "reveal" }
  | { type: "advance"; completionId: string; awarded: number }
  | { type: "skip"; completionId: string }
  | { type: "select"; cards: MemoryCard[] };
export function initialPractice(
  cards: MemoryCard[],
  direction: MemoryDirection = "arabic",
): PracticeState {
  return {
    cards,
    index: 0,
    completed: 0,
    sessionXp: 0,
    direction,
    completionIds: [],
    phase: "selection",
    revealed: false,
  };
}
export function practiceReducer(
  state: PracticeState,
  event: PracticeEvent,
): PracticeState {
  if (event.type === "begin") {
    const parsed = memorySessionSchema.safeParse(event.session);
    if (!parsed.success || !parsed.data.cards.length) return state;
    return {
      ...parsed.data,
      phase:
        parsed.data.index < parsed.data.cards.length ? "practice" : "complete",
      revealed: false,
    };
  }
  if (event.type === "select")
    return state.phase !== "practice"
      ? initialPractice(event.cards, state.direction)
      : state;
  if (state.phase !== "practice" || !state.cards[state.index]) return state;
  if (
    event.type === "skip" &&
    event.completionId !== state.completionIds[state.index]
  )
    return state;
  if (event.type === "reveal") return { ...state, revealed: true };
  if (
    event.type === "advance" &&
    (!state.revealed ||
      event.completionId !== state.completionIds[state.index] ||
      !Number.isInteger(event.awarded) ||
      event.awarded < 0 ||
      event.awarded > 5)
  )
    return state;
  const index = state.index + 1;
  return {
    ...state,
    index,
    revealed: false,
    phase: index === state.cards.length ? "complete" : "practice",
    completed: state.completed + (event.type === "advance" ? 1 : 0),
    sessionXp: state.sessionXp + (event.type === "advance" ? event.awarded : 0),
  };
}
