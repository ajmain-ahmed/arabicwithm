export function isMissingDatabaseFeature(error: { code?: string } | null | undefined): boolean {
  return Boolean(error && ['PGRST202', 'PGRST205', '42P01', '42883'].includes(error.code ?? ''))
}
export const LEARNING_SETUP_MESSAGE = 'Learning storage has not been installed in the database yet. Your existing account data is preserved. An administrator needs to apply the learning and platform migrations.'
