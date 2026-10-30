import { supabase } from '@/app/lib/supabase/client'

export function savedBookSlugs(metadata: Record<string, unknown> | undefined): string[] {
  const value = metadata?.my_list_books
  return Array.isArray(value) ? [...new Set(value.filter((slug): slug is string => typeof slug === 'string'))] : []
}

// Serialize reader additions and manual changes so concurrent mounts cannot
// overwrite another book added in this tab. Always merge the latest account data.
let pending: Promise<void> = Promise.resolve()
export function setBookInMyList(userId: string, bookSlug: string, included: boolean): Promise<void> {
  const operation = pending.catch(() => {}).then(async () => {
    const { data, error } = await supabase.auth.getUser()
    if (error || data.user?.id !== userId) throw new Error('Sign in again')
    const slugs = savedBookSlugs(data.user.user_metadata)
    if (slugs.includes(bookSlug) === included) return
    const updated = included ? [...slugs, bookSlug] : slugs.filter(slug => slug !== bookSlug)
    const { error: writeError } = await supabase.auth.updateUser({ data: { my_list_books: updated } })
    if (writeError) throw writeError
  })
  pending = operation
  return operation
}
