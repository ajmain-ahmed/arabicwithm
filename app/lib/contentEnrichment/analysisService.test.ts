// @vitest-environment node
import {expect,it,vi} from 'vitest'
import {z} from 'zod'
import {grammarOutput} from './grammar'
import {handleGrammarAnalysis} from '@/supabase/functions/transcript-library/grammar-analysis'
const body={task:'awm-grammar-v1',requestId:'source-hash',rules:[],schema:z.toJSONSchema(grammarOutput),units:[{unitKey:'u0',arabic:'لَمْ يَكْتُبْ.'}]}
const request=(value:unknown=body,token='server-token')=>new Request('https://fixture.example/grammar-analysis',{method:'POST',headers:{Authorization:`Bearer ${token}`},body:JSON.stringify(value)})
const config={token:'server-token',openAIKey:'model-secret'}
it('fails closed before any model request for missing or incorrect auth/config',async()=>{
 const fetcher=vi.fn()
 expect((await handleGrammarAnalysis(request(body,'wrong'),config,fetcher)).status).toBe(401)
 expect((await handleGrammarAnalysis(request(),{},fetcher)).status).toBe(503)
 expect(fetcher).not.toHaveBeenCalled()
})
it('implements the existing contract with server-only model auth and rejects fabricated evidence',async()=>{
 const note={unitKey:'u0',highlight:'لَمْ يَكْتُبْ',cefr:'B1',ruleKey:'lam-jussive',titleEn:'The verb after lam',titleAr:'جزم المضارع',explanation:'Notice the verb ending: lam makes this verb jussive (مَجْزُومٌ).',detail:'',mechanics:'',recognitionTip:'',exampleExplanation:'',confidence:0.95,category:'nahw',transformations:[]}
 const fetcher=vi.fn().mockImplementation(async()=>Response.json({status:'completed',output:[{content:[{type:'output_text',text:JSON.stringify({notes:[note]})}]}]}))
 const response=await handleGrammarAnalysis(request(),config,fetcher)
 expect(response.status).toBe(200);expect(await response.json()).toEqual({notes:[note]})
 const options=fetcher.mock.calls[0][1];expect(options.headers.Authorization).toBe('Bearer model-secret')
 const sent=JSON.parse(options.body);expect(sent.store).toBe(false);expect(sent.text.format.strict).toBe(true);expect(sent.instructions).toContain('no transliteration')
 note.highlight='invented';expect((await handleGrammarAnalysis(request(),config,fetcher)).status).toBe(502)
})
it('rejects malformed contracts and isolates model failures without source writers',async()=>{
 const fetcher=vi.fn().mockResolvedValue(new Response('',{status:503}))
 expect((await handleGrammarAnalysis(request({...body,task:'other'}),config,fetcher)).status).toBe(400)
 expect(fetcher).not.toHaveBeenCalled()
 expect((await handleGrammarAnalysis(request(),config,fetcher)).status).toBe(502)
})
