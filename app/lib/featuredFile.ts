/** Versioned assets retain the same canonical Show slug as legacy artwork. */
export function featuredFileSlug(name: string): string {
  return name.replace(/\.[^.]+$/, '').replace(/--[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i, '')
}

export function usesWebpFeaturedVariants(path: string): boolean {
  return /--[0-9a-f]{8}-[0-9a-f-]{27}\.[^.]+$/i.test(path)
}
