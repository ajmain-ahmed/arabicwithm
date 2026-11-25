import {test} from 'node:test'
import assert from 'node:assert/strict'
import {preparePlan,contentHash} from './prepare.mjs'
const content=[{tokens:[{arabic:'كِتَابٌ',english:'book',pos:'noun',cefr:'A1',transliteration:'kitābun',entry_type:'word',headword:'كتاب'}],translation:'A book.'}]
const entry={number:1,englishTitle:'One',arabicTitle:'وَاحِدٌ',file:'one.json',status:'completed',completionEvidence:'Verified source progress'}
const manifest={destination:{id:'book',slug:'book',title:'A book',isCompleted:false,hasChapterPublication:false},chapters:[entry]}
const load=async()=>JSON.stringify(content)
test('missing becomes present after a successful save; a rerun cannot propose a duplicate',async()=>{
 const first=await preparePlan(manifest,[],load);assert.equal(first.chapters[0].result,'ready-to-import')
 const existing=[{id:'one',book_id:'book',slug:'book-1',chapter_number:1,title:first.chapters[0].title,content}]
 assert.equal((await preparePlan(manifest,existing,load)).chapters[0].result,'already-present')
 assert.equal((await preparePlan(manifest,[{...existing[0],title:'One'}],load)).chapters[0].result,'already-present')
})
test('different content at the same chapter identity is a conflict, never an overwrite',async()=>{
 const existing=[{id:'one',book_id:'book',slug:'book-1',chapter_number:1,title:'One',content:[]}]
 const result=await preparePlan(manifest,existing,load);assert.equal(result.chapters[0].result,'conflict');assert.equal(result.writesPerformed,0)
})
test('object key order is ignored but content, diacritics and array order are preserved',()=>{
 assert.equal(contentHash({a:1,b:2}),contentHash({b:2,a:1}))
 assert.notEqual(contentHash('كِتَابٌ'),contentHash('كتاب'))
 assert.notEqual(contentHash([1,2]),contentHash([2,1]))
})
test('mixed-book snapshots are rejected rather than treating other chapters as absent',async()=>{
 await assert.rejects(preparePlan(manifest,[{book_id:'other',content}],load),/this Book only/)
})
test('existing website grammar validation errors are retained',async()=>{
 const invalid=[{...content[0],tokens:[{...content[0].tokens[0],syntactic_role:'wrong'}]}]
 const result=await preparePlan(manifest,[],async()=>JSON.stringify(invalid));assert.equal(result.chapters[0].result,'invalid');assert.match(result.chapters[0].reason,/syntactic_role/)
})
test('metadata-free, unfinished and empty source data are never ready to import',async()=>{
 for(const changes of [{arabicTitle:''},{status:'draft'},{completionEvidence:''}])assert.equal((await preparePlan({...manifest,chapters:[{...entry,...changes}]},[],load)).chapters[0].result,'invalid')
 assert.equal((await preparePlan(manifest,[],async()=>'[]')).chapters[0].result,'invalid')
})
test('legacy publication schemas reject draft imports into completed Books',async()=>{
 const result=await preparePlan({...manifest,destination:{...manifest.destination,isCompleted:true}},[],load);assert.equal(result.chapters[0].result,'blocked')
})
test('duplicate source revisions cannot both become import candidates',async()=>{
 const result=await preparePlan({...manifest,chapters:[entry,entry]},[],load);assert.equal(result.totals['ready-to-import'],0);assert.equal(result.totals.invalid,2)
})
test('identical payloads at two source numbers block both candidates',async()=>{
 const result=await preparePlan({...manifest,chapters:[entry,{...entry,number:2}]},[],load);assert.equal(result.totals['ready-to-import'],0);assert.equal(result.totals.invalid,2)
})
