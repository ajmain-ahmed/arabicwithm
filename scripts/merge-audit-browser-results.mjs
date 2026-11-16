import { readFileSync, writeFileSync } from 'node:fs'
const root='docs/validation/full-reliability/'
const files=['browser-initial-results.json','browser-discovery-results.json','browser-followup-results.json']
const reports=files.map(file=>JSON.parse(readFileSync(root+file,'utf8')))
const records=new Map(),history=new Map()
function collect(suites,file){for(const suite of suites??[]){for(const spec of suite.specs??[])for(const test of spec.tests){const key=spec.title+'|'+test.projectName;records.set(key,test);history.set(key,[...history.get(key)??[],{file,status:test.results.at(-1)?.status}])}collect(suite.suites,file)}}
reports.forEach((report,index)=>collect(report.suites,files[index]))
const combined=structuredClone(reports[0])
function update(suites){for(const suite of suites??[]){for(const spec of suite.specs??[]){spec.tests=spec.tests.map(test=>{const key=spec.title+'|'+test.projectName;return {...records.get(key),auditRuns:history.get(key)}});spec.ok=spec.tests.every(test=>test.results.at(-1)?.status==='passed')}update(suite.suites)}}
update(combined.suites)
combined.audit={scope:'Final unique scenario outcomes across the full run and explicitly targeted follow-ups; see raw reports for every attempt.',runs:files.map((file,index)=>({file,stats:reports[index].stats}))}
const tests=[...records.values()]
combined.stats={startTime:reports[0].stats.startTime,duration:reports.reduce((sum,report)=>sum+report.stats.duration,0),expected:tests.filter(test=>test.results.at(-1)?.status==='passed').length,unexpected:tests.filter(test=>test.results.at(-1)?.status==='failed'||test.results.at(-1)?.status==='timedOut').length,skipped:tests.filter(test=>test.results.at(-1)?.status==='skipped').length,flaky:0}
writeFileSync(root+'browser-results.json',JSON.stringify(combined,null,2))
console.log(JSON.stringify(combined.stats))
