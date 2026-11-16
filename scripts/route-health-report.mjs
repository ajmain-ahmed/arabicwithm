import { readFileSync, writeFileSync } from 'node:fs'
const root='docs/validation/full-reliability/'
const inventory=JSON.parse(readFileSync(root+'route-inventory.json','utf8'))
const report=JSON.parse(readFileSync(root+'browser-results.json','utf8'))
const specs=[]
function collect(suites){for(const suite of suites??[]){specs.push(...suite.specs??[]);collect(suite.suites)}}
collect(report.suites)
function passed(text){const tests=specs.filter(spec=>spec.title.includes(text)).flatMap(spec=>spec.tests);return new Set(tests.map(test=>test.projectName)).size===2&&tests.every(test=>test.results.at(-1)?.status==='passed')}
const direct=passed('every public route'),flows=passed('connected learner flows'),roles=passed('URL tabs'),admin=passed('all protected route'),discovery=passed('Explore and For You')
const flowRoutes=new Set(['/learn','/grammar','/grammar/context','/grammar/context/[level]','/grammar/notes/[id]','/cartoons/[show]','/cartoons/[show]/[episode]','/books','/books/[book]','/books/[book]/[chapter]','/memory'])
const roleRoutes=new Set(['/profile/[user]','/profile/[user]?tab=settings','/profile/[user]?tab=awm','/books?mode=listen','/cartoons?view=shows'])
const roleNavigationRoutes=new Set([...roleRoutes].filter(route=>route!=='/profile/[user]'))
const publicSmokeRoutes=new Set(['/','/explore','/explore?view=foryou','/cartoons','/cartoons?view=shows','/cartoons/[show]','/cartoons/[show]/[episode]','/books','/books?mode=listen','/books/[book]','/books/[book]/[chapter]','/listen/[book]','/learn','/grammar','/grammar/context','/grammar/context/[level]','/grammar/notes/[id]','/memory','/profile','/search','/explore/search','/word-search','/practice','/practice/session','/feedback','/support','/privacy','/terms','/reset-password','/transcripts/[id]'])
const productionReports=['production-chrome.json','production-firefox.json'].map(file=>JSON.parse(readFileSync(root+file,'utf8')))
function productionSmoke(route){
 const pattern=new RegExp('^'+route.split('/').map(part=>part.startsWith('[')?'[^/?]+':part.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')).join('/')+'$')
 return productionReports.every(rows=>rows.some(row=>pattern.test(row.path)&&row.status<400&&!row.errors?.length))
}
const fixedRoutes=new Set(['/grammar','/grammar/context','/grammar/context/[level]','/grammar/notes/[id]','/cartoons/[show]','/cartoons/[show]/[episode]','/books','/books/[book]','/books/[book]/[chapter]','/profile/[user]','/profile/[user]?tab=settings','/profile/[user]?tab=awm','/books?mode=listen','/cartoons?view=shows','/explore','/explore?view=foryou'])
const variants=[{route:'/explore?view=foryou',type:'view'},{route:'/books?mode=listen',type:'view'},{route:'/cartoons?view=shows',type:'view'},{route:'/profile/[user]?tab=settings',type:'view'},{route:'/profile/[user]?tab=awm',type:'view'},...['A1','A2','B1','B2','C1','C2'].map(level=>({route:`/grammar/context/${level}`,type:'level'}))]
const rows=[...inventory,...variants].map(item=>{
 const handler=item.type==='handler',privileged=item.route.startsWith('/admin')||item.route==='/reviewer'
 const note=item.route.startsWith('/grammar/notes'),level=item.type==='level'
 const role=roleRoutes.has(item.route),flow=flowRoutes.has(item.route)||level
 const feed=item.route==='/explore'||item.route==='/explore?view=foryou'
 const directOK=!handler&&(privileged?admin:role?roles:(publicSmokeRoutes.has(item.route)||level)&&direct)
 const navOK=!handler&&(level?item.route.endsWith('/A1')&&flows:flow?flows:roleNavigationRoutes.has(item.route)?roles:feed?discovery:false)
 const signedOutOK=!handler&&(privileged?item.route!=='/reviewer'&&admin:(publicSmokeRoutes.has(item.route)||level)&&direct)
 const productionOK=!handler&&!feed&&productionSmoke(item.route)
 const state=value=>value?'PASS':'BLOCKED'
 return {route:item.route,type:item.type,direct:state(directOK),internal:state(navOK),refresh:state(!handler&&!privileged&&directOK),back:state(navOK),forward:state(navOK),loading:state(!handler&&(level?flows:flow?flows:feed?discovery:role?roles:false)),authenticated:state(!handler&&(privileged?admin:role?roles:flow?flows:level?flows:feed?discovery:false)),signedOut:state(signedOutOK),mobile:state(!handler&&!privileged&&directOK),desktop:state(directOK),status:directOK?(fixedRoutes.has(item.route)||level?'FIXED':'PASS'):'BLOCKED',production:state(productionOK),evidence:handler?'Inventoried; production mutations/exports/auth callbacks not exercised.':privileged?'Local Admin read checks; anonymous denial tested for Admin routes. Live authenticated QA unavailable.':note?'Fixture note, examples and canonical Back pass. Production has zero canonical notes.':item.route.startsWith('/grammar/context')?'New local reader/level routes; empty production grammar tables; application not deployed.':role?'Local free/premium/Admin roles; real production account sessions unavailable.':feed?'Local controls pass. Real content observed; extended live checks retain intermittent Explore wait/Firefox PiP error, so production certification is BLOCKED.':!navOK?'Direct/refresh smoke coverage; cells marked BLOCKED were not exercised.':'Connected browser flow with explicit visible-state and history assertions.'}
})
const keys=Object.keys(rows[0]),quote=value=>'"'+String(value).replaceAll('"','""')+'"'
writeFileSync(root+'route-health-matrix.csv',[keys.join(','),...rows.map(row=>keys.map(key=>quote(row[key])).join(','))].join('\n'))
writeFileSync(root+'route-health-matrix.md','# Route health matrix\n\nScope: local repaired production build against isolated fixtures. PASS/FIXED covers observed checks, not every role/width combination. BLOCKED means unexercised or unavailable, not necessarily broken. Production application changes have not been deployed. Loading means the observed content or intended gate reached a terminal state; it does not certify every pending-request combination. Mobile smoke coverage uses 390px; connected flows add 320/430px. Desktop smoke coverage uses 1440px; connected flows add 768/1024px. Auth indicates at least the fixture role used for that flow, not all roles.\n\n'+`| Route | Direct | Internal | Refresh | Back | Forward | Loading | Auth | Out | Mobile | Desktop | Status |\n|${keys.slice(0,12).map(()=>'---').join('|')}|\n`+rows.map(row=>`| ${row.route} | ${row.direct} | ${row.internal} | ${row.refresh} | ${row.back} | ${row.forward} | ${row.loading} | ${row.authenticated} | ${row.signedOut} | ${row.mobile} | ${row.desktop} | ${row.status} |`).join('\n')+'\n\nSee the CSV for per-route evidence and separate production limitations. Its production column describes signed-out smoke observations only; live account QA is unavailable.\n')
console.log(JSON.stringify({rows:rows.length,direct,flows,roles,admin,discovery,stats:report.stats}))
