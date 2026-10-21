'use client'

import { useEffect, useRef, useState } from 'react'
import { Alert, Box, Button, LinearProgress, MenuItem, Select, Typography } from '@mui/material'
import { loadGrammarBank } from '@/app/actions/grammar'
import type { Mode } from './models'
import { practiceBatch, type BankQuestion } from './questionBank'
import WebsiteActivity from './WebsiteActivity'

export default function BankActivity({ mode }: { mode: Mode }) {
  const [questions, setQuestions] = useState<BankQuestion[]>([]), [busy, setBusy] = useState(true), [warning, setWarning] = useState(''), [level, setLevel] = useState(0), [round, setRound] = useState(0)
  const recent = useRef<string[]>([])
  useEffect(() => {
    let active = true
    void loadGrammarBank(mode, crypto.randomUUID(), recent.current, level || null).then(rows => {
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
  return <Box><Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 1, mb: 2 }}><Typography>Practice level</Typography><Select size="small" value={level} inputProps={{ 'aria-label': 'Practice level' }} onChange={e => { setBusy(true); setLevel(Number(e.target.value)) }}><MenuItem value={0}>Mixed levels</MenuItem>{['A1','A2','B1','B2','C1','C2'].map((label,i)=><MenuItem key={label} value={i+1}>Through {label}</MenuItem>)}</Select></Box>
    {warning && <Alert severity="info" sx={{ mb: 2 }}>{warning}<Button onClick={restart}>Retry uploaded sentences</Button></Alert>}
    {busy ? <LinearProgress /> : <WebsiteActivity key={`${mode}-${level}-${round}`} activity={mode} suppliedQuestions={questions} onUsed={markUsed} onRestart={restart} />}
  </Box>
}
