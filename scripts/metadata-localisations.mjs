#!/usr/bin/env node
// Node 24+ (native TypeScript stripping). No translation provider integration.
import {createClient} from '@supabase/supabase-js'
import {createHash} from 'node:crypto'
import {mkdir,readFile,stat,writeFile} from 'node:fs/promises'
import path from 'node:path'
import {assessBulkRow,bulkEntities,parseBulkFile} from '../app/lib/localisation/bulk.ts'

const args=process.argv.slice(2),command=args.shift(),options={}
for(let i=0;i<args.length;i++){if(args[i]==='--apply')options.apply=true;else if(args[i].startsWith('--')&&args[i+1]&&!args[i+1].startsWith('--'))options[args[i].slice(2)]=args[++i];else throw new Error('Unknown or incomplete argument. Use --help.')}
if(!command||command==='--help'){
 console.log(`£0 metadata workflow — no translation APIs or paid fallback.
Node 24+: node --env-file=.env.local scripts/metadata-localisations.mjs COMMAND
  export --admin-user UUID --entity book|chapter|show|episode|transcript|transcript_group --out artifacts/localisation/batch.json [--after UUID]
  preview --admin-user UUID --file artifacts/localisation/completed.json
  import --admin-user UUID --file artifacts/localisation/completed.json --apply
Export scans up to 50 records. Repeat using the printed next cursor.
Fill only arabic. Import inserts new drafts only; existing values are preserved.
Use Admin content editors to review/approve. No source/publication writes.`)
 process.exit(0)
}
const uuid=/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i
const fingerprint=text=>createHash('sha256').update(text).digest('hex')
const definitions={book:['books','id,title,title_ar,description'],show:['shows','id,title,title_ar,description'],chapter:['chapters','id,title'],episode:['episodes','id,title,description'],transcript:['youtube_transcripts','id,title'],transcript_group:['transcript_groups','id,name']}
async function main(){
 if(!['export','preview','import'].includes(command))throw new Error('Unknown command. Use --help.')
 if(!uuid.test(options['admin-user']??''))throw new Error('Supply the verified Admin user UUID with --admin-user.')
 if(!process.env.SUPABASE_URL||!process.env.SUPABASE_SERVICE_KEY)throw new Error('Existing server environment is required; never paste credentials into arguments.')
 const db=createClient(process.env.SUPABASE_URL,process.env.SUPABASE_SERVICE_KEY,{auth:{persistSession:false,autoRefreshToken:false},global:{fetch:(url,init)=>fetch(url,{...init,signal:AbortSignal.timeout(15000)})}})
 const {data:role,error:roleError}=await db.rpc('account_role',{p_user_id:options['admin-user']})
 if(roleError||role!=='admin')throw new Error('Canonical Admin authorization failed.')
 async function sources(entity,ids,after){
  const [table,columns]=definitions[entity];let query=db.from(table).select(columns).order('id').limit(ids?100:51)
  if(ids)query=query.in('id',ids);if(after)query=query.gt('id',after)
  const {data,error}=await query;if(error)throw new Error('Unable to read source metadata.')
  return data.map(row=>({id:row.id,title:row.title??row.name??'',titleAr:row.title_ar,description:row.description}))
 }
 async function stored(entity,ids){
  if(!ids.length)return []
  const {data,error}=await db.from('content_localisations').select('entity_id,field,value,source_hash,status').eq('entity_type',entity).eq('locale','ar').in('entity_id',ids).limit(200)
  if(error)throw new Error('Unable to read stored translations.');return data
 }
 if(command==='export'){
  const entity=options.entity;if(!bulkEntities.includes(entity))throw new Error('Choose a supported --entity.')
  if(options.after&&!uuid.test(options.after))throw new Error('Invalid cursor.')
  if(!options.out)throw new Error('Supply --out. Existing files are never replaced.')
  const output=path.resolve(options.out),root=path.resolve('.')+path.sep
  if(!output.startsWith(root)||path.extname(output)!=='.json')throw new Error('Export to a JSON file inside this workspace.')
  const page=await sources(entity,undefined,options.after),records=page.slice(0,50),translations=await stored(entity,records.map(row=>row.id)),rows=[];let protectedFields=0,conflicts=0
  for(const source of records)for(const field of ['title','description']){
   const original=source[field];if(!original?.trim())continue
   if(field==='title'&&source.titleAr?.trim()){protectedFields++;continue}
   const existing=translations.find(row=>row.entity_id===source.id&&row.field===field)
   if(existing){if(existing.source_hash!==fingerprint(original))conflicts++;else protectedFields++;continue}
   if(/[\u0621-\u064a]/u.test(original)){protectedFields++;continue}
   rows.push({id:source.id,field,source:original,sourceHash:fingerprint(original),arabic:''})
  }
  await mkdir(path.dirname(output),{recursive:true});await writeFile(output,JSON.stringify({format:'awm-metadata-ar-v1',entity,rows},null,2)+'\n',{encoding:'utf8',flag:'wx'})
  console.log(JSON.stringify({scanned:records.length,pendingFields:rows.length,protectedFields,conflicts,next:page.length>50?records.at(-1).id:null,output,providerRequests:0}));return
 }
 if(!options.file)throw new Error('Supply --file.')
 if((await stat(options.file)).size>1_000_000)throw new Error('Import exceeds 1 MB.')
 const file=parseBulkFile(await readFile(options.file,'utf8')),ids=[...new Set(file.rows.map(row=>row.id))]
 if(!ids.length){console.log(JSON.stringify({rows:0,providerRequests:0}));return}
 const [records,translations]=await Promise.all([sources(file.entity,ids),stored(file.entity,ids)])
 const results=file.rows.map(row=>({id:row.id,field:row.field,result:assessBulkRow(row,records.find(source=>source.id===row.id),translations.find(item=>item.entity_id===row.id&&item.field===row.field),fingerprint)}))
 if(command==='import'){
  if(!options.apply)throw new Error('Import needs --apply after reviewing the preview. No rows were changed.')
  const candidates=file.rows.filter((_,i)=>results[i].result==='ready')
  if(candidates.length){
   const {data,error}=await db.from('content_localisations').upsert(candidates.map(row=>({entity_type:file.entity,entity_id:row.id,locale:'ar',field:row.field,value:row.arabic.trim(),status:'draft',source_hash:row.sourceHash,reviewed_at:null})),{onConflict:'entity_type,entity_id,locale,field',ignoreDuplicates:true}).select('entity_id,field')
   if(error)throw new Error('Draft import could not be confirmed. Preview again before retrying; existing translations will be preserved.')
   for(const result of results)if(result.result==='ready')result.result=data.some(row=>row.entity_id===result.id&&row.field===result.field)?'imported':'conflict'
  }
 }
 console.log(JSON.stringify({mode:command,results,providerRequests:0},null,2))
}
try{await main()}catch(error){console.error(error instanceof Error?error.message:'Metadata operation failed. No provider request was made.');process.exitCode=1}
