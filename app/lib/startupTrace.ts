/** Optional diagnostics must never participate in application/auth decisions. */
export function startupMark(stage: string) {
  if (typeof window === 'undefined') return
  try {
    const target = window as Window & { __awmStartupMark?: (stage: string) => void }
    target.__awmStartupMark?.(stage)
  } catch { /* Diagnostics are independent of the operation being observed. */ }
}
