export const NAV_ITEMS = ['Home', 'Explore', 'Watch', 'Read', 'Memory'] as const

export const NAV_ROUTES: Record<(typeof NAV_ITEMS)[number], string> = {
  Home: '/', Explore: '/explore', Watch: '/cartoons', Read: '/books', Memory: '/memory',
}

/** Use the current identity instead of an authentication-dependent alias. */
export function profileRoute(userId: string): string {
  return `/profile/${encodeURIComponent(userId)}`
}
