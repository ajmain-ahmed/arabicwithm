import {expect,it} from 'vitest'
import {elapsedViewingMs,type PlaybackSample} from './forYouMeter'
const sample=(clock:number,time:number,playing=true,rate=1):PlaybackSample=>({clock,time,playing,rate})
it('counts real elapsed playback across both modes and source clips',()=>{
 expect(elapsedViewingMs(null,sample(0,120))).toBe(0)
 expect(elapsedViewingMs(sample(0,120),sample(200,120.2))).toBe(200)
 expect(elapsedViewingMs(sample(200,120.2),sample(400,480))).toBe(0)
 expect(elapsedViewingMs(sample(400,480),sample(600,480.2))).toBe(200)
 expect(elapsedViewingMs(sample(600,480.2),sample(800,90))).toBe(0)
})
it('excludes paused, buffering, stalled, and time between clips',()=>{
 expect(elapsedViewingMs(sample(0,0,false),sample(200,0,false))).toBe(0)
 expect(elapsedViewingMs(sample(0,0),sample(200,0))).toBe(0)
 expect(elapsedViewingMs(sample(0,0),sample(60000,60))).toBe(0)
 expect(elapsedViewingMs(sample(0,0),sample(200,0.2,false))).toBe(0)
})
it('charges elapsed wall time at every playback speed',()=>{
 for(const rate of [.5,1,2])expect(elapsedViewingMs(sample(0,120,true,rate),sample(200,120+.2*rate,true,rate))).toBe(200)
})
