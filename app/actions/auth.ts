// app/actions/auth.ts — admin authentication helpers

"use server"

import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { unstable_rethrow } from "next/navigation"
import type { User } from "@supabase/supabase-js"

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

async function getAuthenticatedUser(): Promise<User | null> {
  try {
    const supabase = await getAuthClient()
    const { data, error } = await supabase.auth.getUser()
    if (error) {
      if (error.message !== "Auth session missing!") {
        console.error("[auth] getUser error:", error.message)
      }
      return null
    }
    return data.user ?? null
  } catch (e) {
    unstable_rethrow(e)
    console.error("[auth] unexpected error:", e)
    return null
  }
}

export async function getAuthenticatedUserId(): Promise<string | null> {
  const user = await getAuthenticatedUser()
  return user?.id ?? null
}

const ADMIN_UIDS = new Set(
  [process.env.ADMIN, process.env.ADMIN2].filter((v): v is string => Boolean(v))
)

export async function isAdminUser(): Promise<boolean> {
  const user = await getAuthenticatedUser()
  if (!user) return false

  const hasAdminRole = user.app_metadata?.role === "admin"
    || user.app_metadata?.is_admin === true

  return hasAdminRole || ADMIN_UIDS.has(user.id)
}

export async function guardAdmin(): Promise<void> {
  const ok = await isAdminUser()
  if (!ok) throw new Error("Forbidden")
}
