import { formatCefr } from './display'

export const CEFR_LEVELS = ['A0', 'A1', 'A2', 'B1', 'B2', 'C1', 'C2'] as const

export type CefrLevel = (typeof CEFR_LEVELS)[number]

export interface CefrPalette {
  background: string
  foreground: string
  softBackground: string
  border: string
}

/** Accessible, visually distinct colours shared by every CEFR label. */
export const CEFR_PALETTE: Record<CefrLevel, CefrPalette> = {
  A0: { background: '#52665d', foreground: '#fff', softBackground: '#e8eeeb', border: '#8fa198' },
  A1: { background: '#2d6a4f', foreground: '#fff', softBackground: '#e2f0e8', border: '#76a28e' },
  A2: { background: '#00766c', foreground: '#fff', softBackground: '#dff2f0', border: '#67aaa4' },
  B1: { background: '#806000', foreground: '#fff', softBackground: '#f5ecd1', border: '#b69b4b' },
  B2: { background: '#9a4814', foreground: '#fff', softBackground: '#f7e5d9', border: '#c1845f' },
  C1: { background: '#6d4c9e', foreground: '#fff', softBackground: '#eee7f7', border: '#9b83be' },
  C2: { background: '#4a2f7a', foreground: '#fff', softBackground: '#e9e3f2', border: '#806aa3' },
}

const FALLBACK_PALETTE: CefrPalette = {
  background: '#5f5954',
  foreground: '#fff',
  softBackground: '#efedeb',
  border: '#aaa39e',
}

export function parseCefrLevel(value: string | undefined | null): CefrLevel | null {
  const match = formatCefr(value).match(/(?:^|[^A-Z0-9])(A0|A1|A2|B1|B2|C1|C2)(?=$|[^A-Z0-9])/)
  return match?.[1] as CefrLevel | undefined ?? null
}

export function getCefrPalette(value: string | undefined | null): CefrPalette {
  const level = parseCefrLevel(value)
  return level ? CEFR_PALETTE[level] : FALLBACK_PALETTE
}

