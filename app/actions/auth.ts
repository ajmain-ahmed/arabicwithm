// app/actions/auth.ts — admin authentication helpers

"use server"

import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"

async function getAuthClient() {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll() { },
      },
    }
  )
}

export async function getAuthenticatedUserId(): Promise<string | null> {
  try {
    const supabase = await getAuthClient()
    const { data, error } = await supabase.auth.getUser()
    if (error) {
      if (error.message !== "Auth session missing!") {
        console.error("[auth] getUser error:", error.message)
      }
      return null
    }
    return data.user?.id ?? null
  } catch (e) {
    console.error("[auth] unexpected error:", e)
    return null
  }
}

const ADMIN_UIDS = new Set(
  [process.env.ADMIN, process.env.ADMIN2].filter((v): v is string => Boolean(v))
)

export async function isAdminUser(): Promise<boolean> {
  const userId = await getAuthenticatedUserId()
  if (!userId || ADMIN_UIDS.size === 0) return false
  return ADMIN_UIDS.has(userId)
}

export async function guardAdmin(): Promise<void> {
  const ok = await isAdminUser()
  if (!ok) throw new Error("Forbidden")
}
