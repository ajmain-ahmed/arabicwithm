import { record, text, structuredWarning } from '@/app/lib/structuredChapter'
import styles from './StructuredChapter.module.css'

export function TextPair({ value, arabic = 'text_ar', english = 'text_en' }: { value: Record<string, unknown>; arabic?: string; english?: string }) {
  return <>{text(value[arabic]) && <p lang="ar" dir="rtl">{text(value[arabic])}</p>}{text(value[english]) && <p lang="en" dir="ltr">{text(value[english])}</p>}</>
}
export function Label({ value }: { value: unknown }) {
  if (typeof value === 'string') return <span dir="auto">{value}</span>
  const item = record(value)
  if (!item) return null
  return <><TextPair value={{ text_ar: item.label_ar ?? item.text_ar ?? item.arabic, text_en: item.label_en ?? item.text_en ?? item.english }} />{text(item.label ?? item.text) && <span dir="auto">{text(item.label ?? item.text)}</span>}</>
}
export function Notice({ children }: { children: React.ReactNode }) {
  if (typeof children === 'string') structuredWarning(children)
  return <p className={styles.notice} role="note">{children}</p> }
export function Titles({ value }: { value: Record<string, unknown> }) {
  return <>{text(value.title_ar) && <h3 lang="ar" dir="rtl">{text(value.title_ar)}</h3>}{text(value.title_en) && <h3 lang="en" dir="ltr">{text(value.title_en)}</h3>}</>
}
