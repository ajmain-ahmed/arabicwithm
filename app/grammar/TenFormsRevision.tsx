'use client'
import {useState} from 'react'
import {Box,Button,Paper,Typography} from '@mui/material'
import curriculum from './mobile-curriculum.json'
import {roman} from './models'

export default function TenFormsRevision() {
 const [order,setOrder]=useState<number[]>([]),[index,setIndex]=useState(0),[revealed,setRevealed]=useState(false)
 function start(shuffle:boolean){const next=Array.from({length:10},(_,i)=>i);if(shuffle)for(let i=9;i>0;i--){const j=Math.floor(Math.random()*(i+1));[next[i],next[j]]=[next[j],next[i]]}setOrder(next);setIndex(0);setRevealed(false)}
 const f=curriculum.forms[order[index]]
 return <Paper variant="outlined" sx={{p:{xs:2,sm:3},borderRadius:3}}><Typography variant="h5" dir="rtl">مُرَاجَعَةُ الْأَوْزَانِ</Typography><Typography variant="h6">Revise the Ten Forms</Typography>
 {!order.length ? <Box sx={{display:'flex',gap:2,my:3}}><Button variant="contained" onClick={()=>start(false)}>In Order</Button><Button variant="outlined" onClick={()=>start(true)}>Shuffle</Button></Box> : <>
 <Typography sx={{my:2}}>{index+1} / 10 · Form {roman[order[index]]}</Typography><Typography>Recall the pattern, characteristic features and an example.</Typography>
 {revealed ? <><Typography dir="rtl" sx={{fontFamily:'var(--font-serif)',fontSize:30,lineHeight:2}}>{f.past} · {f.present}</Typography><Typography dir="rtl" sx={{fontSize:25}}>{f.masdar}</Typography><Typography>{f.tendency}</Typography><Typography dir="rtl" sx={{fontSize:28,my:2}}>{f.example?.arabic}</Typography><Typography>{f.example?.meaning}</Typography></> : <Button variant="contained" sx={{my:3,minHeight:48}} onClick={()=>setRevealed(true)}>Reveal answer</Button>}
 <Box sx={{display:'flex',gap:1,flexWrap:'wrap',mt:2}}><Button disabled={index===0} onClick={()=>{setIndex(i=>i-1);setRevealed(false)}}>Previous Form</Button><Button disabled={index===9} onClick={()=>{setIndex(i=>i+1);setRevealed(false)}}>Next Form</Button><Button onClick={()=>{setIndex(0);setRevealed(false)}}>Restart</Button><Button onClick={()=>{setOrder([]);setRevealed(false)}}>Choose order</Button></Box>
 </>}
 </Paper>
}
