import { items, record, text, safeReferenceUrl, type StructuredChapter, type StructuredRecord } from '@/app/lib/structuredChapter'
import { TextPair, Label } from './StructuredText'
import styles from './StructuredChapter.module.css'

export function Practice({ chapter }: { chapter: StructuredChapter }) {
  return <section aria-label="Practice"><h2>Practice</h2><div className={styles.blocks}>
    {items(chapter.activities).map((value, index) => {
      const activity = record(value)
      if (!activity) return null
      const choices = items(activity.choices), id = text(activity.id) || String(index + 1)
      const inputName = `practice-${text(chapter.id)}-${id}`
      return <fieldset className={styles.activity} id={`question-${id}`} key={index}>
        <legend>Question {index + 1}{text(activity.level) ? ` / ${text(activity.level)}` : ''}</legend>
        <TextPair value={activity} arabic="prompt_ar" english="prompt_en" />
        <TextPair value={activity} arabic="stimulus_ar" english="stimulus_en" />
        {!!choices.length && <div className={styles.choices}>{choices.map((choice, choiceIndex) => <label className={styles.choice} key={choiceIndex}>
          <input type="radio" name={inputName} value={text(record(choice)?.id) || String(choiceIndex)} /><div><Label value={choice} /></div>
        </label>)}</div>}
        {(!choices.length || activity.response_mode !== 'single-choice') && <label className={styles.response}>
          {activity.response_mode === 'annotation' ? 'Your analysis / notes' : 'Your response'}
          <textarea name={`${inputName}-notes`} dir="auto" rows={activity.response_mode === 'long-text' ? 5 : 3} />
        </label>}
      </fieldset>
    })}
  </div></section>
}
function AnswerList({ value, heading }: { value: unknown; heading: string }) {
  const list = items(value)
  return list.length ? <div><h4>{heading}</h4><ul>{list.map((entry, index) => <li key={index}><Label value={entry} /></li>)}</ul></div> : null
}
export function Answers({ chapter }: { chapter: StructuredChapter }) {
  const activities = items(chapter.activities).map(record)
  return <section aria-label="Answers"><h2>Answers / Check your answers</h2>
    <details><summary>Show answers</summary><div className={styles.blocks}>
      {items(chapter.answers).map((value, index) => {
        const answer = record(value)
        if (!answer) return null
        const questionId = text(answer.question_id), activityIndex = activities.findIndex(activity => activity && text(activity.id) === questionId && questionId !== '')
        const activity = activities[activityIndex]
        return <div key={index} className={styles.card} data-answer-for={questionId || undefined}>
          <h3>{activityIndex >= 0 ? `Question ${activityIndex + 1}` : 'Additional answer'}</h3>
          {activity && <TextPair value={activity} arabic="prompt_ar" english="prompt_en" />}
          <TextPair value={answer} arabic="answer_ar" english="answer_en" />
          <TextPair value={answer} arabic="explanation_ar" english="explanation_en" />
          <AnswerList value={answer.acceptable_alternatives} heading="Acceptable alternatives" />
          <AnswerList value={answer.assessment_criteria} heading="Assessment criteria" />
        </div>
      })}
    </div></details>
  </section>
}
export function References({ chapter }: { chapter: StructuredChapter }) {
  return <section aria-label="References"><h2>References</h2><ol className={styles.references}>
    {items(chapter.references).map((value, index) => {
      const reference = record(value)
      if (!reference) return null
      const url = safeReferenceUrl(reference.url), title = text(reference.title) || 'Reference'
      return <li key={index} dir="auto">{url ? <a href={url} target="_blank" rel="noopener noreferrer">{title}</a> : <span>{title}</span>}
        {['author', 'locator', 'publisher', 'source_type', 'verification_note'].map(key => text(reference[key]) ? <p className={styles.caption} key={key} dir="auto">{text(reference[key])}</p> : null)}
      </li>
    })}
  </ol></section>
}
export function ChapterTitle({ chapter }: { chapter: StructuredRecord }) {
  return <header className={styles.title}>
    {typeof chapter.chapter_number === 'number' && Number.isFinite(chapter.chapter_number) && <p className={styles.eyebrow}>Chapter {chapter.chapter_number}</p>}
    {text(chapter.title_ar) && <h2 lang="ar" dir="rtl">{text(chapter.title_ar)}</h2>}
    {text(chapter.title_en) && <h2 lang="en" dir="ltr">{text(chapter.title_en)}</h2>}
  </header>
}
