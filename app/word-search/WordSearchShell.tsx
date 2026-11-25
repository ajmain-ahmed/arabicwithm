import LocalisedContent from '@/app/components/LocalisedContent'

import {UiText} from '@/app/components/WebsiteLocaleProvider'
import {ArrowBack,OpenInNew} from '@mui/icons-material'
import {Box,Button,Container,Paper,Typography} from '@mui/material'
import type {ReactNode} from 'react'
import type {PuzzleVocabularySource} from '@/app/lib/transcriptPuzzles'
export default function WordSearchShell({source,controls,children,embedded=false}:{source:PuzzleVocabularySource|null;controls?:ReactNode;children:ReactNode;embedded?:boolean}){
 return <Box component="div" sx={{minHeight:embedded?0:'100vh',bgcolor:'background.default',pt:embedded?0:{xs:2,md:3},pb:embedded?0:'var(--awm-mobile-bottom-clearance)'}}><Container maxWidth="xl" disableGutters={embedded}>
  {controls&&<Box component="section"><Typography component="h2" sx={{fontFamily:'var(--font-heading)',fontSize:28,mb:1.5}}><UiText>{"Choose your difficulty"}</UiText></Typography>{controls}</Box>}
  {children}
  {source&&<Paper data-word-search-source elevation={0} sx={{mt:3,p:2,border:'1px solid',borderColor:'divider',borderRadius:'12px',display:'flex',flexWrap:'wrap',alignItems:'center',justifyContent:'space-between',gap:1}}><Box><Typography sx={{fontSize:12,color:'text.secondary'}}><UiText>{source.type==='book'?'Based on a real book chapter':'Based on a real transcript'}</UiText></Typography><Typography sx={{fontFamily:'var(--font-heading)',fontSize:20}}><LocalisedContent original={source.title} arabic={source.titleAr}/> · <LocalisedContent original={source.subtitle} arabic={source.subtitleAr}/></Typography></Box><Button href={source.href} color="secondary" endIcon={<OpenInNew/>}><UiText>{source.type==='book'?'Open chapter':'Open episode'}</UiText></Button></Paper>}
  {!embedded&&<Button href="/" color="secondary" startIcon={<ArrowBack/>} sx={{mt:2,textTransform:'none'}}><UiText>{"Back Home"}</UiText></Button>}
 </Container></Box>
}
