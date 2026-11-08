'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Box, Button, Fade, IconButton, Typography } from '@mui/material'
import { Close, ExploreOutlined, PersonOutlineRounded } from '@mui/icons-material'
import ExploreFeed from './ExploreFeed'
import {type ExploreFeedBatch} from '@/app/lib/explore'
import { useAuth } from '@/app/AuthContext'
import ForYouAllowance from './ForYouAllowance'
import GuestForYouAllowance from './GuestForYouAllowance'
import ForYouFeed, {clearForYouTranscripts} from './ForYouFeed'
import {useForYouCache} from '@/store/forYouStore'

type ExploreView = 'explore' | 'foryou'

function LanguageSwitch({value,onChange}:{value:'ar'|'en';onChange:(value:'ar'|'en')=>void}){return <Box role="group" aria-label="Source video language" sx={{display:{xs:'none',md:'flex'},border:'1px solid #ffffff55',borderRadius:'999px',p:.25}}>{(['ar','en'] as const).map(language=><Button key={language} aria-pressed={value===language} onClick={()=>onChange(language)} sx={{minWidth:40,minHeight:36,borderRadius:'999px',color:'#fff',bgcolor:value===language?'#ffffff33':'transparent'}}>{language.toUpperCase()}</Button>)}</Box>}

function MobileViewTools({view,onView,language,onLanguage}:{view:ExploreView;onView:(view:ExploreView)=>void;language:'ar'|'en';onLanguage:(language:'ar'|'en')=>void}){
 return <Box data-mobile-view-tools sx={{display:'flex',alignItems:'center',flexWrap:'nowrap',gap:.5,minWidth:0,flex:1}}>
  <ViewSwitch mobile compact view={view} onChange={onView} hint={false} onDismiss={()=>{}} />
  {view==='foryou'&&<Button data-mobile-language-toggle aria-label={language==='ar'?'Arabic selected — switch For You to English':'English selected — switch For You to Arabic'} onClick={()=>onLanguage(language==='ar'?'en':'ar')} sx={{width:40,minWidth:40,height:42,flexShrink:0,px:.75,py:0,fontSize:12,fontWeight:600,border:'1px solid #ffffff44',borderRadius:'9999px',color:'#fff',bgcolor:'rgba(255,255,255,.14)','&:hover':{bgcolor:'rgba(255,255,255,.24)'},'&:focus-visible':{outline:'2px solid var(--awm-gold-light)',outlineOffset:2}}}>{language.toUpperCase()}</Button>}
 </Box>
}

function ViewSwitch({ view, onChange, hint, onDismiss, mobile = false, compact = false, horizontal = false, trailing }: { view: ExploreView; onChange: (view: ExploreView) => void; hint: boolean; onDismiss: () => void; mobile?: boolean; compact?:boolean; horizontal?: boolean; trailing?: ReactNode }) {
  if (mobile) return <Box role="group" aria-label="Explore views" sx={{ display: 'flex',...(compact?{flex:'1 1 164px',minWidth:140,height:42,boxSizing:'border-box'}:{}), p: .25, borderRadius: '9999px', bgcolor: 'rgba(0,0,0,.3)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,.2)' }}>
    {(['explore', 'foryou'] as const).map(id => <Button key={id} aria-label={`${id === 'explore' ? 'Explore' : 'For You'} feed`} aria-pressed={view === id} onClick={() => onChange(id)} sx={{width:compact?undefined:82,flex:compact?1:undefined,minWidth:0,minHeight:36,px:compact ? .75 : 1,py:.5,fontSize:compact?12:13,...(compact?{whiteSpace:'nowrap'}:{}), borderRadius: '9999px', color: '#fff', bgcolor: view === id ? 'rgba(255,255,255,.22)' : 'transparent', fontWeight: view === id ? 700 : 500, textTransform: 'none', '&:hover': { bgcolor: 'rgba(255,255,255,.3)' }, '&:focus-visible': { outline: '2px solid var(--awm-gold-light)', outlineOffset: 2 } }}>{id === 'explore' ? 'Explore' : 'For You'}</Button>)}
  </Box>
  return <Box sx={{ position: 'relative', display: 'flex', flexDirection: mobile || horizontal ? 'row' : 'column', alignItems: horizontal ? 'flex-start' : 'center', gap: 1, minWidth: 0 }}>
    {([{ id: 'explore', label: 'Explore', Icon: ExploreOutlined }, { id: 'foryou', label: 'For You', Icon: PersonOutlineRounded }] as const).map(({ id, label, Icon }) => <Box key={id} sx={{ position: 'relative', textAlign: 'center' }}>
      <IconButton aria-label={`${label} feed`} aria-pressed={view === id} onClick={() => onChange(id)} sx={{ width: mobile ? 44 : 50, height: mobile ? 44 : 50, color: mobile ? 'var(--awm-forest)' : '#fff', bgcolor: view === id ? 'rgba(184,134,11,.24)' : mobile ? 'transparent' : 'rgba(255,255,255,.14)', border: view === id ? '1px solid var(--awm-gold)' : '1px solid transparent', '&:hover': { bgcolor: 'rgba(184,134,11,.3)' }, '&:focus-visible': { outline: '2px solid var(--awm-gold)', outlineOffset: 2 } }}><Icon /></IconButton>
      {!mobile && <Typography sx={{ fontSize: 11, color: '#fff', mt: .5 }}>{label}</Typography>}
      {view !== id && <Fade in={hint} unmountOnExit><Box role="note" sx={{ position: 'absolute', left: mobile ? (id === 'foryou' ? 'auto' : 0) : 'calc(100% + 14px)', right: mobile && id === 'foryou' ? 0 : 'auto', top: mobile ? 'calc(100% + 10px)' : 0, width: mobile ? 156 : 178, p: 1.25, pr: 3.5, borderRadius: '10px', bgcolor: '#174832', color: '#fff', zIndex: 20, boxShadow: '0 4px 16px #0004', '&:before': { content: '""', position: 'absolute', left: mobile ? 20 : -5, top: mobile ? -5 : 18, width: 10, height: 10, bgcolor: 'inherit', transform: 'rotate(45deg)' } }}>
        <Typography sx={{ color: 'inherit', fontSize: 12, lineHeight: 1.5, textAlign: 'center' }}>{view === 'explore' ? 'Click here for different content' : 'Click here to return to Explore'}</Typography>
        <IconButton aria-label="Dismiss navigation hint" onClick={onDismiss} sx={{ position: 'absolute', right: 0, top: 0, width: 28, height: 28, color: 'inherit' }}><Close sx={{ fontSize: 15 }} /></IconButton>
      </Box></Fade>}
    </Box>)}
    {trailing}

  </Box>
}

export default function ExploreViews({ initialSeed, initialBatch, initialView='explore' }: { initialView?:ExploreView; initialSeed: string; initialBatch: ExploreFeedBatch | null }) {
  const { user, loading } = useAuth()
  const [view, setView] = useState<ExploreView>(initialView)
  const [language,setLanguage]=useState<'ar'|'en'>(()=>useForYouCache.getState().language)
  function selectLanguage(next:'ar'|'en'){if(next===language)return;clearForYouTranscripts();useForYouCache.setState({language:next,clips:[],index:0,excluded:[],seenSources:[],seed:''});setLanguage(next)}
  useEffect(()=>{const restore=()=>{const q=new URLSearchParams(window.location.search);setView((q.get('view')??q.get('tab'))==='foryou'?'foryou':'explore')};window.addEventListener('popstate',restore);return()=>window.removeEventListener('popstate',restore)},[])
  const requestView = (next: ExploreView) => {
    if(next===view)return
    const url=new URL(window.location.href);url.searchParams.delete('tab');if(next==='foryou')url.searchParams.set('view',next);else url.searchParams.delete('view');window.history.pushState(null,'',url);setView(next)
  }
  useEffect(()=>{
    // One route visit, including switches between Explore and For You. A fresh
    // server visit/refresh gets a new seed and cannot restore an old sequence.
    if(useForYouCache.getState().sessionId!==initialSeed){
      clearForYouTranscripts()
      useForYouCache.setState({sessionId:initialSeed,seed:'',clips:[],index:0,excluded:[],seenSources:[],groups:[]})
    }
  },[initialSeed])
  const [hintFor, setHintFor] = useState<ExploreView | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      const key = `awm-discovery-v2-${view}`
      try { if (sessionStorage.getItem(key)) return; sessionStorage.setItem(key, 'seen') } catch {}
      setHintFor(view)
      timer.current = setTimeout(() => setHintFor(null), window.matchMedia('(max-width:899.95px)').matches ? 2500 : 4000)
    })
    return () => { cancelAnimationFrame(frame); if (timer.current) clearTimeout(timer.current) }
  }, [view])
  const dismiss = () => { setHintFor(null); if (timer.current) clearTimeout(timer.current) }
  const rail = <ViewSwitch view={view} onChange={requestView} hint={hintFor === view} onDismiss={dismiss} />
  const feed=<ForYouFeed key={`${user?.id??'guest'}:${language}`} guest={!user} mobileViewControl={<MobileViewTools view={view} onView={requestView} language={language} onLanguage={selectLanguage}/>} language={language} languageControl={<LanguageSwitch value={language} onChange={selectLanguage}/>} mobileSwitcher={<ViewSwitch mobile view={view} onChange={requestView} hint={false} onDismiss={dismiss}/>} desktopControls={settings=><ViewSwitch view={view} onChange={requestView} hint={hintFor===view} onDismiss={dismiss} trailing={settings}/>}/>
  return <Box sx={{ position: 'relative', '--awm-explore-switch-height': '0px' }}>
    <Box data-mobile-explore-switch sx={{ display: { xs: view === 'explore' ? 'flex' : 'none', md: 'none' }, position: 'absolute', top: 12, left: 'max(12px, env(safe-area-inset-left))', zIndex: 10 }}><MobileViewTools view={view} onView={requestView} language={language} onLanguage={selectLanguage}/></Box>
    {view==='explore'?<ExploreFeed railTop={<Box sx={{display:{xs:'none',md:'block'}}}>{rail}</Box>} initialSeed={initialSeed} initialBatch={initialBatch}/>:loading?<Box role="status" sx={{p:4,textAlign:'center'}}>Loading For You...</Box>:user?<ForYouAllowance key={user.id} onExplore={()=>requestView('explore')}>{feed}</ForYouAllowance>:<GuestForYouAllowance>{feed}</GuestForYouAllowance>}
  </Box>
}
