'use client'
import {useState} from 'react'
import {Box,Button,Paper} from '@mui/material'
import curriculum from './mobile-curriculum.json'
import {roman} from './models'
import {Arabic,English,Instruction} from './GrammarUI'

export default function TenFormsRevision() {
 const [order,setOrder]=useState<number[]>([]),[index,setIndex]=useState(0),[revealed,setRevealed]=useState(false)
 const [mode,setMode]=useState<'order'|'shuffle'>('order')
 function start(shuffle:boolean){const next=Array.from({length:10},(_,i)=>i);if(shuffle)for(let i=9;i>0;i--){const j=Math.floor(Math.random()*(i+1));[next[i],next[j]]=[next[j],next[i]]}setOrder(next);setIndex(0);setRevealed(false)}
 const f=curriculum.forms[order[index]]
 return <Paper variant="outlined" sx={{p:{xs:2,sm:4},borderRadius:3,textAlign:'center',maxWidth:1100,mx:'auto'}}><Arabic>مُرَاجَعَةُ الْأَوْزَانِ</Arabic><English>Revise the Ten Forms</English>
 {!order.length ? <><Box role="group" aria-label="Revision order" sx={{display:'flex',justifyContent:'center',gap:2,my:3}}><Button variant={mode==='order'?'contained':'outlined'} aria-pressed={mode==='order'} onClick={()=>setMode('order')}>In Order</Button><Button variant={mode==='shuffle'?'contained':'outlined'} aria-pressed={mode==='shuffle'} onClick={()=>setMode('shuffle')}>Shuffle</Button></Box><Button variant="contained" sx={{px:7,minHeight:52,fontSize:18,borderRadius:'999px',bgcolor:'var(--awm-forest)',mb:2}} onClick={()=>start(mode==='shuffle')}>Start</Button></> : <>
 <English>{index+1} / 10 · Form {roman[order[index]]}</English><Instruction>Recall the pattern, characteristic features and an example.</Instruction>
 {revealed ? <><Arabic>{`${f.past} · ${f.present}`}</Arabic><Arabic>{f.masdar}</Arabic><English>{f.tendency}</English><Arabic>{f.example?.arabic ?? ''}</Arabic><English>{f.example?.meaning}</English></> : <Button variant="contained" sx={{my:3,minHeight:48}} onClick={()=>setRevealed(true)}>Reveal answer</Button>}
 <Box sx={{display:'flex',justifyContent:'center',gap:1,flexWrap:'wrap',mt:2}}><Button disabled={index===0} onClick={()=>{setIndex(i=>i-1);setRevealed(false)}}>Previous Form</Button><Button disabled={index===9} onClick={()=>{setIndex(i=>i+1);setRevealed(false)}}>Next Form</Button><Button onClick={()=>{setIndex(0);setRevealed(false)}}>Restart</Button><Button onClick={()=>{setOrder([]);setRevealed(false)}}>Choose order</Button></Box>
 </>}
 </Paper>
}
