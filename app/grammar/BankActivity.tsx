'use client'
import {useWebsiteLocale} from '@/app/components/WebsiteLocaleProvider'

import {UiText} from '@/app/components/WebsiteLocaleProvider'


import { useEffect, useRef, useState } from 'react'
import { Alert, Box, Button, FormControl, InputLabel, LinearProgress, MenuItem, Select } from '@mui/material'
import { loadGrammarBank } from '@/app/actions/grammar'
import { boundedRead } from '@/app/lib/readRecovery'
import type { Mode } from './models'
import { practiceBatch, type BankQuestion } from './questionBank'
import WebsiteActivity from './WebsiteActivity'
import {ActivityControls,AutoNextControl,TashkeelControl} from './GrammarUI'

export default function BankActivity({ mode }: { mode: Mode }) {
 const {t:awmT}=useWebsiteLocale()

  const [questions, setQuestions] = useState<BankQuestion[]>([]), [busy, setBusy] = useState(true), [warning, setWarning] = useState(''), [level, setLevel] = useState(0), [round, setRound] = useState(0)
  const recent = useRef<string[]>([])
  useEffect(() => {
    let active = true
    void boundedRead(loadGrammarBank(mode, crypto.randomUUID(), recent.current, level || null)).then(rows => {
      if (!active) return
      setQuestions(practiceBatch(rows, mode))
      setWarning(''); setBusy(false)
    }).catch(() => { if (active) { setQuestions(practiceBatch([],mode)); setWarning('Uploaded practice is temporarily unavailable. You can continue with reviewed foundations.'); setBusy(false) } })
    return () => { active = false }
  }, [mode, level, round])
  function restart() { setBusy(true); setRound(n => n + 1) }
  function markUsed(q: BankQuestion) {
    if (!q.sentenceHash) return
    recent.current = [...recent.current.filter(id => id !== q.sentenceHash), q.sentenceHash].slice(-200)
  }
  return <Box><ActivityControls><FormControl data-practice-level size="small" sx={{minWidth:145}}><InputLabel id={`${mode}-level`}><UiText>{"Practice level"}</UiText></InputLabel><Select labelId={`${mode}-level`} label={awmT("Practice level")} value={level} inputProps={{ 'aria-label': awmT("Practice level") }} onChange={e => { setBusy(true); setLevel(Number(e.target.value)) }}><MenuItem value={0}><UiText>{"Mixed levels"}</UiText></MenuItem>{['A1','A2','B1','B2','C1','C2'].map((label,i)=><MenuItem key={label} value={i+1}><UiText>{"Through"}</UiText>{' '}{label}</MenuItem>)}</Select></FormControl><AutoNextControl/>{mode==='grammatical_case'&&<TashkeelControl/>}</ActivityControls>
    {warning && <Alert severity="info" sx={{ mb: 2 }}>{warning}<Button onClick={restart}><UiText>{"Retry uploaded sentences"}</UiText></Button></Alert>}
    {busy ? <LinearProgress /> : <WebsiteActivity key={`${mode}-${level}-${round}`} activity={mode} suppliedQuestions={questions} onUsed={markUsed} onRestart={restart} />}
  </Box>
}
