import {act,useState} from 'react'
import {createRoot} from 'react-dom/client'
import {renderToString} from 'react-dom/server'
import {expect,it,vi} from 'vitest'
import Provider,{useWebsiteLocale} from './WebsiteLocaleProvider'
vi.mock('next/navigation',()=>({usePathname:()=>'/learn'}))
function Workspace(){const {locale,setLocale,t}=useWebsiteLocale(),[progress,setProgress]=useState(0);return <><button onClick={()=>setLocale(locale==='en'?'ar':'en')}>language</button><button onClick={()=>setProgress(value=>value+1)}>progress</button><output>{progress}</output><h1>{t('Learn')}</h1><video data-testid="video"/></>}
it('uses the validated request preference for server-rendered Arabic text',()=>{
 localStorage.setItem('awm-website-locale','en')
 expect(renderToString(<Provider initialLocale="ar"><Workspace/></Provider>)).toContain('<h1>تعلّم</h1>')
 localStorage.clear()
})
it('switches UI language in place while preserving mounted players and activity progress',async()=>{
 localStorage.clear();const host=document.createElement('div'),root=createRoot(host);document.body.append(host)
 await act(async()=>root.render(<Provider><Workspace/></Provider>));const video=host.querySelector('video')
 await act(async()=>host.querySelectorAll('button')[1].click());await act(async()=>host.querySelectorAll('button')[0].click())
 expect(host.querySelector('h1')?.textContent).toBe('تعلّم');expect(host.querySelector('output')?.textContent).toBe('1');expect(host.querySelector('video')).toBe(video);expect(document.documentElement.dir).toBe('rtl');expect(localStorage.getItem('awm-website-locale')).toBe('ar');expect(document.cookie).toContain('awm-website-locale=ar')
 await act(async()=>root.unmount());const reopened=createRoot(host);await act(async()=>reopened.render(<Provider><Workspace/></Provider>));expect(host.querySelector('h1')?.textContent).toBe('تعلّم');await act(async()=>reopened.unmount());host.remove();localStorage.clear()
})
