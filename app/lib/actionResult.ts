import { unstable_rethrow } from "next/navigation";
export type ActionResult<T> =
  { ok: true; data: T } | { ok: false; error: string };
/** Expected failures cross the production action boundary as data, never raw DB errors. */
export async function actionResult<T>(
  label: string,
  operation: () => Promise<T>,
  message: string,
): Promise<ActionResult<T>> {
  try {
    return { ok: true, data: await operation() };
  } catch (error) {
    unstable_rethrow(error);
    console.error(`[${label}]`, error);
    return { ok: false, error: message };
  }
}
