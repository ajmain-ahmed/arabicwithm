'use client'
import {useWebsiteLocale} from '@/app/components/WebsiteLocaleProvider'

import {UiText} from '@/app/components/WebsiteLocaleProvider'


import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { Box, Button, FormControlLabel, IconButton, Popover, Switch, Typography } from '@mui/material'
import { CheckRounded, CloseRounded, SettingsOutlined } from '@mui/icons-material'
import { displayArabic } from '@/app/lib/displayArabic'
import TextSizeControl, { safeTextSize, TEXT_SCALES } from '@/app/components/settings-controls/TextSizeControl'

const defaults = { arabicSize: 2, englishSize: 2, tashkeel: true, autoNext: true }
type Preferences = typeof defaults
const Context = createContext<{preferences: Preferences; update: (patch: Partial<Preferences>) => void}>({ preferences: defaults, update: () => {} })
export function GrammarProvider({ children }: { children: ReactNode }) {
  const [preferences, setPreferences] = useState(defaults)
  useEffect(() => {
    const frame=requestAnimationFrame(()=>{try { const saved = JSON.parse(localStorage.getItem('awm-grammar-settings') ?? '{}'); setPreferences({ arabicSize: safeTextSize(saved.arabicSize), englishSize: safeTextSize(saved.englishSize), tashkeel: typeof saved.tashkeel === 'boolean' ? saved.tashkeel : true, autoNext: typeof saved.autoNext === 'boolean' ? saved.autoNext : true }) } catch {}})
    return ()=>cancelAnimationFrame(frame)
  }, [])
  function update(patch: Partial<Preferences>) {
    setPreferences(old => { const next = { ...old, ...patch }; try { localStorage.setItem('awm-grammar-settings', JSON.stringify(next)) } catch {} return next })
  }
  return <Context.Provider value={{ preferences, update }}><Box data-grammar-surface sx={{ '--grammar-arabic-size': {xs:`${25 * TEXT_SCALES[preferences.arabicSize]}px`,md:`${32 * TEXT_SCALES[preferences.arabicSize]}px`}, '--grammar-target-size': {xs:`${23 * TEXT_SCALES[preferences.arabicSize]}px`,md:`${28 * TEXT_SCALES[preferences.arabicSize]}px`}, '--grammar-option-size': {xs:`${22 * TEXT_SCALES[preferences.arabicSize]}px`,md:`${26 * TEXT_SCALES[preferences.arabicSize]}px`}, '--grammar-english-size': `${16 * TEXT_SCALES[preferences.englishSize]}px`, '& [data-grammar-answers] [lang=ar], & [data-grammar-answers] .MuiButton-root[lang=ar]':{fontFamily:'var(--font-serif)',fontSize:'var(--grammar-option-size)',lineHeight:1.8,textAlign:'center'}, '& .MuiSelect-select, & .MuiNativeSelect-select':{textAlign:'center',textAlignLast:'center'}, '& .MuiTypography-root': { overflowWrap: 'anywhere' }, '& .MuiButton-root': { textAlign: 'center', justifyContent: 'center', minHeight: 44, textTransform: 'none', whiteSpace: 'normal' } }}>{children}</Box></Context.Provider>
}
export function useGrammarDisplay() {
  const { preferences } = useContext(Context)
  return (value: string) => displayArabic(value, preferences.tashkeel)
}
export function useGrammarPreferences(){return useContext(Context)}
export function AutoNextControl(){
 const {t:awmT}=useWebsiteLocale()

 const {preferences,update}=useGrammarPreferences()
 return <FormControlLabel sx={{m:0,whiteSpace:'nowrap'}} label={awmT("Auto Next")} control={<Switch size="small" checked={preferences.autoNext} onChange={(_,autoNext)=>update({autoNext})}/>}/>
}
export function ActivityControls({children}:{children:ReactNode}){
 return <Box data-grammar-controls sx={{display:'flex',alignItems:'center',justifyContent:'center',flexWrap:'wrap',columnGap:3,rowGap:2,mb:2}}>{children}</Box>
}
export function TashkeelControl(){
 const {t:awmT}=useWebsiteLocale()

 const {preferences,update}=useGrammarPreferences()
 return <FormControlLabel sx={{m:0,whiteSpace:'nowrap'}} label={awmT("Show Tashkīl")} control={<Switch size="small" checked={preferences.tashkeel} onChange={(_,tashkeel)=>update({tashkeel})}/>}/>
}
export function GrammarSettings() {
 const {t:awmT}=useWebsiteLocale()

  const { preferences, update } = useContext(Context)
  const [anchor, setAnchor] = useState<HTMLElement | null>(null)
  return <><IconButton aria-label={awmT("Settings")} aria-expanded={!!anchor} onClick={e => setAnchor(e.currentTarget)}><SettingsOutlined /></IconButton><Popover open={!!anchor} anchorEl={anchor} onClose={() => setAnchor(null)} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }} transformOrigin={{ vertical: 'top', horizontal: 'right' }} slotProps={{ paper: { sx: { p: 2, width: 280, maxWidth: 'calc(100vw - 32px)', borderRadius: 3 } } }}>
    <Typography component="h2" sx={{fontWeight:600}}><UiText>{"Settings"}</UiText></Typography>
    <TextSizeControl label={awmT("Arabic text size")} value={preferences.arabicSize} onChange={arabicSize => update({ arabicSize })} />
    <TextSizeControl label={awmT("English text size")} value={preferences.englishSize} onChange={englishSize => update({ englishSize })} />
    <FormControlLabel label={awmT("Tashkīl")} control={<Switch checked={preferences.tashkeel} onChange={(_, tashkeel) => update({ tashkeel })} />} /><Button onClick={() => setAnchor(null)}><UiText>{"Done"}</UiText></Button>
  </Popover></>
}
export function Arabic({ children }: { children: string }) {
  const text = useGrammarDisplay()
  const {preferences}=useContext(Context)
  return <Typography lang="ar" dir="rtl" data-grammar-arabic sx={{ fontFamily: 'var(--font-serif)', fontSize: `var(--grammar-arabic-size, ${32*TEXT_SCALES[preferences.arabicSize]}px)`, lineHeight: 1.9, textAlign: 'center', my: .5 }}>{text(children)}</Typography>
}
export function English({ children }: { children: ReactNode }) { const {preferences}=useContext(Context);return <Typography lang="en" dir="ltr" data-grammar-english sx={{ fontSize: `var(--grammar-english-size, ${16*TEXT_SCALES[preferences.englishSize]}px)`, textAlign: 'center', mb: 1.5 }}>{children}</Typography> }
export function Instruction({ children }: { children: ReactNode }) { return <Typography component="h2" dir="auto" sx={{ textAlign: 'center', fontSize: 'calc(var(--grammar-english-size, 16px) * 1.2)', fontWeight: 600, mt: 3, mb: 2 }}>{children}</Typography> }
export function Feedback({ correct, children, answer, onContinue }: { correct: boolean; children: ReactNode; answer?:ReactNode; onContinue?: () => void }) {
 const {t:awmT}=useWebsiteLocale()

  const {preferences}=useGrammarPreferences(),ref=useRef<HTMLDivElement>(null)
  useEffect(()=>{ref.current?.focus({preventScroll:true})},[])
  const Icon=correct?CheckRounded:CloseRounded
  return <Box ref={ref} tabIndex={-1} role="status" aria-live="polite" aria-atomic="true" data-grammar-feedback={correct?'correct':'incorrect'} sx={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',minHeight:'100%',gap:1.25,p:2,width:'100%',maxWidth:'46ch',mx:'auto',textAlign:'center',overflowWrap:'anywhere',outline:'none'}}>
   <Icon aria-hidden sx={{fontSize:64,color:correct?'success.main':'error.main'}}/>
   <Typography component="h3" sx={{fontWeight:700,fontSize:24}}>{correct?awmT("Correct"):awmT("Incorrect")}</Typography>
   {answer&&<Box sx={{fontWeight:600,fontSize:'var(--grammar-english-size,16px)','& [lang=ar]':{fontFamily:'var(--font-serif)',fontSize:'var(--grammar-arabic-size,32px)',lineHeight:1.7}}}>{!correct&&awmT('Correct answer: ')}{answer}</Box>}
   <Box sx={{maxWidth:'40ch',fontSize:'var(--grammar-english-size,16px)',lineHeight:1.5}}>{children}</Box>
   {onContinue&&(!correct||!preferences.autoNext)&&<Button variant="contained" onClick={onContinue}><UiText>{"Next"}</UiText></Button>}
  </Box>
}
export type GrammarResult={correct:boolean;answer?:ReactNode;explanation:ReactNode;next?:()=>void}
/** Each state owns its natural height; no space is reserved for future feedback. */
export function AnswerArea({children,result}:{children:ReactNode;result?:GrammarResult}){
 return <Box data-grammar-answer-area sx={{my:2,minWidth:0,overflowWrap:'anywhere'}}>
  <Box data-grammar-options hidden={!!result} aria-hidden={!!result} inert={!!result} sx={{display:result?'none':undefined,minWidth:0}}>{children}</Box>
  {result&&<Feedback correct={result.correct} answer={result.answer} onContinue={result.next}>{result.explanation}</Feedback>}
 </Box>
}
