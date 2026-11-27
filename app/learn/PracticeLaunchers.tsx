'use client'
import {useRef,useState,type ComponentType} from 'react'
import {Alert,Box,Button,CircularProgress,Container,Paper,Typography} from '@mui/material'
import {AccountTreeOutlined,GridOnRounded,PsychologyOutlined} from '@mui/icons-material'
import {UiText} from '@/app/components/WebsiteLocaleProvider'
import LearnNavigationTiles from './LearnNavigationTiles'

const activities=[
 {id:'puzzle',title:'Word Search',description:'Find hidden Arabic words and build your vocabulary.',Icon:GridOnRounded,load:()=>import('./PracticeActivities').then(m=>m.PuzzleActivity)},
 {id:'grammar',title:'Grammar Practice',description:'Challenge yourself with a random grammar activity.',Icon:AccountTreeOutlined,load:()=>import('./GrammarPractice').then(m=>m.GrammarActivity)},
 {id:'memory',title:'Memory Practice',description:'Revise vocabulary from a random episode or short.',Icon:PsychologyOutlined,load:()=>import('./PracticeActivities').then(m=>m.MemoryActivity)},
] as const
function PracticeCard({activity}:{activity:typeof activities[number]}){
 const [Engine,setEngine]=useState<ComponentType<{onClose?:()=>void}>|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState('')
 const pending=useRef(false),generation=useRef(0)
 const start=async()=>{
  if(pending.current||Engine)return
  pending.current=true;const request=++generation.current;setBusy(true);setError('')
  try{const component=await activity.load();if(request===generation.current)setEngine(()=>component as ComponentType<{onClose?:()=>void}>)}
  catch{if(request===generation.current)setError('This activity could not load. Please retry.')}
  finally{if(request===generation.current){pending.current=false;setBusy(false)}}
 }
 const close=()=>{generation.current++;pending.current=false;setBusy(false);setEngine(null);setError('')}
 return <Paper component="section" aria-label={`${activity.title} practice card`} data-practice-launcher={activity.id} variant="outlined" sx={{p:{xs:1.75,sm:2.5},minWidth:0,borderRadius:'12px',display:'flex',flexDirection:'column',gap:1.25,...(Engine?{gridColumn:'1 / -1'}:{})}}>
  <Box sx={{display:'flex',alignItems:'center',gap:1.25}}><activity.Icon sx={{color:'var(--awm-gold)',fontSize:28}}/><Typography component="h2" sx={{fontSize:21,fontWeight:600}}><UiText>{activity.title}</UiText></Typography></Box>
  {!Engine&&<><Typography sx={{color:'var(--awm-muted)',fontSize:14,flex:1}}><UiText>{activity.description}</UiText></Typography><Button variant="contained" disabled={busy} onClick={()=>void start()} sx={{alignSelf:'flex-start',minHeight:44,minWidth:88}}>{busy?<CircularProgress size={18} aria-label={`Loading ${activity.title}`}/>:<UiText>Start</UiText>}</Button></>}
  {error&&<Alert severity="warning" action={<Button onClick={()=>void start()}><UiText>Retry</UiText></Button>}>{error}</Alert>}
  {Engine&&<><Box sx={{display:'flex',justifyContent:'flex-end'}}><Button onClick={close} sx={{minHeight:44}}><UiText>Close</UiText></Button></Box><Box component="section" role="region" aria-label={activity.id==='puzzle'?'Word Search activity':activity.id==='grammar'?'Grammar activity':'Memory activity'} sx={{minWidth:0,maxWidth:760,width:'100%',mx:'auto'}}><Engine onClose={close}/></Box></>}
 </Paper>
}
export default function PracticeLaunchers(){
 return <Container data-learn-page maxWidth="lg" sx={{maxWidth:'1120px !important',py:{xs:2.5,md:4},pb:'var(--awm-mobile-bottom-clearance)'}}>
  <Typography component="h1" sx={{fontSize:{xs:26,md:32},fontWeight:600,mb:1}}><UiText>A little Arabic, every day</UiText></Typography>
  <Typography sx={{color:'var(--awm-muted)',mb:2.5}}><UiText>Choose an activity and start practising at your own pace.</UiText></Typography>
  <Box data-learn-workspace sx={{display:'grid',gridTemplateColumns:{xs:'minmax(0,1fr)',md:'repeat(3,minmax(0,1fr))'},gap:2,alignItems:'stretch'}}>{activities.map(activity=><PracticeCard key={activity.id} activity={activity}/>)}</Box>
  <Box sx={{maxWidth:480,mx:'auto',mt:2.5}}><LearnNavigationTiles/></Box>
 </Container>
}
