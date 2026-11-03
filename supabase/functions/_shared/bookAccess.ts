/** Canonical book-specific media policy shared by the website and audio API. */
export function canAccessBookMedia(signedIn: boolean, premium: boolean, premiumExempt: boolean, completed = true): boolean {
  return signedIn && completed && (premium || premiumExempt)
}
