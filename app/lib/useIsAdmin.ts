'use client'

import { useEffect, useState } from "react"
import { isAdminUser } from "@/app/actions/auth"

export function useIsAdmin() {
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    let cancelled = false
    isAdminUser()
      .then((admin) => {
        if (!cancelled) setIsAdmin(admin)
      })
      .catch(() => {
        if (!cancelled) setIsAdmin(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  return isAdmin
}
