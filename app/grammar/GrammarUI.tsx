'use client'

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { Alert, Box, Button, FormControlLabel, IconButton, Popover, Switch, Typography } from '@mui/material'
import { SettingsOutlined } from '@mui/icons-material'
import { displayArabic } from '@/app/lib/displayArabic'
import TextSizeControl, { safeTextSize, TEXT_SCALES } from '@/app/components/settings-controls/TextSizeControl'

const defaults = { arabicSize: 2, englishSize: 2, tashkeel: true }
type Preferences = typeof defaults
const Context = createContext<{preferences: Preferences; update: (patch: Partial<Preferences>) => void}>({ preferences: defaults, update: () => {} })
export function GrammarProvider({ children }: { children: ReactNode }) {
  const [preferences, setPreferences] = useState(defaults)
  useEffect(() => {
    const frame=requestAnimationFrame(()=>{try { const saved = JSON.parse(localStorage.getItem('awm-grammar-settings') ?? '{}'); setPreferences({ arabicSize: safeTextSize(saved.arabicSize), englishSize: safeTextSize(saved.englishSize), tashkeel: typeof saved.tashkeel === 'boolean' ? saved.tashkeel : true }) } catch {}})
    return ()=>cancelAnimationFrame(frame)
  }, [])
  function update(patch: Partial<Preferences>) {
    setPreferences(old => { const next = { ...old, ...patch }; try { localStorage.setItem('awm-grammar-settings', JSON.stringify(next)) } catch {} return next })
  }
  return <Context.Provider value={{ preferences, update }}><Box sx={{ '--grammar-arabic-size': `${32 * TEXT_SCALES[preferences.arabicSize]}px`, '--grammar-english-size': `${16 * TEXT_SCALES[preferences.englishSize]}px`, '& .MuiTypography-root': { overflowWrap: 'anywhere' }, '& .MuiButton-root': { textAlign: 'center', justifyContent: 'center', minHeight: 44, textTransform: 'none', whiteSpace: 'normal' } }}>{children}</Box></Context.Provider>
}
export function useGrammarDisplay() {
  const { preferences } = useContext(Context)
  return (value: string) => displayArabic(value, preferences.tashkeel)
}
export function GrammarSettings() {
  const { preferences, update } = useContext(Context)
  const [anchor, setAnchor] = useState<HTMLElement | null>(null)
  return <><IconButton aria-label="Settings" aria-expanded={!!anchor} onClick={e => setAnchor(e.currentTarget)}><SettingsOutlined /></IconButton><Popover open={!!anchor} anchorEl={anchor} onClose={() => setAnchor(null)} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }} transformOrigin={{ vertical: 'top', horizontal: 'right' }} slotProps={{ paper: { sx: { p: 2, width: 280, maxWidth: 'calc(100vw - 32px)', borderRadius: 3 } } }}>
    <Typography component="h2" sx={{fontWeight:600}}>Settings</Typography>
    <TextSizeControl label="Arabic text size" value={preferences.arabicSize} onChange={arabicSize => update({ arabicSize })} />
    <TextSizeControl label="English text size" value={preferences.englishSize} onChange={englishSize => update({ englishSize })} />
    <FormControlLabel label="Tashkīl" control={<Switch checked={preferences.tashkeel} onChange={(_, tashkeel) => update({ tashkeel })} />} /><Button onClick={() => setAnchor(null)}>Done</Button>
  </Popover></>
}
export function Arabic({ children }: { children: string }) {
  const text = useGrammarDisplay()
  const {preferences}=useContext(Context)
  return <Typography lang="ar" dir="rtl" data-grammar-arabic sx={{ fontFamily: 'var(--font-serif)', fontSize: `var(--grammar-arabic-size, ${32*TEXT_SCALES[preferences.arabicSize]}px)`, lineHeight: 1.9, textAlign: 'center', my: .5 }}>{text(children)}</Typography>
}
export function English({ children }: { children: ReactNode }) { const {preferences}=useContext(Context);return <Typography lang="en" data-grammar-english sx={{ fontSize: `var(--grammar-english-size, ${16*TEXT_SCALES[preferences.englishSize]}px)`, textAlign: 'center', mb: 1.5 }}>{children}</Typography> }
export function Instruction({ children }: { children: ReactNode }) { return <Typography component="h2" sx={{ textAlign: 'center', fontSize: 'calc(var(--grammar-english-size, 16px) * 1.2)', fontWeight: 600, mt: 3, mb: 2 }}>{children}</Typography> }
export function Feedback({ correct, children, onContinue }: { correct: boolean; children: ReactNode; onContinue?: () => void }) {
  return <Alert role="status" severity={correct ? 'success' : 'error'} sx={{ mt: 2, textAlign: 'center', '& .MuiAlert-message': { flex: 1 } }}><Typography sx={{fontWeight:600}}>{correct ? 'Correct ✓' : 'Incorrect'}</Typography><Box sx={{ fontSize: 'var(--grammar-english-size, 16px)' }}>{children}</Box>{!correct && onContinue && <Button onClick={onContinue}>Continue</Button>}</Alert>
}
