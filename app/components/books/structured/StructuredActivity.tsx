'use client'
import {UiText,useWebsiteLocale} from '@/app/components/WebsiteLocaleProvider'


import { useId, useState } from 'react'
import { record, text, type StructuredRecord } from '@/app/lib/structuredChapter'
import { checkActivity, records, shuffled, type ActivityResponse } from '@/app/lib/structuredLearning'
import { Label, TextPair } from './StructuredText'
import styles from './StructuredChapter.module.css'

export default function StructuredActivity({ activity, answer, attempt = 0, onResult }: { activity: StructuredRecord; answer?: StructuredRecord; attempt?: number; onResult?: (result: boolean | null) => void }) {
 const {t:awmT}=useWebsiteLocale()

  const name = useId(), interaction = record(activity.interaction) ?? {}, kind = text(interaction.kind)
  const ordered = (values: StructuredRecord[]) => interaction.shuffle === true ? shuffled(values, `${text(activity.id)}:${attempt}`) : values
  const choices = ordered(records(activity.choices)), pairs = records(interaction.pairs), categories = Array.isArray(interaction.categories) ? interaction.categories : []
  const tiles = records(interaction.tiles), fields = records(interaction.fields)
  const [response, setResponse] = useState<ActivityResponse>(() => ({ choices: [], fields: {}, order: ordered(tiles).map(t => text(t.id)) }))
  const [checked, setChecked] = useState(false), [result, setResult] = useState<boolean | null>(null)
  const update = (next: ActivityResponse) => { setResponse(next); setChecked(false); onResult?.(null) }
  const input = (id: string, label: string, placeholder?: string) => <input data-field-id={id} aria-label={label} dir="auto" value={response.fields[id] ?? ''} placeholder={placeholder} onChange={event => update({ ...response, fields: { ...response.fields, [id]: event.target.value } })} />
  const select = (id: string, label: React.ReactNode, options: { id: string; label: React.ReactNode }[]) => <label className={styles.assignment} key={id}><span dir="auto">{label}</span><select data-field-id={id} aria-label={awmT('Answer for {id}',{id})} value={response.fields[id] ?? ''} onChange={e => update({ ...response, fields: { ...response.fields, [id]: e.target.value } })}><option value=""><UiText>{"Choose…"}</UiText></option>{options.map(option => <option value={option.id} key={option.id}>{option.label}</option>)}</select></label>
  const hasResponse = response.choices.length > 0 || Object.values(response.fields).some(v => v.trim()) || response.order.length > 0
  const selfCheck = interaction.grading === 'self-check'
  return <fieldset data-interaction={kind} className={styles.activity} id={`question-${text(activity.id)}`}>
    <legend>{activity.phase === 'mastery' ? awmT("Mastery Check") : awmT("Practice")}{text(activity.level) ? ` · ${text(activity.level)}` : ''}</legend>
    <TextPair value={activity} arabic="prompt_ar" english="prompt_en" />
    {kind === 'fill-blank' ? <div lang="ar" dir="rtl" className={styles.blanks}>{text(activity.stimulus_ar).split(/(\{\{[^{}]+\}\})/g).map((part, i) => {
      const id = part.match(/^\{\{([^{}]+)\}\}$/)?.[1], field = fields.find(f => f.id === id)
      return id ? <span key={i}>{input(id, text(field?.label_en) || 'Your answer', text(field?.placeholder))}</span> : <span key={i}>{part}</span>
    })}{fields.filter(f => !text(activity.stimulus_ar).includes(`{{${text(f.id)}}}`)).map(f => <label key={text(f.id)}>{text(f.label_en)}{input(text(f.id), text(f.label_en) || 'Your answer', text(f.placeholder))}</label>)}</div> : <TextPair value={activity} arabic="stimulus_ar" english="stimulus_en" />}
    {(kind === 'single-choice' || kind === 'multiple-select') && <div className={styles.choices}>{choices.map(choice => {
      const id = text(choice.id)
      return <label className={styles.choice} key={id}><input type={kind === 'single-choice' ? 'radio' : 'checkbox'} name={name} value={id} checked={response.choices.includes(id)} onChange={e => update({ ...response, choices: kind === 'single-choice' ? [id] : e.target.checked ? [...response.choices, id] : response.choices.filter(v => v !== id) })} /><Label value={choice} /></label>
    })}</div>}
    {kind === 'matching' && pairs.map(pair => select(text(pair.id), text(pair.left), ordered(pairs).map(p => ({ id: text(p.id), label: text(p.right) }))))}
    {kind === 'classification' && ordered(records(interaction.items)).map(item => select(text(item.id), <Label value={item} />, categories.map(category => ({ id: typeof category === 'string' ? category : text(record(category)?.id), label: typeof category === 'string' ? category : text(record(category)?.label_en ?? record(category)?.text) }))))}
    {kind === 'ordering' && <ol className={styles.ordering}>{response.order.map((id, i) => <li data-tile-id={id} key={id}><Label value={tiles.find(t => t.id === id)} /><div>{[-1, 1].map(delta => <button type="button" key={delta} aria-label={awmT('Move item {number} {direction}',{number:i+1,direction:awmT(delta<0?'up':'down')})} disabled={i + delta < 0 || i + delta >= response.order.length} onClick={() => {
      const order = [...response.order]; [order[i], order[i + delta]] = [order[i + delta], order[i]]; update({ ...response, order })
    }}>{delta < 0 ? '↑' : '↓'}</button>)}</div></li>)}</ol>}
    {kind === 'short-text' && <label className={styles.response}><UiText>{"Your response"}</UiText><textarea dir="auto" rows={3} value={response.fields[text(fields[0]?.id) || 'f1'] ?? ''} onChange={e => update({ ...response, fields: { [text(fields[0]?.id) || 'f1']: e.target.value } })} /></label>}
    {!['single-choice','multiple-select','matching','classification','fill-blank','ordering','short-text'].includes(kind) && <p><UiText>{"This activity needs a supported interaction before it can be checked."}</UiText></p>}
    {text(activity.hint_en) && <details><summary><UiText>{"Hint"}</UiText></summary><p>{text(activity.hint_en)}</p></details>}
    <button type="button" disabled={!hasResponse} onClick={() => { const grade = checkActivity(activity, answer, response); setResult(grade); setChecked(true); onResult?.(grade) }}>{selfCheck ? awmT("Show model answer") : awmT("Check answer")}</button>
    {checked && <div role="status" className={styles.feedback}><p>{result === true ? awmT("Correct.") : result === false ? awmT("Review your answer and try again.") : selfCheck ? awmT("Self-check: compare your response with the model. This response is not automatically scored.") : awmT("Automatic checking is unavailable for this answer. Review the model; no automatic score is awarded.")}</p>{answer && <><TextPair value={answer} arabic="answer_ar" english="answer_en" /><TextPair value={answer} arabic="explanation_ar" english="explanation_en" /></>}</div>}
  </fieldset>
}
