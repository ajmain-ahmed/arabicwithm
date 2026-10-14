export const NAV_ITEMS = ['Home', 'Explore', 'Watch', 'Read', 'Learn'] as const

export const NAV_ROUTES: Record<(typeof NAV_ITEMS)[number], string> = {
  Home: '/', Explore: '/explore', Watch: '/cartoons', Read: '/books', Learn: '/memory',
}

/* Destinations inside the Learn dropdown. */
export const LEARN_ITEMS = [
  { label: 'Memory', description: 'Flashcard practice', route: '/memory' },
  { label: 'Grammar', description: 'Naḥw & Ṣarf activities', route: '/grammar' },
  { label: 'Word Search', description: 'Puzzles from real transcripts', route: '/word-search' },
] as const

/** Use the current identity instead of an authentication-dependent alias. */
export function profileRoute(userId: string): string {
  return `/profile/${encodeURIComponent(userId)}`
}
