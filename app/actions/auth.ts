// app/actions/auth.ts — admin authentication helpers

"use server"

import { getAuthClient } from '@/app/lib/supabase/server'
import { unstable_rethrow } from "next/navigation"
import type { User } from "@supabase/supabase-js"
import { serviceClient } from '@/app/lib/supabase'
import type { AccountRole } from '@/app/lib/reviews'


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
  role?: AccountRole
}

/** Server-verified identity and application role used by all authorization checks. */
export async function getAuthenticatedAccess(): Promise<AuthenticatedAccess | null> {
  const user = await getAuthenticatedUser()
  if (!user) return null
  const { data, error } = await serviceClient.rpc('account_role', { p_user_id: user.id })
  if (error) throw new Error('Unable to verify account access. Apply the user management migration.')
  const role: AccountRole = data === 'admin' || data === 'editor' ? data : 'user'
  return { userId: user.id, admin: role === 'admin', role }
}

export async function guardReviewer(): Promise<AuthenticatedAccess> {
  const access = await getAuthenticatedAccess()
  if (!access || !['editor', 'admin'].includes(access.role ?? 'user')) throw new Error('Forbidden')
  return access
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
