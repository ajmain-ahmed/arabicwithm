'use client'
import { useState } from 'react'
import { Box, Button, Paper, TextField, Typography } from '@mui/material'
import { websiteQuestions, caseOptions, correctSpan, matchesAnswer } from './websiteQuestions'

export default function WebsiteActivity({ activity }: { activity: string }) {
  const questions = websiteQuestions.filter(q => q.activity === activity)
  const [index,setIndex]=useState(0),[selected,setSelected]=useState<number[]>([]),[answer,setAnswer]=useState(''),[parts,setParts]=useState(['','','',''])
  const [checked,setChecked]=useState(false),[correct,setCorrect]=useState(false)
  const q=questions[index]
  function reset() { setSelected([]);setAnswer('');setParts(['','','','']);setChecked(false);setCorrect(false) }
  if(!q) return <Paper sx={{p:3}}><Typography>Activity completed</Typography><Button onClick={()=>{setIndex(0);reset()}}>Practise again</Button></Paper>
  function check() {setChecked(true);setCorrect(q.span ? correctSpan(selected,q.span) : q.caseParts ? q.caseParts.every((v,i)=>v===parts[i]) : matchesAnswer(answer,q.answer!))}
  return <Paper variant="outlined" sx={{p:{xs:2,sm:3},borderRadius:3}}><Typography>{index+1} / {questions.length} · Reviewed foundations</Typography>
    <Typography sx={{fontFamily:'var(--font-serif)',fontSize:32,lineHeight:2,textAlign:'center'}} dir="rtl">{q.arabic}</Typography><Typography>{q.english}</Typography>
    <Typography variant="h6" sx={{my:2}}>{q.prompt}</Typography>
    {q.span ? <><Typography>Select every word in the target phrase. Tap again to remove a word.</Typography><Box dir="rtl" sx={{display:'flex',flexWrap:'wrap',gap:1,my:2}}>{q.arabic.split(' ').map((word,i)=><Button key={i} aria-label={`Select ${word}`} aria-pressed={selected.includes(i)} disabled={correct} variant={selected.includes(i)?'contained':'outlined'} sx={{fontSize:25,minHeight:48,fontFamily:'var(--font-serif)'}} onClick={()=>{setSelected(old=>old.includes(i)?old.filter(n=>n!==i):[...old,i].sort((a,b)=>a-b));setChecked(false)}}>{word}</Button>)}</Box></>
    : q.caseParts ? <Box sx={{display:'grid',gridTemplateColumns:{xs:'1fr',sm:'1fr 1fr'},gap:2}}>{['Case or state','Case sign or built ending','Sign classification','Grammatical reason'].map((label,i)=><TextField key={label} select label={label} value={parts[i]} disabled={correct} slotProps={{select:{native:true}}} onChange={e=>{setParts(old=>old.map((v,n)=>n===i?e.target.value:v));setChecked(false)}}><option value=""/>{caseOptions[i].map(option=><option key={option} value={option}>{option}</option>)}</TextField>)}</Box>
    : q.choices ? <Box sx={{display:'grid',gap:1}}>{q.choices.map(choice=><Button key={choice} disabled={correct} variant={answer===choice?'contained':'outlined'} sx={{minHeight:48,textTransform:'none'}} onClick={()=>{setAnswer(choice);setChecked(false)}}>{choice}</Button>)}</Box>
    : <TextField fullWidth label="Your Arabic answer" value={answer} disabled={correct} slotProps={{htmlInput:{dir:'rtl'}}} onChange={e=>{setAnswer(e.target.value);setChecked(false)}}/>}
    <Button variant="contained" disabled={correct || (q.span ? !selected.length : q.caseParts ? parts.some(v=>!v) : !answer.trim())} sx={{my:2,minHeight:48}} onClick={check}>Check Answer</Button>
    {checked && <Box role="status"><Typography color={correct?'success.main':'error.main'}>{correct?'Correct':'Try again. Your selection does not match all parts of the question.'}</Typography>{correct ? <Typography>{q.explanation}</Typography> : <Typography>{q.span?'Include the complete grammatical unit, without neighbouring words.':q.caseParts?'Consider the word’s function, number and final radical; built endings are not case signs.':'Compare the target word’s radicals, vowels and affixes. Check the requested tense or analysis.'}</Typography>}</Box>}
    {checked && !correct && <Button onClick={reset}>Retry</Button>}<Button disabled={!checked} sx={{minHeight:48}} onClick={()=>{setIndex(i=>i+1);reset()}}>Next Question</Button>
  </Paper>
}
