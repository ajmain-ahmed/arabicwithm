export const NAV_ITEMS = ['Home', 'Explore', 'Watch', 'Read', 'Learn'] as const

export const NAV_ROUTES: Record<(typeof NAV_ITEMS)[number], string> = {
  Home: '/', Explore: '/explore', Watch: '/cartoons', Read: '/books', Learn: '/learn',
}

/* Destinations inside the Learn dropdown. */
export const LEARN_ITEMS = [
  { label: 'Memory', description: 'Build and review your saved vocabulary.', route: '/memory' },
  { label: 'Grammar', description: 'Practise Naḥw and Ṣarf.', route: '/grammar' },
  { label: 'Word Search', description: 'Find Arabic words in transcript puzzles.', route: '/word-search' },
] as const

/** Use the current identity instead of an authentication-dependent alias. */
export function profileRoute(userId: string): string {
  return `/profile/${encodeURIComponent(userId)}`
}
