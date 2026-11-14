import type { GrammaticalCase } from '@/app/lib/bookTokenGrammar'
export { default as HtmlTooltip } from './HtmlTooltip'
export { default as WordTooltip } from './WordTooltip'
export { default as MobileDefinitionSheet } from './MobileDefinitionSheet'
export { default as MobileDefinitionPopover } from './MobileDefinitionPopover'
export { LEVEL_COLORS } from './WordTooltip'

export interface VocabEntry {
  arabic: string
  plain?: string
  headword?: string
  lemma?: string
  transliteration: string
  english: string
  cefr?: string
  grammatical_case?: GrammaticalCase | null
  pos?: string
  root?: string | null
  entry_type?: 'word' | 'phrase'
}
