import {readFile,writeFile} from 'node:fs/promises'
import {resolve,dirname} from 'node:path'
import {fileURLToPath,pathToFileURL} from 'node:url'
import {createHash} from 'node:crypto'
const root=fileURLToPath(new URL('../../../../',import.meta.url))
const {validateBookTokenGrammar}=await import(pathToFileURL(resolve(root,'app/lib/bookTokenGrammar.ts')).href)
const {validateAdditionalStructuredChapter,detectChapterFormat}=await import(pathToFileURL(resolve(root,'app/lib/structuredChapter.ts')).href)
const object=value=>Boolean(value&&typeof value==='object'&&!Array.isArray(value))
export function canonical(value){
 if(Array.isArray(value))return value.map(canonical)
 if(object(value))return Object.fromEntries(Object.keys(value).sort().map(key=>[key,canonical(value[key])]))
 return value
}
export const contentHash=value=>createHash('sha256').update(JSON.stringify(canonical(value))).digest('hex')
export function validateContent(content){
 validateBookTokenGrammar(content);validateAdditionalStructuredChapter(content)
 const format=detectChapterFormat(content)
 if(format.kind==='structured'){
  if(!content.sections.some(section=>Array.isArray(section?.blocks)&&section.blocks.length))throw new Error('No readable structured chapter blocks.')
  return
 }
 if(!Array.isArray(content)||!content.length)throw new Error('Expected a nonempty canonical token-block array or supported structured chapter.')
 for(const [i,block] of content.entries()){
  if(!object(block)||!Array.isArray(block.tokens)||!block.tokens.length||typeof block.translation!=='string'||!block.translation.trim())throw new Error(`Sentence ${i+1}: missing tokens or translation.`)
  for(const [j,token] of block.tokens.entries()){
   if(!object(token))throw new Error(`Sentence ${i+1}, token ${j+1}: expected an object.`)
   for(const field of ['arabic','english','pos','cefr','transliteration'])if(typeof token[field]!=='string'||!token[field].trim())throw new Error(`Sentence ${i+1}, token ${j+1}: missing ${field}.`)
   if(!['word','phrase'].includes(token.entry_type)||!(token.headword===null||typeof token.headword==='string'))throw new Error(`Sentence ${i+1}, token ${j+1}: invalid entry_type or headword.`)
   if(!['A1','A2','B1','B2','C1','C2'].includes(token.cefr.toUpperCase()))throw new Error(`Sentence ${i+1}, token ${j+1}: invalid CEFR.`)
  }
 }
}
export async function preparePlan(manifest,existing,load){
 const book=manifest.destination
 if(!object(book)||!book.id||!book.slug||!book.title||typeof book.isCompleted!=='boolean'||typeof book.hasChapterPublication!=='boolean')throw new Error('A verified destination and publication-schema snapshot are required.')
 if(!Array.isArray(existing)||existing.some(row=>!object(row)||row.book_id!==book.id||!('content' in row)))throw new Error('Supply a complete content snapshot for this Book only.')
 if(!Array.isArray(manifest.chapters)||!manifest.chapters.length)throw new Error('No completed chapter candidates supplied.')
 const counts=(key)=>manifest.chapters.reduce((map,chapter)=>{const value=key(chapter);map.set(value,(map.get(value)??0)+1);return map},new Map())
 const numbers=counts(chapter=>chapter.number),slugs=counts(chapter=>chapter.slug??`${book.slug}-${chapter.number}`),chapters=[]
 for(const chapter of manifest.chapters){
  const row={number:chapter.number,englishTitle:chapter.englishTitle,arabicTitle:chapter.arabicTitle,file:chapter.file,sourceUrl:chapter.sourceUrl,readerVerification:'pending'}
  try{
   if(chapter.status!=='completed'||!chapter.completionEvidence)throw new Error('Verified completion evidence is required.')
   if(!Number.isSafeInteger(chapter.number)||chapter.number<1||typeof chapter.englishTitle!=='string'||!chapter.englishTitle.trim()||typeof chapter.arabicTitle!=='string'||!/[\u064b-\u065f\u0670]/u.test(chapter.arabicTitle)||!chapter.file)throw new Error('Verified chapter number, bilingual titles and source file are required.')
   row.slug=chapter.slug??`${book.slug}-${chapter.number}`
   row.title=`${chapter.englishTitle} — ${chapter.arabicTitle}`
   if(!/^[\p{L}\p{N}_-]+$/u.test(row.slug))throw new Error('Invalid chapter slug.')
   if(numbers.get(chapter.number)>1||slugs.get(row.slug)>1)throw new Error('Multiple source revisions for the same chapter: resolve before importing.')
   const content=JSON.parse(await load(chapter.file))
   validateContent(content);row.hash=contentHash(content)
   row.blocks=Array.isArray(content)?content.length:content.sections.length
   row.tokens=Array.isArray(content)?content.reduce((total,b)=>total+b.tokens.length,0):undefined
   const candidates=existing.filter(old=>old.chapter_number===chapter.number||old.slug===row.slug||old.title===chapter.englishTitle||old.title===row.title||contentHash(old.content)===row.hash)
   if(candidates.length){
    const same=candidates.length===1&&candidates[0].chapter_number===chapter.number&&candidates[0].slug===row.slug&&[chapter.englishTitle,row.title].includes(candidates[0].title)&&contentHash(candidates[0].content)===row.hash
    row.result=same?'already-present':'conflict';row.existingIds=candidates.map(old=>old.id)
   }else if(!book.hasChapterPublication&&book.isCompleted){row.result='blocked';row.reason='Legacy schema cannot keep a new chapter private in a completed Book.'}
   else row.result='ready-to-import'
  }catch(error){row.result='invalid';row.reason=error.message}
  chapters.push(row)
 }
 for(const row of chapters)if(row.hash&&chapters.filter(other=>other.hash===row.hash).length>1){row.result='invalid';row.reason='Duplicate source content under multiple chapter identities.'}
 return {destination:book,source:manifest.source,chapters,totals:Object.fromEntries(['discovered','ready-to-import','already-present','conflict','invalid','blocked'].map(key=>[key,key==='discovered'?chapters.length:chapters.filter(row=>row.result===key).length])),writesPerformed:0}
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const args=process.argv.slice(2),get=flag=>args[args.indexOf(flag)+1]
 if(!args.includes('--manifest')||!args.includes('--existing')||!args.includes('--out'))throw new Error('Usage: node prepare.mjs --manifest manifest.json --existing existing.json --out plan.json')
 const manifestFile=resolve(get('--manifest')),manifest=JSON.parse(await readFile(manifestFile,'utf8')),existing=JSON.parse(await readFile(resolve(get('--existing')),'utf8'))
 const plan=await preparePlan(manifest,existing,file=>readFile(resolve(dirname(manifestFile),file),'utf8'))
 await writeFile(resolve(get('--out')),JSON.stringify(plan,null,2)+'\n','utf8')
 console.log(JSON.stringify(plan.totals))
 if(plan.totals.invalid||plan.totals.conflict||plan.totals.blocked)process.exitCode=2
}
