import {ArrowBack,OpenInNew} from '@mui/icons-material'
import {Box,Button,Container,Paper,Typography} from '@mui/material'
import type {ReactNode} from 'react'
import type {PuzzleVocabularySource} from '@/app/lib/transcriptPuzzles'
export default function WordSearchShell({source,controls,children}:{source:PuzzleVocabularySource|null;controls?:ReactNode;children:ReactNode}){
 return <Box component="main" sx={{minHeight:'100vh',bgcolor:'background.default',pt:{xs:2,md:3},pb:'var(--awm-mobile-bottom-clearance)'}}><Container maxWidth="xl">
  {controls&&<Box component="section"><Typography component="h2" sx={{fontFamily:'var(--font-heading)',fontSize:28,mb:1.5}}>Choose your difficulty</Typography>{controls}</Box>}
  {children}
  {source&&<Paper data-word-search-source elevation={0} sx={{mt:3,p:2,border:'1px solid',borderColor:'divider',borderRadius:'12px',display:'flex',flexWrap:'wrap',alignItems:'center',justifyContent:'space-between',gap:1}}><Box><Typography sx={{fontSize:12,color:'text.secondary'}}>Based on a real {source.type==='book'?'book chapter':'transcript'}</Typography><Typography sx={{fontFamily:'var(--font-heading)',fontSize:20}}>{source.title} · {source.subtitle}</Typography></Box><Button href={source.href} color="secondary" endIcon={<OpenInNew/>}>Open {source.type==='book'?'chapter':'episode'}</Button></Paper>}
  <Button href="/" color="secondary" startIcon={<ArrowBack/>} sx={{mt:2,textTransform:'none'}}>Back Home</Button>
 </Container></Box>
}
