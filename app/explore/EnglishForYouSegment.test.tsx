import {expect,it} from 'vitest'
import {renderToStaticMarkup} from 'react-dom/server'
import EnglishForYouSegment from './EnglishForYouSegment'
import MobileForYouPanel from './MobileForYouPanel'
import fixture from '@/e2e/english-for-you-data.json'
import type {ForYouSegment} from '@/app/lib/forYou'
const line:ForYouSegment={id:1,position:0,start_seconds:0,end_seconds:45,original_text:fixture.translation,english_text:fixture.translation,...fixture}
const settings={tashkeel:false,meanings:true,sentence:true}
const parse=(html:string)=>new DOMParser().parseFromString(html,'text/html')
it('renders English tokens first, each intact Arabic gloss underneath, then the complete translation',()=>{
 const before=JSON.stringify(line),doc=parse(renderToStaticMarkup(<EnglishForYouSegment line={line} settings={settings} time={0}/>))
 const pairs=[...doc.querySelectorAll('[data-english-token]')]
 expect(pairs.map(p=>p.firstElementChild?.textContent)).toEqual(['Give','my','creature','life'])
 pairs.forEach((p,i)=>{expect(p.children[0].getAttribute('lang')).toBe('en');expect(p.children[1].getAttribute('lang')).toBe('ar');expect(p.children[1].getAttribute('dir')).toBe('rtl');expect(p.children[1].textContent).toBe(fixture.tokens[i].arabic)})
 expect(doc.querySelector('[data-english-source]')?.getAttribute('dir')).toBe('ltr')
 const translation=doc.querySelector('[data-sentence-translation]')!;expect(translation.textContent).toBe(fixture.translation);expect(translation.getAttribute('dir')).toBe('rtl');expect(doc.querySelectorAll('[data-sentence-translation]')).toHaveLength(1)
 expect(JSON.stringify(line)).toBe(before)
})
it('does not create an empty Arabic row for punctuation',()=>{
 const doc=parse(renderToStaticMarkup(<EnglishForYouSegment line={{...line,tokens:[...line.tokens,{english:'.',arabic:'.'}]}} settings={settings} time={0}/>))
 expect(doc.querySelectorAll('[data-english-token]')).toHaveLength(4);expect(doc.querySelectorAll('[data-english-token] [lang=en]')[3].textContent).toBe('life.');expect(doc.querySelectorAll('[data-english-token] [lang=ar]')).toHaveLength(4)
})
it.each([false,true])('uses the same English-first hierarchy in mobile short/full modes: full=%s',full=>{
 const doc=parse(renderToStaticMarkup(<MobileForYouPanel language="en" activeOnly={full} activeSegment={line} clip={{video:{id:'fixture',youtube_id:'abcdefghij0',title:'Fixture',channel:null},clip_start_ms:0,clip_end_ms:45000,segments:[line]}} segments={[line]} time={1} settings={settings} ready playing onPlay={()=>{}} onPause={()=>{}} onSeek={()=>{}} rates={[1]} rate={1} onRate={()=>{}}/>))
 expect(doc.querySelector('[data-english-token]')?.firstElementChild?.textContent).toBe('Give');expect(doc.querySelector('[data-sentence-translation]')?.textContent).toBe(fixture.translation)
})
it('honours gloss/sentence visibility without changing English source tokens',()=>{
 const doc=parse(renderToStaticMarkup(<EnglishForYouSegment line={line} settings={{...settings,meanings:false,sentence:false}} time={0}/>))
 expect(doc.querySelectorAll('[lang=en]')).toHaveLength(4);expect(doc.querySelector('[lang=ar]')).toBeNull()
})
