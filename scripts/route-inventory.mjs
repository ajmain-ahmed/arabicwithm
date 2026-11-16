import { readdirSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import path from 'node:path'
const found=[]
function walk(dir){for(const entry of readdirSync(dir,{withFileTypes:true})){const file=path.join(dir,entry.name);if(entry.isDirectory())walk(file);else if(['page.tsx','route.ts'].includes(entry.name)){
 const route='/'+path.relative('app',path.dirname(file)).split(path.sep).filter(part=>part&&!/^\(.+\)$/.test(part)).join('/')
 found.push({route,file:file.replaceAll('\\','/'),type:entry.name==='page.tsx'?'page':'handler'})
}}}
walk('app');found.sort((a,b)=>a.route.localeCompare(b.route))
mkdirSync('docs/validation/full-reliability',{recursive:true})
writeFileSync('docs/validation/full-reliability/route-inventory.json',JSON.stringify(found,null,2))
console.log(`${found.filter(r=>r.type==='page').length} page routes; ${found.filter(r=>r.type==='handler').length} handlers`)
