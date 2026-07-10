// app/lib/errors.ts — centralized error message extraction.

export function errorMessage(e: unknown): string {
  if (e instanceof Error) return e.message
  if (typeof e === "string") return e
  if (e && typeof e === "object" && "message" in e && typeof e.message === "string") {
    return e.message
  }
  return "An unexpected error occurred"
}
