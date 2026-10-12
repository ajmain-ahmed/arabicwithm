import { supabase } from "@/app/lib/supabase/client";
import type { BookSentenceBookmark } from "./bookSentenceBookmark";
const pending = new Map<string, Promise<void>>();
/** Serialize account bookmark writes across reader navigation; local bookmarks stay usable. */
export function syncBookBookmark(
  userId: string,
  bookmark: BookSentenceBookmark | null,
): Promise<boolean> {
  const result = (pending.get(userId) ?? Promise.resolve())
    .then(async () => {
      const { data, error: authError } = await supabase.auth.getUser();
      if (authError || data.user?.id !== userId) return false;
      const { error } = await supabase.auth.updateUser({
        data: { book_sentence_bookmark: bookmark },
      });
      return !error;
    })
    .catch(() => false);
  const fence = result.then(() => undefined);
  pending.set(userId, fence);
  void fence.then(() => {
    if (pending.get(userId) === fence) pending.delete(userId);
  });
  return result;
}
