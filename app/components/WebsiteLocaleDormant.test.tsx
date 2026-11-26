import {act} from 'react'
import {createRoot} from 'react-dom/client'
import {renderToString} from 'react-dom/server'
import {expect,it,vi} from 'vitest'
import Provider,{useWebsiteLocale} from './WebsiteLocaleProvider'
vi.mock('next/navigation',()=>({usePathname:()=>'/learn'}))
function Probe(){const {locale,direction,t,setLocale}=useWebsiteLocale();return <><button onClick={()=>setLocale('ar')}>choose</button><output>{locale}:{direction}:{t('Learn')}</output><video/></>}
it('renders English on the server even with a saved Arabic preference',()=>{
 expect(renderToString(<Provider initialLocale="ar"><Probe/></Provider>).replace(/<[^>]*>/g,'')).toContain('en:ltr:Learn')
})
it('keeps English/LTR and mounted content when old Arabic preferences or setters are present',async()=>{
 localStorage.setItem('awm-website-locale','ar')
 const host=document.createElement('div'),root=createRoot(host);document.body.append(host)
 try{
  await act(async()=>root.render(<Provider initialLocale="ar"><Probe/></Provider>))
  const player=host.querySelector('video')
  await act(async()=>host.querySelector('button')!.click())
  expect(host.querySelector('output')?.textContent).toBe('en:ltr:Learn')
  expect(document.documentElement.dir).toBe('ltr');expect(host.querySelector('video')).toBe(player)
  expect(localStorage.getItem('awm-website-locale')).toBe('ar')
 }finally{await act(async()=>root.unmount());host.remove();localStorage.clear()}
})
