import { Blob as NativeBlob } from 'node:buffer'
import { afterEach,expect,it,vi } from 'vitest'
import { writeCorrectionClipboard } from './correctionClipboard'
afterEach(()=>vi.unstubAllGlobals())
it('starts a deferred clipboard write during the click while waiting for verified data',async()=>{
 let data!:Promise<Blob>,resolve!:(value:string)=>void
 vi.stubGlobal('Blob',NativeBlob)
 vi.stubGlobal('ClipboardItem',class{constructor(values:Record<string,Promise<Blob>>){data=values['text/plain']}})
 const write=vi.fn(()=>data.then(()=>undefined))
 Object.defineProperty(navigator,'clipboard',{configurable:true,value:{write}})
 const text=new Promise<string>(finish=>{resolve=finish})
 const copying=writeCorrectionClipboard(text)
 expect(write).toHaveBeenCalledTimes(1)
 resolve('Original:\nVerified original\n\nSuggestion:\nVerified comment')
 await copying;expect(await(await data).text()).toBe('Original:\nVerified original\n\nSuggestion:\nVerified comment')
})
it('does not produce clipboard data when server verification fails',async()=>{
 vi.stubGlobal('ClipboardItem',class{constructor(public values:Record<string,Promise<Blob>>){}})
 const write=vi.fn(async(items:{values:Record<string,Promise<Blob>>}[])=>{await items[0].values['text/plain']})
 Object.defineProperty(navigator,'clipboard',{configurable:true,value:{write}})
 await expect(writeCorrectionClipboard(Promise.reject(new Error('Forbidden')))).rejects.toThrow('Forbidden')
})
