export { default as HtmlTooltip } from './HtmlTooltip'
export { default as WordTooltip } from './WordTooltip'
export { LEVEL_COLORS } from './WordTooltip'

export interface VocabEntry {
  arabic: string
  plain?: string
  transliteration: string
  english: string
  cefr?: string
  pos?: string
  root?: string | null
}
