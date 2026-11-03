'use client'
import {useEffect,useRef,useState} from 'react'
import {Alert,Box,Button,LinearProgress,Paper,Typography} from '@mui/material'
import {loadGrammar} from '@/app/actions/grammar'
import {AnswerArea,Arabic,English,Instruction,useGrammarDisplay} from './GrammarUI'
import {preparedQuestions,variedPractice,type PreparedQuestion,type RecentQuestion} from './preparedQuestions'
import useCorrectAutoAdvance from './useCorrectAutoAdvance'

export default function PreparedActivity({activity}:{activity:'patterns'|'context'}){
 const [questions,setQuestions]=useState<PreparedQuestion[]>([]),[busy,setBusy]=useState(true),[error,setError]=useState(''),[warning,setWarning]=useState(''),[round,setRound]=useState(0),[index,setIndex]=useState(0),[result,setResult]=useState<boolean|null>(null)
 const recent=useRef<RecentQuestion[]>([]),text=useGrammarDisplay(),question=questions[index]
 useEffect(()=>{
  let active=true
  const install=(questions:PreparedQuestion[])=>{setQuestions(variedPractice(questions,recent.current));setIndex(0);setResult(null);setBusy(false)}
  void loadGrammar(activity==='context'?'sarf':'word_pattern','sentence_role',crypto.randomUUID()).then(data=>{
   if(!active)return;setError('');setWarning('');install(preparedQuestions(data.prepared,activity))
  }).catch(()=>{
   if(!active)return
   if(activity==='patterns'){setWarning('Library examples are unavailable. You can continue with reviewed foundations.');install(preparedQuestions([],activity))}
   else{setError('Unable to load sentences. Please try again.');setBusy(false)}
  })
  return()=>{active=false}
 },[activity,round])
 useEffect(()=>{if(question)recent.current=[...recent.current,question].slice(-50)},[question])
 function next(){setResult(null);setIndex(i=>i+1)}
 function restart(){setBusy(true);setRound(i=>i+1)}
 useCorrectAutoAdvance(result===true,next,question?.note??'')
 if(busy)return <LinearProgress/>
 if(error)return <Alert action={<Button onClick={restart}>Try again</Button>}>{error}</Alert>
 if(!question)return <Paper sx={{p:3,textAlign:'center'}}><Typography>Activity completed</Typography><Button onClick={restart}>More practice</Button></Paper>
 return <>
 {warning&&<Alert severity="info" sx={{mb:2}}>{warning}</Alert>}
 <Paper data-prepared-question={question.id} data-word-pattern-workspace={activity==='patterns'?true:undefined} variant="outlined" sx={{p:{xs:2,sm:3},borderRadius:3,textAlign:'center',maxWidth:'100%',mx:'auto',...(activity==='patterns'?{resize:{xs:'none',md:'both'},overflow:'auto',width:{xs:'100%',md:'80%'},minWidth:{md:500}}:{})}}>
  <Typography sx={{fontSize:13,mb:1}}>{index+1} / {questions.length} · {question.sourceLabel}</Typography>
  {question.targetIndex===undefined?<Arabic>{question.arabic}</Arabic>:<Box dir="rtl" sx={{display:'flex',flexWrap:'wrap',justifyContent:'center',gap:1}}>{question.arabic.split(/\s+/).map((word,i)=><Typography key={i} lang="ar" dir="rtl" data-grammar-arabic sx={{fontFamily:'var(--font-serif)',fontSize:'var(--grammar-arabic-size)',lineHeight:1.9,bgcolor:i===question.targetIndex?'color-mix(in srgb,var(--awm-gold) 20%,transparent)':undefined,borderRadius:1}}>{text(word)}</Typography>)}</Box>}
  <English>{question.english}</English>
  {question.verb&&<Arabic>{question.verb.root}</Arabic>}
  <Instruction>{activity==='context'?'Which verb form is highlighted?':question.targetIndex===undefined?'Which word pattern is this?':'Which word pattern is highlighted?'}</Instruction>
  <AnswerArea result={result===null?undefined:{correct:result,answer:activity==='patterns'?<span lang="ar" dir="rtl">{text(question.answerLabel)}</span>:question.answerLabel,explanation:text(question.note),next}}>
   <Box data-grammar-answers sx={{display:'grid',gridTemplateColumns:'repeat(2,minmax(0,1fr))',gap:1}}>{question.choices.map(choice=><Button key={choice.id} variant="outlined" disabled={result!==null} sx={{minHeight:52,minWidth:0,overflowWrap:'anywhere',fontFamily:activity==='patterns'?'var(--font-serif)':undefined,'&&':{fontSize:activity==='patterns'?'var(--grammar-arabic-size)':'var(--grammar-english-size)'}}} onClick={()=>setResult(choice.id===question.answer)}>{text(choice.label)}</Button>)}</Box>
  </AnswerArea>
 </Paper>
 </>
}
