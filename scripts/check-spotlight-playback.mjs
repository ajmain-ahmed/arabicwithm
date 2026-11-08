// Real YouTube IFrame API and native controls; no route interception or media mocks.
import {chromium,firefox,expect} from '@playwright/test'
import {writeFileSync,mkdirSync} from 'node:fs'
const results=[]
for(const [name,type,options] of [['chrome',chromium,{executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'}],['firefox',firefox,{}]]){
 const browser=await type.launch({headless:true,...options})
 try{
  const context=await browser.newContext({viewport:{width:1280,height:1000}}),page=await context.newPage()
  for(let i=0;i<Number(process.env.AWM_PLAYBACK_RELOADS??3);i++){
   const sample={browser:name,reload:i};results.push(sample)
   try{
    const started=performance.now();await page.goto('http://127.0.0.1:3048/',{waitUntil:'domcontentloaded',timeout:90000})
    await page.bringToFront()
    const player=page.locator('[data-spotlight-ready]'),section=page.locator('[data-home-spotlight]')
    await expect(player).toHaveAttribute('data-spotlight-ready','true',{timeout:45000})
    sample.readyMs=Math.round(performance.now()-started)
    sample.initialVideoId=await page.locator('[data-spotlight-video]').getAttribute('data-spotlight-video')
    await player.locator('iframe').hover()
    await expect.poll(()=>player.evaluate(el=>{const time=Number(el.getAttribute('data-spotlight-time')),start=Number(el.getAttribute('data-spotlight-start')),end=Number(el.getAttribute('data-spotlight-end'));return time>start+.5&&time<end}),{timeout:30000}).toBe(true)
    Object.assign(sample,await player.evaluate(el=>({videoId:el.closest('[data-spotlight-video]').getAttribute('data-spotlight-video'),start:Number(el.getAttribute('data-spotlight-start')),end:Number(el.getAttribute('data-spotlight-end')),time:Number(el.getAttribute('data-spotlight-time')),iframe:el.querySelector('iframe').src})))
    sample.duration=sample.end-sample.start
    sample.subtitle=await section.locator('[data-spotlight-subtitle] [lang=ar]').innerText()
    await player.locator('iframe').hover()
    const frame=player.locator('iframe').contentFrame()
    await frame.getByRole('button',{name:/^Pause( video)?(?: \(k\))?$/i}).click();await expect(player).toHaveAttribute('data-spotlight-playing','false');sample.nativePause=true
    await player.locator('iframe').hover()
    await frame.getByRole('button',{name:/^Play( video)?(?: \(k\))?$/i}).click();await expect(player).toHaveAttribute('data-spotlight-playing','true');sample.nativePlay=true
    if(i===0){
     await expect.poll(()=>section.locator('[data-spotlight-subtitle] [lang=ar]').innerText(),{timeout:20000}).not.toBe(sample.subtitle)
     sample.subtitlesAdvance=true
     await player.locator('iframe').evaluate((iframe,end)=>iframe.contentWindow.postMessage(JSON.stringify({event:'command',func:'seekTo',args:[end-1,true]}),'https://www.youtube.com'),sample.end)
     await expect(player).toHaveAttribute('data-spotlight-playing','false',{timeout:20000});sample.endBoundary=true
    }
    sample.guestUsageMs=await page.evaluate(()=>Number(localStorage.getItem('awm-for-you-guest-playback-v1')))
    sample.passed=true
   }catch(error){sample.error=error.message;sample.visibility=await page.evaluate(()=>({hidden:document.hidden,state:document.visibilityState,usage:localStorage.getItem('awm-for-you-guest-playback-v1')}));sample.body=await page.locator('[data-home-spotlight]').innerText().catch(()=>'missing section');sample.state=await page.locator('[data-spotlight-ready]').evaluate(el=>Object.fromEntries([...el.attributes].filter(a=>a.name.startsWith('data-spotlight')).map(a=>[a.name,a.value]))).catch(()=>null);sample.media=[];for(const frame of page.frames())if(frame.url().includes('youtube.com/embed/'))sample.media.push(await frame.locator('video').evaluateAll(els=>els.map(v=>({time:v.currentTime,paused:v.paused,readyState:v.readyState,networkState:v.networkState,error:v.error?.code,src:v.currentSrc.slice(0,80)}))).catch(()=>[]))}
   console.log(JSON.stringify(sample))
  }
 }finally{await browser.close()}
}
mkdirSync('test-results',{recursive:true});writeFileSync('test-results/spotlight-real-playback.json',JSON.stringify(results,null,2))
if(results.some(r=>!r.passed))process.exitCode=1
