import assert from 'node:assert/strict'
import {createClient} from '@supabase/supabase-js'
import {mkdir,writeFile} from 'node:fs/promises'

// Read-only backfill. This command intentionally has no mutation path.
const output=process.argv[2]??'artifacts/phrase-crawl'
const key=text=>String(text??'').normalize('NFKC').replace(/[\u064B-\u065F\u0670\u06D6-\u06ED\u0640]/gu,'').replace(/[^\p{L}\p{N}\s]/gu,' ').replace(/\s+/gu,' ').trim().replace(/(^|\s)و\s+(?=[\u0621-\u064A])/gu,'$1و')
const expressions=[
 ['عَلَى الْفَوْرِ','ʿalā l-fawr','immediately'],['كَيْفَ تَجْرُؤُ','kayfa tajruʾu','how dare you'],
 ['إِنَّا لِلَّهِ وَإِنَّا إِلَيْهِ رَاجِعُونَ','innā li-llāhi wa innā ilayhi rājiʿūna','Indeed we belong to Allah, and to Him we return'],
 ['فِي الْوَاقِعِ','fī l-wāqiʿ','in fact'],['مِنْ أَجْلِ','min ʾajli','for the sake of'],['عَلَى كُلِّ حَالٍ','ʿalā kulli ḥāl','in any case'],
 ['عَلَى الرَّغْمِ مِنْ','ʿalā r-raghmi min','despite'],['بِغَضِّ النَّظَرِ عَنْ','bi-ghaḍḍi n-naẓari ʿan','regardless of'],
 ['إِنْ شَاءَ اللَّهُ','in shāʾa llāh','God willing'],['مَا شَاءَ اللَّهُ','mā shāʾa llāh','what God has willed'],
 ['جَزَاكَ اللَّهُ خَيْرًا','jazāka llāhu khayran','May Allah reward you with goodness'],['السَّلَامُ عَلَيْكُمْ','as-salāmu ʿalaykum','peace be upon you'],
 ['وَعَلَيْكُمُ السَّلَامُ','wa-ʿalaykumu s-salām','and peace be upon you'],['لَا بَأْسَ','lā baʾs','no problem'],
 ['لَا شَكَّ','lā shakk','no doubt'],['بِكُلِّ تَأْكِيدٍ','bi-kulli taʾkīd','certainly'],['عَلَى سَبِيلِ الْمِثَالِ','ʿalā sabīli l-mithāl','for example'],
 ['بِالنِّسْبَةِ إِلَى','bi-n-nisbati ilā','with regard to'],['مِنْ نَاحِيَةٍ أُخْرَى','min nāḥiyatin ʾukhrā','on the other hand'],
 ['فِي نَفْسِ الْوَقْتِ','fī nafsi l-waqt','at the same time'],['مِنْ فَضْلِكَ','min faḍlik','please'],
 ['مَعَ السَّلَامَةِ','maʿa s-salāma','goodbye'],['أَهْلًا وَسَهْلًا','ʾahlan wa-sahlan','welcome'],['صَبَاحُ الْخَيْرِ','ṣabāḥu l-khayr','good morning'],
 ['مَسَاءُ الْخَيْرِ','masāʾu l-khayr','good evening'],['إِلَى اللِّقَاءِ','ilā l-liqāʾ','see you'],['عَلَى حَدِّ عِلْمِي','ʿalā ḥaddi ʿilmī','as far as I know'],
 ['لَا سِيَّمَا','lā siyyamā','especially'],['فِي حِينِ أَنَّ','fī ḥīni ʾanna','whereas'],['بِسْمِ اللَّهِ','bi-smi llāh','in the name of Allah'],
].map(([arabic,transliteration,english])=>({arabic,transliteration,english,key:key(arabic)})).filter(expression=>expression.key)
const inventory={},candidates=new Map(),rejected=[],seen=new Set()
let occurrences=0
function offer(arabic,transliteration,english,source,confidence,reason,cefr=null,id=null){
 const normalized=key(arabic)
 if(!/[\u0621-\u064A]/u.test(normalized)||normalized.split(' ').length<2||/https?:|\[music\]|\[applause\]/iu.test(arabic)){
  rejected.push({arabic,source,reason:'Not a usable multi-word Arabic expression'});return
 }
 const evidence=JSON.stringify([source.type==='transcript_segments'?'youtube_transcripts':source.type,source.type==='transcript_segments'?source.parent:source.id,source.position??source.unit??null,normalized])
 if(seen.has(evidence))return
 seen.add(evidence)
 occurrences++
 let item=candidates.get(normalized)
 if(!item){item={key:normalized,phrase_ar_di:arabic,phrase_tr:transliteration??'',english:english??'',cefr:/^[ABC][12]$/i.test(String(cefr??''))?String(cefr).toUpperCase():null,notes:reason,confidence,canonical_id:id,occurrences:0,sources:[]};candidates.set(normalized,item)}
 if(!item.cefr&&/^[ABC][12]$/i.test(String(cefr??'')))item.cefr=String(cefr).toUpperCase()
 item.occurrences++;item.sources.push(source)
 if(confidence===item.confidence&&(String(arabic).match(/[\u064B-\u065F]/gu)?.length??0)>(item.phrase_ar_di.match(/[\u064B-\u065F]/gu)?.length??0)&&english&&transliteration)Object.assign(item,{phrase_ar_di:arabic,phrase_tr:transliteration,english})
 if(confidence==='high'&&item.confidence!=='high')Object.assign(item,{phrase_ar_di:arabic,phrase_tr:transliteration??'',english:english??'',confidence,notes:reason})
}
function sentence(text,source){
 if(/https?:\/\/|www\./iu.test(String(text??''))){rejected.push({arabic:String(text),source,reason:'Source unit contains a URL'});return}
 for(const part of String(text??'').split(/[.!???\n]/u)){
  const normalized=' '+key(part)+' '
  for(const phrase of expressions)if(normalized.includes(' '+phrase.key+' '))offer(phrase.arabic,phrase.transliteration,phrase.english,source,'high','Conventional expression; matched within a source sentence')
 }
}
function scan(value,source){
 if(typeof value==='string'){try{return scan(JSON.parse(value),source)}catch{sentence(value,source);return 'plain'}}
 if(Array.isArray(value)&&!value.length)return 'empty'
 if(Array.isArray(value)){let tokenised=false;for(let i=0;i<value.length;i++)tokenised=scan(value[i],{...source,unit:i})==='tokenised'||tokenised;return tokenised?'tokenised':'unstructured'}
 if(!value||typeof value!=='object')return 'empty'
 if(value.schema_version&&value.sections){
  for(const section of value.sections)for(const block of section.blocks??[]){
   // Read only learner language, never answers, references or grammar metadata.
   if(['example','examples','paragraph','highlighted-sentence','collapsible','dialogue','sentence','arabic'].includes(block.type))scan(block,{...source,section:section.id})
  }
  return 'structured'
 }
 if(Array.isArray(value.tokens)||Array.isArray(value.words)){
  const tokens=value.tokens??value.words
  for(const token of tokens){
   if(token.entry_type!=='phrase'&&token.pos!=='phrase'&&key(token.arabic).split(' ').length>1&&key(token.arabic).split(' ').length<=8)offer(String(token.arabic??''),token.transliteration,token.english,source,'borderline','Multi-word authored token; phrase-level meaning needs review',token.cefr??null)
   if(token.entry_type==='phrase'||token.pos==='phrase')offer(String(token.arabic??''),token.transliteration,token.english,source,token.english&&token.transliteration?'high':'borderline','Authored phrase token',token.cefr??token.CEFR??null,token.headword??null)
  }
  sentence(tokens.map(token=>token.arabic??'').join(' '),source)
  return 'tokenised'
 }
 for(const field of ['scriptBlocks','blocks','segments','content','examples','lines'])if(Array.isArray(value[field]))scan(value[field],source)
 for(const field of ['arabic','arabicDiacritic','ar_di','text_ar','text'])if(typeof value[field]==='string')sentence(value[field],source)
 return 'unstructured'
}
async function* rows(table,columns,idColumn='id'){
 let after=null
 for(;;){
  let query=db.from(table).select(columns).order(idColumn).limit(table==='vocabulary'?500:100)
  if(after!==null)query=query.gt(idColumn,after)
  const {data,error}=await query
  if(error)throw new Error(`${table}: ${error.message}`)
  if(!data.length)break
  for(const row of data)yield row
  const next=data.at(-1)[idColumn]
  if(next===after)throw new Error('Pagination did not advance')
  after=next
 }
}
if(process.argv.includes('--self-test')){
 assert.equal(key('عَلَى الْفَوْرِ'),key('على الفور'))
 assert.equal(key('إنا لله و إنا إليه راجعون'),key('إنا لله وإنا إليه راجعون'))
 sentence('عَلَى الْفَوْرِ',{type:'test',id:'one'})
 sentence('على الفور',{type:'test',id:'one'})
 assert.equal(candidates.size,1);assert.equal(occurrences,1)
 sentence('ذهب الطالب إلى المدرسة',{type:'test',id:'two'})
 assert.equal(candidates.size,1)
 sentence('كيف. تجرؤ',{type:'test',id:'three'})
 assert.equal(candidates.size,1)
 scan({tokens:[{arabic:'كَيْفَ تَجْرُؤُ',entry_type:'phrase',english:'how dare you',transliteration:'kayfa tajruʾu'}]},{type:'test',id:'four'})
 assert.equal(candidates.size,2)
 sentence('إِنَّا لِلَّهِ وَإِنَّا إِلَيْهِ رَاجِعُونَ',{type:'test',id:'five'})
 assert.equal(candidates.size,3)
 scan({schema_version:'1.0.0',sections:[{blocks:[{type:'grammar_label',arabic:'في الواقع'}]}],answers:[{arabic:'من أجل'}]},{type:'test',id:'six'})
 assert.equal(candidates.size,3)
 sentence('https://example.com/على-الفور',{type:'test',id:'url'})
 assert.equal(candidates.size,3)
 console.log('9 phrase extraction checks passed');process.exit(0)
}
const db=createClient(process.env.SUPABASE_URL,process.env.SUPABASE_SERVICE_KEY,{auth:{persistSession:false,autoRefreshToken:false},global:{fetch:(url,options)=>fetch(url,{...options,signal:AbortSignal.timeout(20000)})}})
const existing=[]
for await(const row of rows('phrases','id,phrase_ar_di,phrase_tr,english,cefr,notes'))existing.push(row)
const existingKeys=new Map(existing.map(row=>[key(row.phrase_ar_di),row]))
const eligibleTranscripts=new Set()
for(const [table,columns,field] of [
 ['books','id,title,is_completed',null],['shows','id,title',null],['transcript_groups','id,name,parent_id',null],
 ['chapters','id,book_id,title,content','content'],['episodes','id,show_id,title,transcript','transcript'],
 ['youtube_transcripts','id,title,source_origin,status,raw_transcript,canonical_transcript','raw_transcript'],
 ['vocabulary','word_id,word_di,word_tr,level,definitions,examples','examples'],
 ['transcript_segments','id,transcript_id,position,original_text,english_text,canonical_paragraph','canonical_paragraph'],
]){
 const stats=inventory[table]={records:0,scanned:0,tokenised:0,plain:0,structured:0,unstructured:0,empty:0,skipped:[]}
 for await(const row of rows(table,columns,table==='vocabulary'?'word_id':'id')){
  stats.records++
  if(table==='youtube_transcripts'){
   if(row.source_origin==='user_import'||row.status!=='ready'){stats.skipped.push({id:row.id,reason:row.source_origin==='user_import'?'Personal user import':'Not ready'});continue}
   eligibleTranscripts.add(row.id)
  }
  if(table==='transcript_segments'&&!eligibleTranscripts.has(row.transcript_id)){stats.skipped.push({id:row.id,reason:'Parent transcript not eligible'});continue}
  if(table==='vocabulary')for(const [index,definition] of (Array.isArray(row.definitions)?row.definitions:[]).entries())sentence(definition.simple_ar,{type:table,id:row.word_id,unit:'definition-'+index})
  if(table==='vocabulary'&&key(row.word_di).split(' ').length>1){
   const senses=Array.isArray(row.definitions)?row.definitions:[]
   const meanings=[...new Set(senses.map(sense=>sense.direct_english).filter(value=>typeof value==='string'&&value.trim()))]
   const alternative=/[/\\|]/u.test(row.word_di)
   const placeholder=/[\u0640\u2026]$|[()\[\]]/u.test(row.word_di)
   const certain=!alternative&&!placeholder&&meanings.length===1&&row.word_tr&&key(row.word_di).split(' ').length<=8&&!/[.!?\u061f]/u.test(row.word_di)
   if(alternative)rejected.push({arabic:row.word_di,source:{type:table,id:row.word_id},reason:'Alternative word forms separated by a slash; not a phrase'})
   else offer(row.word_di,row.word_tr,certain?meanings[0]:null,{type:table,id:row.word_id,unit:'lexical-entry'},certain?'high':'borderline',certain?'Authored multi-word lexical entry with one direct English meaning':'Multi-word lexical entry requires sense review',row.level??null)
  }
  if(field){
   const format=scan((table==='youtube_transcripts'&&Array.isArray(row.canonical_transcript)&&row.canonical_transcript.length?row.canonical_transcript:row[field])??(table==='transcript_segments'?(/[\u0621-\u064A]/u.test(row.original_text??'')?row.original_text:row.english_text):null),{type:table,id:row.id??row.word_id,parent:row.book_id??row.show_id??row.transcript_id,title:row.title,position:row.position})
   stats.scanned++;if(format==='tokenised')stats.tokenised++;if(format==='plain')stats.plain++;if(format==='structured')stats.structured++;if(format==='unstructured')stats.unstructured++;if(format==='empty')stats.empty++
  }
 }
 console.log(JSON.stringify({table,records:stats.records,scanned:stats.scanned}))
}
const proposed=[],alreadyExisting=[],borderline=[]
for(const item of [...candidates.values()].sort((a,b)=>a.key.localeCompare(b.key,'ar'))){
 const match=existingKeys.get(item.key)??existing.find(row=>String(row.id)===String(item.canonical_id))
 if(match){alreadyExisting.push({...item,existing_id:match.id});continue}
 if(item.confidence==='high'&&item.english&&item.phrase_tr)proposed.push(item);else borderline.push(item)
}
const priority=item=>item.notes.startsWith('Conventional')?3:item.notes.startsWith('Authored phrase')?2:1
proposed.sort((a,b)=>priority(b)-priority(a)||a.key.localeCompare(b.key,'ar'))
const report={generated_at:new Date().toISOString(),production_writes:false,inventory,summary:{candidate_phrases:candidates.size,occurrences,duplicate_occurrences:occurrences-candidates.size,already_existing:alreadyExisting.length,new_proposed:proposed.length,borderline:borderline.length,rejected:rejected.length},proposed,borderline,alreadyExisting,rejected,sample:{high:proposed.slice(0,50),borderline:borderline.slice(0,25),rejected:rejected.slice(0,25)}}
await mkdir(output,{recursive:true})
await writeFile(`${output}/dry-run.json`,JSON.stringify(report,null,2))
const fields=['phrase_ar_di','phrase_tr','english','cefr','notes']
const csv=value=>'"'+String(value??'').replaceAll('"','""')+'"'
await writeFile(`${output}/proposed.csv`,'\uFEFF'+[fields.join(','),...proposed.map(row=>fields.map(field=>csv(row[field])).join(','))].join('\n'))
console.log(JSON.stringify(report.summary))

const cell=value=>String(value??'').replaceAll('|',' / ').replaceAll('\n',' ')
const table=(items,fields)=>'| '+fields.join(' | ')+' |\n| '+fields.map(()=> '---').join(' | ')+' |\n'+items.map(item=>'| '+fields.map(field=>cell(item[field])).join(' | ')+' |').join('\n')
await writeFile(`${output}/review.md`,[
 '# Phrase crawl dry-run review',
 `Generated ${report.generated_at}. Production writes performed: NO.`,
 '## Sources',
 table(Object.entries(inventory).map(([source,stats])=>({source,...stats,skipped:stats.skipped.length})),['source','records','scanned','tokenised','plain','structured','unstructured','empty','skipped']),
 'Books, Shows and groups are parent inventories. Their Arabic content is scanned through chapters, episodes and transcripts. Personal user imports and unfinished transcripts are excluded explicitly. Website/AWM imports, canonical saved transcripts, English-source Arabic translations and vocabulary examples participate.',
 'The wider schema inventory found 22 content suggestions (unapproved or mirrored canonical edits, excluded), no dictionary-cache rows, private Memory/session/preferences state (excluded), and the Hans dictionary (lexical reference, excluded from passage extraction).',
 '## Extraction',
 JSON.stringify(report.summary,null,2),
 'Occurrences are distinct source-unit evidence, not rows to insert. Raw/canonical transcript mirrors are deduplicated where they share parent and segment position.',
 '## Proposed import',
 `There are ${proposed.length} proposed expressions. The highest-priority sample below contains up to 50. The CSV and JSON contain the complete proposal.`,
 table(proposed.slice(0,50),['phrase_ar_di','phrase_tr','english','cefr','notes']),
 '## Borderline sample',
 'These are unverified multi-word authored tokens. Ordinary fragments may be present. None are approved for automatic import.',
 table(borderline.slice(0,25),['phrase_ar_di','phrase_tr','english','notes']),
 '## Rejected sample',
 `There are ${rejected.length} rejected authored candidates. All available examples up to 25 follow.`,
 table(rejected.slice(0,25),['arabic','reason']),
 '## Fields and manual precedence',
 'The canonical table is phrases. Fields are id, phrase_ar_di, phrase_tr, english, cefr, notes, created_at and updated_at. ID is GENERATED ALWAYS AS IDENTITY and will be assigned by PostgreSQL on approved insertion. There is no stored CSV field. CSV is an export. Unknown CEFR remains empty. Existing manually curated rows are never updated. Exact, normalized and authored-ID matches are held as existing entries.',
 '## Implementation and checks',
 'scripts/phrase-crawl.mjs performs paginated server-side reads with request deadlines. It uses authored phrase metadata and a conservative reviewed expression matcher across tokens within sentence boundaries. It does not enumerate arbitrary n-grams. Re-run node --env-file=.env.local scripts/phrase-crawl.mjs to rescan future content. The current preview is CSV/JSON/Markdown, without an additional Admin interface or publication-time hooks.',
 'Nine self-checks cover Arabic normalization, clitic spacing, duplicate evidence, ordinary fragments, sentence boundaries, authored phrases, the long religious formula, and exclusion of grammar labels/answers. The initial expression-list encoding error was corrected before these review files were generated.',
 'Only source reads are implemented. No Book, Show, Episode, transcript, vocabulary or Phrase Library record has been modified. No migration is required for this dry run. A production import remains gated on explicit approval of the proposed count and content. Repeated runs overwrite local reports and cannot create database duplicates.',
].join('\n\n'))
