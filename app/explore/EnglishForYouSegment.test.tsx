import {expect,it} from 'vitest'
import {renderToStaticMarkup} from 'react-dom/server'
import EnglishForYouSegment from './EnglishForYouSegment'
import MobileForYouPanel from './MobileForYouPanel'
import fixture from '@/e2e/english-subtitle-data.json'
import type {ForYouSegment} from '@/app/lib/forYou'
const example=fixture.segments[0]
const line:ForYouSegment={id:1,position:0,start_seconds:0,end_seconds:15,original_text:example.translation,...example}
const settings={tashkeel:false,meanings:true,sentence:true}
const parse=(html:string)=>new DOMParser().parseFromString(html,'text/html')
const render=(value=line,options=settings,time=1)=>parse(renderToStaticMarkup(<EnglishForYouSegment arabicFirst line={value} settings={options} time={time}/>))
it('renders the complete Arabic token line, its paired direct glosses and one canonical English sentence',()=>{
 const before=JSON.stringify(line),doc=render(),pairs=[...doc.querySelectorAll('[data-english-token]')]
 expect(pairs).toHaveLength(4)
 expect(pairs.map(p=>p.children[0].textContent)).toEqual(example.tokens.slice(0,4).map((t,i)=>t.arabic+(i===3?'\u061f':'')))
 expect(pairs.map(p=>p.children[1].textContent)).toEqual(['Do you','wish to','to','confess'])
 pairs.forEach(p=>{expect([...p.children].map(c=>c.getAttribute('lang'))).toEqual(['ar','en']);expect(p.children[1].getAttribute('dir')).toBe('ltr')})
 expect(doc.querySelector('[data-english-source]')?.getAttribute('dir')).toBe('rtl')
 const sentence=doc.querySelector('[data-sentence-translation]')!
 expect(sentence.textContent).toBe('Do you wish to confess?');expect(sentence.getAttribute('lang')).toBe('en');expect(sentence.getAttribute('dir')).toBe('ltr');expect(doc.querySelectorAll('[data-sentence-translation]')).toHaveLength(1)
 expect(JSON.stringify(line)).toBe(before)
})
it('keeps Arabic words without glosses and does not make punctuation-only gloss labels',()=>{
 const doc=render({...line,tokens:[{arabic:'(',english:'('},...line.tokens.map((t,i)=>i===0?{...t,english:''}:t),{arabic:')',english:')'}]})
 expect(doc.querySelectorAll('[data-english-token]')).toHaveLength(4)
 expect(doc.querySelector('[data-english-token] [lang=ar]')?.textContent).toBe('('+example.tokens[0].arabic)
 expect(doc.querySelectorAll('[data-english-token] [lang=en]')).toHaveLength(3)
 expect([...doc.querySelectorAll('[data-english-token] [lang=en]')].some(el=>['?','(',')'].includes(el.textContent??''))).toBe(false)
})
it.each([false,true])('uses the same Arabic-first pairing in mobile short/full modes: full=%s',full=>{
 const doc=parse(renderToStaticMarkup(<MobileForYouPanel language="en" activeOnly={full} activeSegment={line} clip={{video:{id:'fixture',youtube_id:'abcdefghij0',title:'Fixture',channel:null},clip_start_ms:0,clip_end_ms:15000,segments:[line]}} segments={[line]} time={1} settings={settings} ready playing onPlay={()=>{}} onPause={()=>{}} onSeek={()=>{}} rates={[1]} rate={1} onRate={()=>{}}/>))
 expect(doc.querySelector('[data-english-token]')?.firstElementChild?.getAttribute('lang')).toBe('ar');expect(doc.querySelector('[data-sentence-translation]')?.textContent).toBe(example.english_text)
})
it('honours gloss/sentence visibility while always preserving the Arabic token line',()=>{
 const doc=render(line,{...settings,meanings:false,sentence:false})
 expect(doc.querySelectorAll('[data-english-token] [lang=ar]')).toHaveLength(4);expect(doc.querySelector('[lang=en]')).toBeNull()
})
it('never invents a full English sentence from direct word glosses or mislabels Arabic translation',()=>{
 const doc=render({...line,english_text:example.translation})
 expect(doc.querySelector('[data-sentence-translation]')).toBeNull();expect(doc.querySelector('[data-missing-english-source]')).not.toBeNull()
})
it('uses the saved original English sentence when the dedicated English field is absent',()=>{
 expect(render({...line,english_text:null,original_text:example.english_text}).querySelector('[data-sentence-translation]')?.textContent).toBe(example.english_text)
})
it('updates all layers and token highlights for a different timed segment',()=>{
 const next={...line,...fixture.segments[1],id:2,original_text:fixture.segments[1].translation}
 const doc=render(next)
 expect([...doc.querySelectorAll('[data-english-token] [lang=ar]')].map(el=>el.textContent)).toEqual(next.tokens.map(t=>t.arabic))
 expect([...doc.querySelectorAll('[data-english-token] [lang=en]')].map(el=>el.textContent)).toEqual(next.tokens.map(t=>t.english))
 expect(doc.querySelector('[data-sentence-translation]')?.textContent).toBe(next.english_text)
 expect(doc.querySelector('[data-english-source]')?.textContent).not.toContain('confess')
 expect(render().querySelector('[data-active-token=true] [lang=ar]')?.textContent).toBe(example.tokens[0].arabic)
})
