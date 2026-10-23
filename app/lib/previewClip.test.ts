import {expect,it} from 'vitest'
import {previewClipWindow} from './previewClip'
const line=(id:number,start:number,end:number)=>({id,position:id,original_text:'كتاب',english_text:'book',tokens:[],start_seconds:start,end_seconds:end})
it('prefers an intact thirty-second caption window',()=>{
 expect(previewClipWindow([line(1,0,15),line(2,15,30),line(3,30,45)]).map(s=>s.id)).toEqual([1,2])
})
it('never crosses a gap or splits a caption at the hard sixty-second limit',()=>{
 const selected=previewClipWindow([line(1,0,20),line(2,30,50),line(3,50,120)])
 expect(selected).toHaveLength(1)
 expect(previewClipWindow([line(1,0,61)])).toEqual([])
})
it('allows a short final caption but rejects invalid timing',()=>{
 expect(previewClipWindow([line(1,3,6)])).toHaveLength(1)
 expect(previewClipWindow([line(1,6,3)])).toEqual([])
})
