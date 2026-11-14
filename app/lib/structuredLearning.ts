import { items, record, text, type StructuredChapter, type StructuredRecord } from '@/app/lib/structuredChapter'

export const records = (value: unknown): StructuredRecord[] => items(value).flatMap(value => record(value) ? [record(value)!] : [])
export const ids = (value: unknown): string[] => items(value).filter((value): value is string => typeof value === 'string')
export function learningStages(chapter: StructuredChapter) {
  return record(chapter.learning_path)?.mode === 'sequential-mastery' ? records(record(chapter.learning_path)?.stages) : []
}
export function stageActivities(chapter: StructuredChapter, stage: StructuredRecord) {
  const all = records(chapter.activities), listed = new Set([...ids(stage.activity_ids), ...ids(stage.mastery_activity_ids)])
  return all.filter(activity => listed.has(text(activity.id)) || activity.stage_id === stage.id)
}
export function masteryIds(chapter: StructuredChapter, stage: StructuredRecord) {
  return Array.isArray(stage.mastery_activity_ids) ? ids(stage.mastery_activity_ids) : stageActivities(chapter, stage).filter(a => a.phase === 'mastery').map(a => text(a.id))
}
/** Fixed seed per attempt: stable across renders and server/client hydration. */
export function shuffled<T>(values: T[], seed: string): T[] {
  let state = 2166136261
  for (const char of seed) state = Math.imul(state ^ char.charCodeAt(0), 16777619) >>> 0
  const result = [...values]
  for (let i = result.length - 1; i > 0; i--) {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0
    const j = state % (i + 1); [result[i], result[j]] = [result[j], result[i]]
  }
  return result
}
export type ActivityResponse = { choices: string[]; fields: Record<string, string>; order: string[] }
export function checkActivity(activity: StructuredRecord, answer: StructuredRecord | undefined, response: ActivityResponse): boolean | null {
  const interaction = record(activity.interaction)
  if (interaction?.grading !== 'automatic' || !answer) return null
  const kind = text(interaction.kind)
  if (kind === 'single-choice' || kind === 'multiple-select') {
    const expected = ids(answer.correct_choice_ids)
    return expected.length ? expected.length === response.choices.length && expected.every(id => response.choices.includes(id)) : null
  }
  if (kind === 'ordering') {
    const expected = ids(answer.correct_order)
    return expected.length ? expected.length === response.order.length && expected.every((id, i) => response.order[i] === id) : null
  }
  const expected = record(answer[kind === 'matching' ? 'correct_pairs' : kind === 'classification' ? 'correct_categories' : kind === 'fill-blank' || kind === 'short-text' ? 'correct_fields' : ''])
  if (!expected || !Object.keys(expected).length) return null
  const ignoreDiacritics = interaction.sensitive_to_diacritics === false || (interaction.sensitive_to_diacritics !== true && /ignore optional tashk|ignore.*diacritic/i.test(text(answer.normalisation_hint)))
  const normalize = (value: string) => {
    const result = value.normalize('NFC').trim()
    return ignoreDiacritics ? result.replace(/[\u0610-\u061a\u064b-\u065f\u0670\u06d6-\u06ed]/g, '') : result
  }
  return Object.entries(expected).every(([id, value]) => {
    const accepted = Array.isArray(value) ? value : [value]
    return accepted.some(item => typeof item === 'string' && normalize(response.fields[id] ?? '') === normalize(item))
  })
}
export function structuredLearningWarnings(chapter: StructuredChapter): string[] {
  const warnings: string[] = [], stages = learningStages(chapter)
  const path = record(chapter.learning_path)
  if (chapter.learning_path !== undefined && !path) warnings.push('The learning path must be an object.')
  if (path?.mode === 'sequential-mastery' && !stages.length) warnings.push('The sequential learning path has no readable stages.')
  if (stages.length && (typeof path?.passing_percent !== 'number' || !Number.isFinite(path.passing_percent) || path.passing_percent < 0 || path.passing_percent > 100)) warnings.push('Mastery needs an authored passing_percent between 0 and 100.')
  const sections = new Set(records(chapter.sections).map(s => text(s.id))), activities = new Set(records(chapter.activities).map(a => text(a.id))), stageIds = new Set(stages.map(s => text(s.id)))
  for (const stage of stages) {
    for (const id of [...ids(stage.section_ids), ...(text(stage.remediation_section_id) ? [text(stage.remediation_section_id)] : [])]) if (!sections.has(id)) warnings.push(`Stage ${text(stage.id)} references missing section ${id}.`)
    for (const id of [...ids(stage.activity_ids), ...ids(stage.mastery_activity_ids)]) if (!activities.has(id)) warnings.push(`Stage ${text(stage.id)} references missing activity ${id}.`)
    for (const id of typeof stage.unlock_after === 'string' ? [stage.unlock_after] : ids(stage.unlock_after)) if (!stageIds.has(id)) warnings.push(`Stage ${text(stage.id)} references missing prerequisite ${id}.`)
  }
  for (const answer of records(chapter.answers)) if (text(answer.question_id) && !activities.has(text(answer.question_id))) warnings.push(`Answer references missing activity ${text(answer.question_id)}.`)
  for (const activity of records(chapter.activities)) if (stages.length && text(activity.stage_id) && !stageIds.has(text(activity.stage_id))) warnings.push(`Activity ${text(activity.id)} references missing stage ${text(activity.stage_id)}.`)
  return warnings
}
