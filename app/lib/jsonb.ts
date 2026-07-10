// app/lib/jsonb.ts — safe JSONB parsing for Supabase and other sources.

export function parseJsonb<T = unknown>(val: unknown): T | null {
  if (val == null) return null
  if (typeof val === "string") {
    try {
      return JSON.parse(val) as T
    } catch {
      return null
    }
  }
  return val as T
}
