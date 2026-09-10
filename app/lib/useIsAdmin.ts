'use client'

import { useEffect, useState } from "react"
import { useAuth } from "@/app/AuthContext"
import { isAdminUser } from "@/app/actions/auth"

export function useIsAdmin() {
  const { user, loading } = useAuth()
  const [result, setResult] = useState<{ userId: string; admin: boolean } | null>(null)

  useEffect(() => {
    if (loading || !user) return
    let cancelled = false
    isAdminUser()
      .then((admin) => {
        if (!cancelled) setResult({ userId: user.id, admin })
      })
      .catch(() => {
        if (!cancelled) setResult({ userId: user.id, admin: false })
      })
    return () => {
      cancelled = true
    }
  }, [loading, user])

  return !loading && user?.id === result?.userId && result?.admin === true
}
