export const SUPPORT_PRESET_PENCE = [500, 1000, 2000, 5000] as const
export const MAX_SUPPORT_PENCE = 99_999_999

export function parseSupportAmountToPence(value: string): number | null {
  const normalized = value.trim()
  if (!/^\d+(?:\.\d{1,2})?$/.test(normalized)) return null

  const [pounds, pence = ''] = normalized.split('.')
  const amount = Number(pounds) * 100 + Number(pence.padEnd(2, '0'))
  if (!Number.isSafeInteger(amount) || amount <= 0 || amount > MAX_SUPPORT_PENCE) return null
  return amount
}

export function formatSupportAmount(amountPence: number): string {
  return new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(amountPence / 100)
}
