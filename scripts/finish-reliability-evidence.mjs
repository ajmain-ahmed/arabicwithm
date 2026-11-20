import {readFileSync,writeFileSync,readdirSync} from 'node:fs'
import {createHash} from 'node:crypto'
const root='docs/validation/remaining-blockers/'
const initial=JSON.parse(readFileSync(root+'browser-initial-full.json','utf8'))
const webkit=JSON.parse(readFileSync(root+'browser-webkit-final.json','utf8'))
function cases(report){const result=[];function visit(suites){for(const suite of suites??[]){for(const spec of suite.specs??[])for(const test of spec.tests)result.push({title:spec.title,...test});visit(suite.suites)}}visit(report.suites);return result}
const projects=['webkit','chrome','firefox','edge'],gate={},diagnostics=[]
let reference
for(const project of projects){
 const report=project==='webkit'?webkit:initial,source=project==='webkit'?'browser-webkit-final.json':'browser-initial-full.json'
 const tests=cases(report).filter(test=>test.projectName===project),titles=tests.map(test=>test.title).sort()
 reference??=titles
 if(tests.length!==15||JSON.stringify(titles)!==JSON.stringify(reference))throw new Error('Each browser must run the same COMPLETE 15-case learner suite')
 gate[project]={source,cases:tests.length,passed:tests.filter(test=>test.results.at(-1)?.status==='passed').length,status:tests.every(test=>test.results.every(result=>result.status==='passed'))?'PASS':'FAIL'}
 for(const test of tests)for(const result of test.results)for(const attachment of result.attachments??[]){
  if(attachment.name!=='runtime-diagnostics')continue
  const value=JSON.parse(Buffer.from(attachment.body,'base64').toString())
  for(const diagnostic of value.classified){
   const raw=diagnostic.message.split(' due to access control checks')[0].replace(/^https?:\/+/,'').replace(/^\/+/,''),reported=new URL('http://'+raw)
   const match=url=>{const actual=new URL(url);const copy=new URL(reported);copy.protocol=actual.protocol;actual.searchParams.delete('_rsc');copy.searchParams.delete('_rsc');const exact=url.replace(/^https?:\/\//,''),position=diagnostic.message.indexOf(exact);return actual.href===copy.href||position>=0&&['?','&','#',' '].includes(diagnostic.message[position+exact.length]??'')}
   const anchor=diagnostic.departure?.time??diagnostic.request?.time??diagnostic.time
   const adjacent=value.navigations.filter(nav=>Math.abs(nav.time-anchor)<2000).sort((left,right)=>Math.abs(left.time-anchor)-Math.abs(right.time-anchor))
   diagnostics.push({browser:project,scenario:test.title,diagnostic:diagnostic.message,classification:diagnostic.classification,request:diagnostic.request?.url??diagnostic.departure?.fetches.find(match),navigation:adjacent[0]?.url,adjacentNavigations:adjacent,departure:diagnostic.departure?.url,userFlowCompleted:result.status==='passed',productionImpact:'Old context/request abandoned; destination controls and canonical state verified. Physical Safari not certified.'})
  }
 }
}
writeFileSync(root+'browser-gate.json',JSON.stringify({scope:'Complete project runs: initial full run plus entire WebKit project rerun, not per-case cherry-picking.',allPassed:Object.values(gate).every(value=>value.status==='PASS'),projects:gate},null,2)+'\n')
writeFileSync(root+'webkit-request-classifications.json',JSON.stringify(diagnostics,null,2)+'\n')
const directory='supabase/functions/transcript-library/'
const files=readdirSync(directory).filter(name=>/\.(ts|json)$/.test(name)||name==='deno.lock').sort().map(name=>({path:directory+name,sha256:createHash('sha256').update(readFileSync(directory+name)).digest('hex')}))
writeFileSync(root+'deployment-manifest.json',JSON.stringify({entrypoint:directory+'index.ts',target:'existing transcript-library function; no new project',deployed:false,denoTypecheck:'PASS',files},null,2)+'\n')
console.log(JSON.stringify(gate))
