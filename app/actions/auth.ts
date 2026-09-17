// app/actions/auth.ts — admin authentication helpers

"use server"

import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { unstable_rethrow } from "next/navigation"
import type { User } from "@supabase/supabase-js"

async function getAuthClient() {
  const cookieStore = await cookies()
  return createServerClient(
    (process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL)!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(values) {
          // Server Actions can persist refreshes; rendering relies on proxy.ts.
          try { values.forEach(({ name, value, options }) => cookieStore.set(name, value, options)) } catch { /* Server Component cookies are read-only. */ }
        },
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

export interface AuthenticatedAccess {
  userId: string
  admin: boolean
}

const ADMIN_UIDS = new Set(
  [process.env.ADMIN, process.env.ADMIN2].filter((v): v is string => Boolean(v))
)

function hasAdminAccess(user: User): boolean {
  return user.app_metadata?.role === "admin"
    || user.app_metadata?.is_admin === true
    || ADMIN_UIDS.has(user.id)
}

/** Server-verified identity and application role used by all authorization checks. */
export async function getAuthenticatedAccess(): Promise<AuthenticatedAccess | null> {
  const user = await getAuthenticatedUser()
  return user ? { userId: user.id, admin: hasAdminAccess(user) } : null
}

export async function getAuthenticatedUserId(): Promise<string | null> {
  return (await getAuthenticatedAccess())?.userId ?? null
}

export async function isAdminUser(): Promise<boolean> {
  return (await getAuthenticatedAccess())?.admin ?? false
}

export async function guardAdmin(): Promise<void> {
  const ok = await isAdminUser()
  if (!ok) throw new Error("Forbidden")
}
