import {readFileSync,writeFileSync,readdirSync} from 'node:fs'
import {join} from 'node:path'
const root='docs/validation/safari-admin/'
const initial=JSON.parse(readFileSync(root+'browser-admin-initial.json','utf8'))
const tests=[]
function collect(suites){for(const suite of suites??[]){for(const spec of suite.specs??[])for(const test of spec.tests)tests.push({title:spec.title,project:test.projectName,status:test.results.at(-1)?.status});collect(suite.suites)}}
collect(initial.suites)
function routes(dir='app/(admin)/admin',prefix='/admin'){return readdirSync(dir,{withFileTypes:true}).flatMap(entry=>entry.isDirectory()?routes(join(dir,entry.name),prefix+'/'+entry.name):entry.name==='page.tsx'?[prefix]:[])}
const browsers=['webkit','chrome','firefox','edge']
const rows=routes().sort().map(route=>{
 const concrete=route.replace('[chapterId]','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb').replace('[episodeId]','dddddddd-dddd-4ddd-8ddd-ddddddddddd0')
 const states=Object.fromEntries(browsers.map(browser=>[browser,tests.find(test=>test.title==='route lifecycle '+concrete&&test.project===browser)?.status==='passed'?'PASS':'BLOCKED']))
 // The initial fixture omitted this RPC: a shell smoke pass is insufficient.
 if(route==='/admin/grammar-notes')for(const browser of browsers)states[browser]='BLOCKED'
 return {route,...states,status:Object.values(states).every(value=>value==='PASS')?'PASS':'BLOCKED',cause:route==='/admin/books'||route==='/admin/books/[chapterId]'?'Production projection selected missing chapters.is_published; application compatibility reader repaired. Dedicated Books controls have separate evidence.':route==='/admin/grammar-notes'?'Initial fixture lacked dashboard RPC data; use the final dedicated diagnostics check, not shell-only smoke.':states.webkit==='BLOCKED'?'WebKit lifecycle recorded navigation-cancelled request diagnostics; strict zero-error acceptance remains outstanding.':'Lifecycle smoke; not exhaustive mutation certification.'}
})
const text='# Admin route health matrix\n\nCurrent source routes. Initial four-browser lifecycle checks include direct entry, refresh, Back/Forward and a fresh tab. BLOCKED retains strict cancellation-error failures; it does not imply authorization bypass. Dedicated final Books and Grammar checks are linked in the audit report. Real authenticated production QA remains unavailable.\n\n| Route | WebKit | Chrome | Firefox | Edge | Status | Root cause / scope |\n|---|---|---|---|---|---|---|\n'+rows.map(row=>`| ${row.route} | ${row.webkit} | ${row.chrome} | ${row.firefox} | ${row.edge} | ${row.status} | ${row.cause} |`).join('\n')+'\n'
writeFileSync(root+'admin-route-matrix.md',text)
writeFileSync(root+'admin-route-matrix.json',JSON.stringify(rows,null,2)+'\n')
console.log(JSON.stringify({routes:rows.length,initialRun:initial.stats}))
