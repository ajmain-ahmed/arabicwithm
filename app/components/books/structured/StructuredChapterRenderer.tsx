
import {UiText} from '@/app/components/WebsiteLocaleProvider'
import type { ReactNode } from 'react'
import { items, record, structuredWarning, text, type StructuredChapter } from '@/app/lib/structuredChapter'
import StructuredChapterBlockRenderer from './StructuredChapterBlockRenderer'
import { Answers, ChapterTitle, Practice, References } from './StructuredPractice'
import { Titles, Notice } from './StructuredText'
import styles from './StructuredChapter.module.css'
import { ids, learningStages, records } from '@/app/lib/structuredLearning'
import StructuredStage from './StructuredStage'
import StructuredActivity from './StructuredActivity'

export function StructuredSection({ value }: { value: unknown }) {
  const section = record(value)
  if (!section || !Array.isArray(section.blocks)) {
    structuredWarning('Section has no readable blocks list.')
    return <Notice><UiText>{"This lesson section could not be displayed."}</UiText></Notice>
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
  const stages = learningStages(chapter)
  if (stages.length) {
    const assigned = new Set(stages.flatMap(stage => ids(stage.section_ids)))
    const unassigned = records(chapter.sections).filter(section => !assigned.has(text(section.id)))
    const path = record(chapter.learning_path)
    const pages: ReactNode[] = [<ChapterContent key="overview"><ChapterTitle chapter={chapter} />{typeof path?.estimated_active_study_minutes === 'number' && <p className={styles.caption}><UiText>{"Estimated active study:"}</UiText>{' '}{path.estimated_active_study_minutes}{' '}<UiText>{"min"}</UiText></p>}<p>{text(path?.scoring_note_en)}</p>{unassigned.map((section, i) => <StructuredSection key={i} value={section} />)}</ChapterContent>]
    for (const stage of stages) pages.push(<ChapterContent key={text(stage.id)}><StructuredStage chapter={chapter} stage={stage} remediation={chapter.sections.filter(s => record(s)?.id === stage.remediation_section_id).map((s,i) => <StructuredSection key={i} value={s} />)}>{ids(stage.section_ids).map(id => chapter.sections.find(s => record(s)?.id === id)).filter(Boolean).map((s,i) => <StructuredSection key={i} value={s} />)}</StructuredStage></ChapterContent>)
    const assignedActivities = new Set(stages.flatMap(s => [...ids(s.activity_ids), ...ids(s.mastery_activity_ids)]))
    const remaining = records(chapter.activities).filter(a => !assignedActivities.has(text(a.id)) && !stages.some(s => s.id === a.stage_id))
    for (const activity of remaining) pages.push(<ChapterContent key={text(activity.id)}><StructuredActivity activity={activity} answer={records(chapter.answers).find(a => a.question_id === activity.id)} /></ChapterContent>)
    if (items(chapter.references).length) pages.push(<ChapterContent key="references"><References chapter={chapter} /></ChapterContent>)
    return pages
  }
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
  return <ChapterContent><h2><UiText>{"This chapter needs a content update"}</UiText></h2><Notice><UiText>{message}</UiText></Notice><p><UiText>{"Please contact ArabicWithM or choose another chapter from All Chapters."}</UiText></p></ChapterContent>
}
/** Used for complete previews and independent compatibility tests. */
export default function StructuredChapterRenderer({ chapter }: { chapter: StructuredChapter }) {
  return <div>{structuredChapterPages(chapter)}</div>
}
