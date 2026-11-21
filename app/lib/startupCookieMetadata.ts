/** Safe request-local metadata only. Never return or log cookie/token/user values. */
export function startupCookieMetadata(header: string | null, now = Date.now()) {
  const raw = header ?? ''
  const bytes = new TextEncoder().encode(raw).length
  const entries = raw.slice(0, 32768).split(';').flatMap(part => {
    const at = part.indexOf('=')
    return at < 0 ? [] : [{ name: part.slice(0, at).trim(), value: part.slice(at + 1).trim() }]
  })
  const auth = entries.filter(entry => /^sb-[a-z0-9]+-(?:auth-token|refresh-token)(?:\.\d+)?$/.test(entry.name))
  const groups = new Map<string, typeof auth>()
  for (const entry of auth) {
    const name = entry.name.replace(/\.\d+$/, '')
    groups.set(name, [...groups.get(name) ?? [], entry])
  }
  return {
    headerBytes: bytes, headerTooLarge: bytes > 32768,
    cookieCount: entries.length, authCookieCount: auth.length,
    duplicateAuthNames: new Set(auth.filter((entry, index) => auth.findIndex(other => other.name === entry.name) !== index).map(entry => entry.name)).size,
    authCookies: [...groups].map(([name, chunks]) => {
      let parsed = false, expired: boolean | null = null
      if (bytes <= 32768 && !name.endsWith('refresh-token')) {
        try {
          // Prefer a full cookie over stale chunked copies; report both via metadata.
          const full = chunks.find(chunk => chunk.name === name)
          let value = decodeURIComponent(full?.value ?? chunks.toSorted((a,b) => Number(a.name.split('.').at(-1)) - Number(b.name.split('.').at(-1))).map(chunk => chunk.value).join(''))
          if (value.startsWith('base64-')) value = atob(value.slice(7).replace(/-/g, '+').replace(/_/g, '/'))
          const data: unknown = JSON.parse(value)
          parsed = Boolean(data && typeof data === 'object')
          if (data && typeof data === 'object' && 'expires_at' in data && typeof data.expires_at === 'number') expired = data.expires_at * 1000 <= now
        } catch { /* Parse status only; error messages can contain cookie contents. */ }
      }
      return { name, count: chunks.length, bytes: chunks.reduce((n,c) => n + new TextEncoder().encode(c.value).length,0),
        fullAndChunked: chunks.some(c => c.name === name) && chunks.some(c => c.name !== name), parseSuccess: parsed, expired }
    }),
    authenticationVerified: false,
  }
}
