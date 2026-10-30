import {act,useEffect} from 'react'
import {createRoot,type Root} from 'react-dom/client'
import {afterEach,beforeEach,expect,it,vi} from 'vitest'
const mocks=vi.hoisted(()=>({sync:vi.fn(),explore:vi.fn(),pause:vi.fn(),mounted:vi.fn()}))
vi.mock('@/app/actions/forYouUsage',()=>({syncForYouUsage:mocks.sync}))
vi.mock('@/app/components/PremiumPrompt',()=>({default:({open}:{open:boolean})=>open?<aside>Canonical upgrade popup</aside>:null}))
import ForYouAllowance from './ForYouAllowance'
import {useForYouAdvance,useForYouMeter,type PlayerSample} from './ForYouMeterContext'
let send:((s:PlayerSample)=>void)|null=null,allowed:(()=>boolean)|null=null,root:Root,host:HTMLDivElement,clock=0,budget=8000,unlimited=false
function Player(){const meter=useForYouMeter(),advance=useForYouAdvance();useEffect(()=>{send=meter;allowed=advance;return()=>{send=null;allowed=null}},[meter,advance]);useEffect(()=>{mocks.mounted()},[]);return <p>Player and transcript</p>}
async function mount(){await act(async()=>root.render(<ForYouAllowance onExplore={mocks.explore}><Player/></ForYouAllowance>))}
async function sample(time:number,playing=true){await act(async()=>{send?.({time,playing,rate:1,pause:mocks.pause})})}
async function tick(time:number,playing=true){clock+=200;await act(async()=>{await vi.advanceTimersByTimeAsync(200);send?.({time,playing,rate:1,pause:mocks.pause})})}
beforeEach(()=>{
 vi.useFakeTimers();clock=0;budget=8000;unlimited=false;vi.clearAllMocks();send=null
 Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true})
 vi.spyOn(performance,'now').mockImplementation(()=>clock)
 mocks.sync.mockImplementation(async({totalMs}:{totalMs:number})=>({unlimited,remainingMs:unlimited?null:Math.max(0,budget-totalMs),busy:false,day:'2026-10-26'}))
 host=document.createElement('div');document.body.append(host);root=createRoot(host)
})
afterEach(async()=>{await act(async()=>root.unmount());host.remove();vi.useRealTimers();vi.restoreAllMocks()})
it('waits for access before mounting and never starts an already exhausted player',async()=>{
 budget=0;await mount()
 expect(mocks.mounted).not.toHaveBeenCalled()
 expect(document.body.textContent).toContain('Unlock unlimited For You')
 const button=[...document.querySelectorAll('button')].find(b=>b.textContent==='Continue on Explore')!
 await act(async()=>button.click());expect(mocks.explore).toHaveBeenCalledOnce()
})
it('shows no allowance UI until the last elapsed sample, pauses, preserves content, and opens the canonical upgrade flow',async()=>{
 await mount();await sample(120)
 for(let i=1;i<40;i++)await tick(120+i*.2)
 expect(document.body.textContent).not.toMatch(/remaining|countdown|daily allowance|Unlock unlimited/)
 await tick(128)
 expect(mocks.pause).toHaveBeenCalled();expect(document.body.textContent).toContain('Unlock unlimited For You')
 expect(host.textContent).toContain('Player and transcript');expect(mocks.mounted).toHaveBeenCalledOnce()
 await sample(128.2);expect(mocks.pause).toHaveBeenCalled()
 const upgrade=[...document.querySelectorAll('button')].find(b=>b.textContent==='Upgrade to AWM Plus')!
 await act(async()=>upgrade.click());expect(document.body.textContent).toContain('Canonical upgrade popup')
})
it('never sends metering heartbeats for unlimited accounts',async()=>{
 unlimited=true;await mount();await sample(0)
 for(let i=1;i<=50;i++)await tick(i*.2)
 expect(mocks.sync).toHaveBeenCalledTimes(1);expect(mocks.pause).not.toHaveBeenCalled()
 expect(document.body.textContent).not.toContain('Unlock unlimited For You')
})
it('does not charge paused or stalled samples or source jumps',async()=>{
 await mount();await sample(120)
 for(let i=0;i<10;i++)await tick(120,false)
 await tick(480);await tick(480);await tick(480.2)
 const sent=mocks.sync.mock.calls.map(([input])=>input.totalMs)
 expect(Math.max(...sent)).toBeLessThanOrEqual(200)
 expect(document.body.textContent).not.toContain('Unlock unlimited For You')
})
it('keeps one cumulative allowance across clip changes and blocks advancement at the cap',async()=>{
 budget=800;await mount();await sample(0);await tick(.2);await tick(.4)
 await sample(0,false);await sample(0);await tick(.2);await tick(.4)
 expect(document.body.textContent).toContain('Unlock unlimited For You')
 expect(allowed?.()).toBe(false)
 await sample(0);expect(allowed?.()).toBe(false)
})
