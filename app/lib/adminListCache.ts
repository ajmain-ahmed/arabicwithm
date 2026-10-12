interface Entry { value?: unknown; savedAt: number; promise?: Promise<unknown> }

/** Short-lived, browser-memory snapshots owned by one Admin layout. */
export class AdminListCache {
  private entries = new Map<string, Entry>()
  constructor(private ttl = 60_000) {}

  peek<T>(key: string): T | undefined { return this.entries.get(key)?.value as T | undefined }

  async load<T>(key: string, loader: () => Promise<T>, force = false): Promise<T> {
    if (force) this.entries.delete(key)
    const current = this.entries.get(key)
    if (current?.promise) return current.promise as Promise<T>
    if (current?.value !== undefined && Date.now() - current.savedAt < this.ttl) return current.value as T
    const entry: Entry = { value: current?.value, savedAt: current?.savedAt ?? 0 }
    const promise = loader().then(value => {
      // A mutation can replace an in-flight read; never restore its old data.
      if (this.entries.get(key) === entry) { entry.value = value; entry.savedAt = Date.now(); entry.promise = undefined }
      return value
    }, error => {
      if (this.entries.get(key) === entry) entry.promise = undefined
      throw error
    })
    entry.promise = promise
    this.entries.set(key, entry)
    if (this.entries.size > 32) this.entries.delete(this.entries.keys().next().value!)
    return promise
  }

  invalidate(prefix: string): void {
    for (const key of this.entries.keys()) if (key.startsWith(prefix)) this.entries.delete(key)
  }
}
