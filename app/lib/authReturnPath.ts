const allowed = new Set(['/', '/reset-password', '/memory', '/grammar', '/explore'])

/** OAuth and email callbacks share the same same-origin return policy. */
export function authReturnPath(value: string | null, origin: string): string {
  try {
    const url = value?.startsWith('/') ? new URL(value, origin) : null
    return url && url.origin === origin && allowed.has(url.pathname) ? url.pathname + url.search : '/'
  } catch { return '/' }
}
