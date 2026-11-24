import {expect,it} from 'vitest'
import {renderToStaticMarkup} from 'react-dom/server'
import EnglishForYouSegment from './EnglishForYouSegment'
import MobileForYouPanel from './MobileForYouPanel'
import fixture from '@/e2e/english-upload-subtitle-data.json'
import type {ForYouSegment} from '@/app/lib/forYou'
const example=fixture.segments[0]
const line:ForYouSegment={id:1,position:0,original_text:example.translation,english_text:example.translation,...example}
const settings={tashkeel:false,meanings:true,sentence:true}
const parse=(html:string)=>new DOMParser().parseFromString(html,'text/html')
const render=(value=line,options=settings,time=1109)=>parse(renderToStaticMarkup(<EnglishForYouSegment explore line={value} settings={options} time={time}/>))
it('renders the actual upload in original English expression order with every Arabic equivalent and the natural Arabic sentence',()=>{
 const before=JSON.stringify(line),doc=render(),pairs=[...doc.querySelectorAll('[data-english-token]')]
 expect(pairs).toHaveLength(example.tokens.length)
 expect(pairs.map(p=>p.children[0].textContent)).toEqual(example.tokens.map(t=>t.english))
 expect(pairs.map(p=>p.children[1].textContent)).toEqual(example.tokens.map(t=>t.arabic))
 pairs.forEach(p=>expect([...p.children].map(c=>c.getAttribute('lang'))).toEqual(['en','ar']))
 expect(doc.querySelector('[data-english-source]')?.getAttribute('dir')).toBe('ltr')
 const sentence=doc.querySelector('[data-sentence-translation]')!
 expect(sentence.textContent).toBe(example.translation);expect(sentence.getAttribute('lang')).toBe('ar');expect(sentence.getAttribute('dir')).toBe('rtl')
 expect(JSON.stringify(line)).toBe(before)
})
it.each([false,true])('shares the English-first renderer in mobile short/full modes: full=%s',full=>{
 const doc=parse(renderToStaticMarkup(<MobileForYouPanel language="en" activeOnly={full} activeSegment={line} clip={{video:{id:'fixture',youtube_id:fixture.youtubeId,title:fixture.title,channel:null},clip_start_ms:1108000,clip_end_ms:1131000,segments:[line]}} segments={[line]} time={1109} settings={settings} ready playing onPlay={()=>{}} onPause={()=>{}} onSeek={()=>{}} rates={[1]} rate={1} onRate={()=>{}}/>))
 expect(doc.querySelector('[data-english-token]')?.firstElementChild?.getAttribute('lang')).toBe('en');expect(doc.querySelector('[data-sentence-translation]')?.textContent).toBe(example.translation)
})
it('preserves Arabic diacritics even with the Arabic-source tashkeel setting off, and honours visibility controls',()=>{
 expect(render().querySelector('[data-english-token] [lang=ar]')?.textContent).toBe(example.tokens[0].arabic)
 const doc=render(line,{...settings,meanings:false,sentence:false})
 expect(doc.querySelectorAll('[data-english-token] [lang=en]')).toHaveLength(example.tokens.length);expect(doc.querySelector('[lang=ar]')).toBeNull()
})
it('does not discard an available Arabic equivalent when its English label is blank or punctuation',()=>{
 const doc=render({...line,tokens:[{arabic:'مَرْحَبًا',english:''},{arabic:'؟',english:'?'}]})
 expect([...doc.querySelectorAll('[data-english-token] [lang=ar]')].map(p=>p.textContent)).toEqual(['مَرْحَبًا','؟'])
})
it('updates stored layers and highlights without inferring per-word timing from the sentence timestamp',()=>{
 const timed={...line,tokens:line.tokens.map((t,i)=>({...t,start_seconds:1108+i,end_seconds:1109+i}))}
 expect(render(timed).querySelector('[data-active-token=true] [lang=en]')?.textContent).toBe(example.tokens[1].english)
 expect(render().querySelector('[data-active-token=true]')).toBeNull()
 const next={...line,...fixture.segments[3],id:2}
 const doc=render(next)
 expect([...doc.querySelectorAll('[data-english-token] [lang=en]')].map(el=>el.textContent)).toEqual(next.tokens.map(t=>t.english))
 expect(doc.querySelector('[data-sentence-translation]')?.textContent).toBe(next.translation)
})
