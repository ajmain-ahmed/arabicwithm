'use client'
import {useWebsiteLocale} from '@/app/components/WebsiteLocaleProvider'

import {UiText} from '@/app/components/WebsiteLocaleProvider'


import { useEffect, useState, type ReactNode } from 'react'
import { record, text, type StructuredChapter, type StructuredRecord } from '@/app/lib/structuredChapter'
import { ids, learningStages, masteryIds, records, stageActivities } from '@/app/lib/structuredLearning'
import StructuredActivity from './StructuredActivity'
import styles from './StructuredChapter.module.css'

type Progress = { completed: string[]; currentStage: string }
export default function StructuredStage({ chapter, stage, children, remediation }: { chapter: StructuredChapter; stage: StructuredRecord; children: ReactNode; remediation: ReactNode }) {
 const {t:awmT}=useWebsiteLocale()

  const path = record(chapter.learning_path) ?? {}, stages = learningStages(chapter), stageId = text(stage.id)
  const storageKey = `awm-structured:${text(chapter.id)}:${chapter.schema_version}`
  const [progress, setProgress] = useState<Progress>({ completed: [], currentStage: '' })
  const [attempt, setAttempt] = useState(0), [results, setResults] = useState<Record<string, boolean | null>>({}), [submitted, setSubmitted] = useState(false)
  useEffect(() => {
    const read = () => { try { const value = JSON.parse(localStorage.getItem(storageKey) || 'null'); if (record(value) && Array.isArray(value.completed)) setProgress({ completed: ids(value.completed), currentStage: text(value.currentStage) }) } catch { /* Local storage is optional. */ } }
    read(); window.addEventListener('awm-structured-progress', read)
    return () => window.removeEventListener('awm-structured-progress', read)
  }, [storageKey])
  const required = typeof stage.unlock_after === 'string' ? [stage.unlock_after] : ids(stage.unlock_after)
  const locked = required.some(id => stages.some(s => s.id === id) && !progress.completed.includes(id))
  const activities = stageActivities(chapter, stage), mastery = masteryIds(chapter, stage)
  const answerMap = new Map(records(chapter.answers).map(a => [text(a.question_id), a]))
  const percent = typeof path.passing_percent === 'number' ? path.passing_percent : null
  const score = mastery.length ? mastery.filter(id => results[id] === true).length / mastery.length * 100 : 0
  const finished = mastery.length > 0 && mastery.every(id => typeof results[id] === 'boolean')
  const passed = finished && percent !== null && score >= percent
  function save(completed: string[]) {
    const next = { completed, currentStage: stageId }; setProgress(next)
    try { localStorage.setItem(storageKey, JSON.stringify(next)); window.dispatchEvent(new Event('awm-structured-progress')) } catch { /* Ephemeral progress remains available. */ }
  }
  useEffect(() => { if (!locked) { try { const old = JSON.parse(localStorage.getItem(storageKey) || '{}'); localStorage.setItem(storageKey, JSON.stringify({ ...old, currentStage: stageId })) } catch { /* Optional progress. */ } } }, [locked, stageId, storageKey])
  return <section aria-label={text(stage.title_en) || 'Learning stage'}>
    <header><p className={styles.eyebrow}><UiText>{"Stage"}</UiText>{' '}{stages.findIndex(s => s.id === stage.id) + 1}{' '}<UiText>{"of"}</UiText>{' '}{stages.length}{progress.completed.includes(stageId) ? awmT(" · Complete") : ''}</p>{text(stage.title_ar)&&<h2 lang="ar" dir="rtl">{text(stage.title_ar)}</h2>}{text(stage.title_en)&&<h2>{text(stage.title_en)}</h2>}<p>{text(stage.application_en)}</p></header>
    {locked ? <p className={styles.notice}><UiText>{"Complete"}</UiText>{' '}{required.map(id => text(stages.find(s => s.id === id)?.title_en)).filter(Boolean).join(', ')}{' '}<UiText>{"to unlock this stage. Use the Reader’s previous-page control to return."}</UiText></p> : <>
      {children}
      {['practice', 'mastery'].map(phase => {
        const list = activities.filter(a => mastery.includes(text(a.id)) === (phase === 'mastery'))
        return list.length ? <section className={styles.phase} aria-label={phase === 'mastery' ? awmT("Mastery Check") : awmT("Guided Practice")} key={phase}><h3>{phase === 'mastery' ? awmT("Mastery Check") : awmT("Guided Practice")}</h3>{phase === 'practice' && <p><UiText>{"Practice feedback does not count against mastery."}</UiText></p>}<div className={styles.blocks}>{list.map(a => <StructuredActivity key={`${text(a.id)}:${attempt}`} activity={{ ...a, phase }} answer={answerMap.get(text(a.id))} attempt={attempt} onResult={result => { setResults(old => ({ ...old, [text(a.id)]: result })); setSubmitted(false) }} />)}</div></section> : null
      })}
      {!!mastery.length && <div className={styles.feedback}><p>{percent !== null ? `Mastery target: ${percent}%. Check every mastery answer before submitting.` : awmT("This stage needs an authored passing percentage before automatic mastery can be awarded.")}</p><button type="button" disabled={!finished || percent === null} onClick={() => { setSubmitted(true); if (passed) save([...new Set([...progress.completed, stageId])]) }}><UiText>{"Submit mastery check"}</UiText></button>{submitted && <p role="status">{Math.round(score)}% · {passed ? awmT("Stage complete. Continue to the next Reader page.") : awmT("Review the explanations and lesson, then retry.")}</p>}<button type="button" onClick={() => { setAttempt(n => n + 1); setResults({}); setSubmitted(false) }}><UiText>{"Retry activities"}</UiText></button><p className={styles.caption}>{text(path.retry_policy)}</p></div>}
      {remediation && <details className={styles.phase}><summary><UiText>{"Review the lesson"}</UiText></summary>{remediation}</details>}
    </>}
  </section>
}
