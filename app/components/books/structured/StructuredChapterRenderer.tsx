import type { ReactNode } from 'react'
import { items, record, structuredWarning, text, type StructuredChapter } from '@/app/lib/structuredChapter'
import StructuredChapterBlockRenderer from './StructuredChapterBlockRenderer'
import { Answers, ChapterTitle, Practice, References } from './StructuredPractice'
import { Titles, Notice } from './StructuredText'
import styles from './StructuredChapter.module.css'

export function StructuredSection({ value }: { value: unknown }) {
  const section = record(value)
  if (!section || !Array.isArray(section.blocks)) {
    structuredWarning('Section has no readable blocks list.')
    return <Notice>This lesson section could not be displayed.</Notice>
  }
  return <section className={styles.section} data-structured-section={text(section.kind) || 'section'}>
    <Titles value={section} /><div className={styles.blocks}>{section.blocks.map((block, index) => <StructuredChapterBlockRenderer value={block} key={index} />)}</div>
  </section>
}
function ChapterContent({ children }: { children: ReactNode }) {
  return <article className={styles.chapter} dir="ltr" data-structured-chapter>{children}</article>
}

/** Server-renderable pages passed through the existing reader's content slot. */
export function structuredChapterPages(chapter: StructuredChapter): ReactNode[] {
  const sections = chapter.sections.length ? chapter.sections : [null]
  const pages: ReactNode[] = sections.map((section, index) => <ChapterContent key={`section-${index}`}>
    {index === 0 && <ChapterTitle chapter={chapter} />}{section !== null && <StructuredSection value={section} />}
  </ChapterContent>)
  if (items(chapter.activities).length) pages.push(<ChapterContent key="practice"><Practice chapter={chapter} /></ChapterContent>)
  if (items(chapter.answers).length) pages.push(<ChapterContent key="answers"><Answers chapter={chapter} /></ChapterContent>)
  if (items(chapter.references).length) pages.push(<ChapterContent key="references"><References chapter={chapter} /></ChapterContent>)
  return pages
}
export function StructuredChapterDiagnostic({ message }: { message: string }) {
  return <ChapterContent><h2>This chapter needs a content update</h2><Notice>{message}</Notice><p>Please contact ArabicWithM or choose another chapter from All Chapters.</p></ChapterContent>
}
/** Used for complete previews and independent compatibility tests. */
export default function StructuredChapterRenderer({ chapter }: { chapter: StructuredChapter }) {
  return <div>{structuredChapterPages(chapter)}</div>
}
