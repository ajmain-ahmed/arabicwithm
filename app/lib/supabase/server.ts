import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function getAuthClient() {
  const cookieStore = await cookies();
  return createServerClient(
    (process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL)!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(values) {
          // Server Actions can persist refreshes; rendering relies on proxy.ts.
          try {
            values.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            /* Server Component cookies are read-only. */
          }
        },
      },
    },
  );
}
