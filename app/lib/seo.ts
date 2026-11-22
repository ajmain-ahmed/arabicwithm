export const SITE_URL = 'https://www.arabicwithm.com'
export const SITE_NAME = 'ArabicWithM'

export function absoluteUrl(path: string): string {
  return new URL(path, `${SITE_URL}/`).toString()
}

export function breadcrumbJsonLd(items: Array<{ name: string; path: string }>) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: absoluteUrl(item.path),
    })),
  }
}
