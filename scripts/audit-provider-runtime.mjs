import { readFileSync, mkdirSync, writeFileSync } from 'node:fs'
import { parseEnv } from 'node:util'
const env={...parseEnv(readFileSync('.env.local','utf8')),...process.env}
const names=['CONTENT_ANALYSIS_URL','CONTENT_ANALYSIS_TOKEN','CLOUDFLARE_API_TOKEN','CLOUDFLARE_ACCOUNT_ID','OPENAI_API_KEY']
const result={date:'2026-11-20',localPresence:Object.fromEntries(names.map(name=>[name,Boolean(env[name])])),deployed:'UNVERIFIED'}
if(env.CLOUDFLARE_API_TOKEN&&env.CLOUDFLARE_ACCOUNT_ID){
 const response=await fetch(`https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(env.CLOUDFLARE_ACCOUNT_ID)}/workers/scripts/arabicwithm/secrets`,{headers:{Authorization:`Bearer ${env.CLOUDFLARE_API_TOKEN}`},signal:AbortSignal.timeout(15000)})
 result.metadataHttpStatus=response.status
 if(response.ok){const body=await response.json();if(body.success){result.deployed='VERIFIED_SECRET_NAMES';result.deployedPresence=Object.fromEntries(names.slice(0,2).map(name=>[name,body.result.some(item=>item.name===name)]))}}
}
mkdirSync('docs/validation/safari-admin',{recursive:true})
writeFileSync('docs/validation/safari-admin/provider-runtime.json',JSON.stringify(result,null,2)+'\n')
console.log(JSON.stringify(result))
