'use client'
import { useEffect, useState } from 'react'
import { Box, Button, Paper, TextField, Typography } from '@mui/material'
import useCorrectAutoAdvance from './useCorrectAutoAdvance'
import { websiteQuestions, caseOptions, correctSpan, matchesAnswer } from './websiteQuestions'
import { Arabic, English, Feedback, Instruction, useGrammarDisplay } from './GrammarUI'
import type { BankQuestion } from './questionBank'

const caseArabic: Record<string, string> = { Nominative: 'مرفوع', Accusative: 'منصوب', Genitive: 'مجرور', Jussive: 'مجزوم' }

export default function WebsiteActivity({ activity, rootLength = 0, suppliedQuestions, onUsed, onRestart }: { activity: string; rootLength?: number; suppliedQuestions?: BankQuestion[]; onUsed?: (q: BankQuestion) => void; onRestart?: () => void }) {
  const questions: BankQuestion[] = suppliedQuestions ?? websiteQuestions.filter(q => q.activity === activity && (activity !== 'roots' || !rootLength || q.answer?.length === rootLength))
  const [index, setIndex] = useState(0), [selected, setSelected] = useState<number[]>([]), [answer, setAnswer] = useState(''), [parts, setParts] = useState(['','','',''])
  const [checked, setChecked] = useState(false), [correct, setCorrect] = useState(false)
  const text = useGrammarDisplay(), q = questions[index]
  useEffect(() => { if (q) onUsed?.(q) }, [q, onUsed])
  function reset() { setSelected([]); setAnswer(''); setParts(['','','','']); setChecked(false); setCorrect(false) }
  function next() { setIndex(i => i + 1); reset() }
  useCorrectAutoAdvance(checked && correct, next)
  if (!q) return <Paper sx={{ p: 3, textAlign: 'center' }}><Typography>Activity completed</Typography><Button onClick={() => { if (onRestart) onRestart(); else { setIndex(0); reset() } }}>Practise again</Button></Paper>
  function check(value = answer) { setChecked(true); setCorrect(q.span ? correctSpan(selected, q.span) : q.caseParts ? q.caseParts.every((v, i) => v === parts[i]) : matchesAnswer(value, q.answer!)) }
  const correction = q.span ? q.arabic.split(' ').slice(...q.span).join(' ') : q.caseParts ? q.caseParts.join(' · ') : q.answer
  return <Paper data-grammar-question={q.id} variant="outlined" sx={{ p: { xs: 2, sm: 3 }, borderRadius: 3, textAlign: 'center', maxWidth: 1100, mx: 'auto' }}>
    <Typography sx={{ fontSize: 13, mb: 2 }}>{index + 1} / {questions.length} · {q.source ? 'From the library' : 'Reviewed foundations'}</Typography>
    {q.targetIndex === undefined ? <Arabic>{q.arabic}</Arabic> : <Box lang="ar" dir="rtl" data-grammar-arabic sx={{ fontFamily: 'var(--font-serif)', fontSize: 'var(--grammar-arabic-size, 32px)', lineHeight: 1.9 }}>{q.arabic.split(' ').map((word, i) => <Box component="span" key={i} sx={{ bgcolor: i === q.targetIndex ? 'color-mix(in srgb,var(--awm-gold) 22%,transparent)' : undefined, borderRadius: 1, px: .25 }}>{text(word)}{' '}</Box>)}</Box>}
    <English>{q.english}</English><Instruction>{text(q.prompt)}</Instruction>
    {q.span ? <><Typography sx={{ mb: 2, fontSize: 'var(--grammar-english-size, 16px)' }}>{q.span[1] - q.span[0] === 1 ? 'Choose one word.' : 'Select every word in the phrase, then check your answer.'}</Typography><Box dir="rtl" sx={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 1, my: 2 }}>{q.arabic.split(' ').map((word, i) => <Button key={i} aria-label={`Select ${text(word)}`} aria-pressed={selected.includes(i)} disabled={checked} variant={selected.includes(i) ? 'contained' : 'outlined'} sx={{ fontSize: 'var(--grammar-arabic-size, 32px)', minHeight: 52, px: 2, fontFamily: 'var(--font-serif)' }} onClick={() => {
      setSelected(old => old.includes(i) ? old.filter(n => n !== i) : [...old, i].sort((a,b) => a-b))
      if (q.span![1] - q.span![0] === 1) { setChecked(true); setCorrect(i === q.span![0]) }
    }}>{text(word)}</Button>)}</Box></>
    : q.caseParts ? <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>{['Case or state','Case sign or built ending','Sign classification','Grammatical reason'].map((label,i) => <TextField key={label} select label={label} value={parts[i]} disabled={checked} slotProps={{ select: { native: true } }} onChange={e => setParts(old => old.map((v,n) => n === i ? e.target.value : v))}><option value="" />{caseOptions[i].map(option => <option key={option} value={option}>{text(option)}</option>)}</TextField>)}</Box>
    : q.choices ? <Box data-grammar-answers sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gridAutoRows: '1fr', gap: 1.25, maxWidth: 760, mx: 'auto' }}>{q.choices.map(choice => <Button key={choice} aria-pressed={answer===choice} disabled={checked} variant={answer === choice ? 'contained' : 'outlined'} sx={{ width: '100%', height: '100%', minHeight: 64, minWidth: 0, px: 1.25, py: 1.5, borderRadius: 3, flexDirection: 'column', textAlign: 'center', justifyContent: 'center', overflowWrap: 'anywhere', fontSize: 'var(--grammar-english-size, 16px)' }} onClick={() => { setAnswer(choice); check(choice) }}><span>{text(choice)}</span>{activity === 'grammatical_case' && caseArabic[choice] && <Box component="span" lang="ar" dir="rtl" sx={{ fontFamily: 'var(--font-serif)', fontSize: 'var(--grammar-arabic-size, 32px)', lineHeight: 1.4 }}>{caseArabic[choice]}</Box>}</Button>)}</Box>
    : <TextField fullWidth label="Your Arabic answer" value={answer} disabled={checked} slotProps={{ htmlInput: { dir: 'rtl', style: { textAlign: 'center', fontSize: 'var(--grammar-arabic-size, 32px)' } } }} onChange={e => setAnswer(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && answer.trim()) check() }} />}
    {(!q.choices && (!q.span || q.span[1]-q.span[0]>1)) && <Button variant="contained" disabled={checked || (q.span ? !selected.length : q.caseParts ? parts.some(v => !v) : !answer.trim())} sx={{ my: 2 }} onClick={() => check()}>Check Answer</Button>}
    {checked && <Feedback correct={correct} onContinue={next}>{!correct && <Typography sx={{ fontWeight: 600 }}>Correct answer: {text(correction ?? '')}</Typography>}{text(q.explanation)}</Feedback>}
    {checked && !correct && <Button sx={{ mt: 1 }} onClick={reset}>Retry</Button>}
  </Paper>
}
