// @vitest-environment node
import { PGlite } from '@electric-sql/pglite'
import { readFileSync } from 'node:fs'
import { afterAll, beforeAll, expect, it } from 'vitest'

let db: PGlite
const chapter='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',book='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',transcript='cccccccc-cccc-4ccc-8ccc-cccccccccccc'
const paragraph={tokens:[{arabic:'كَتَبَ',pos:'verb',cefr:'b1'},{arabic:'الطَّالِبُ',pos:'noun',syntactic_role:{arabic:'فَاعِلٌ',english:'Subject/doer'},grammatical_case:{arabic:'مَرْفُوعٌ',english:'Nominative'}},{arabic:'دَرْسًا',pos:'noun'}],translation:'The student wrote a lesson.'}
beforeAll(async()=>{
 db=new PGlite()
 await db.exec(`create role anon;create role authenticated;create schema private;create schema auth;
 create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
 create table public.books(id uuid primary key);
 create table public.chapters(id uuid primary key,book_id uuid references public.books(id),chapter_number integer,content jsonb);
 create table public.youtube_transcripts(id uuid primary key,raw_transcript jsonb,status text,source_origin text,searchable boolean default false,explore_published boolean default false);
 create table public.transcript_segments(id bigint primary key,transcript_id uuid references public.youtube_transcripts(id) on delete cascade,canonical_paragraph jsonb,original_text text,english_text text,start_seconds double precision,for_you_manual_excluded boolean default false,for_you_music_only boolean default false,for_you_theme_score real default 0);
 grant usage on schema public,private,auth to authenticated;grant execute on function auth.uid() to authenticated;`)
 await db.exec(readFileSync('supabase/migrations/20261021214844_website_grammar_question_bank.sql','utf8'))
 await db.exec(readFileSync('supabase/migrations/20261021215825_website_grammar_canonical_precedence.sql','utf8'))
 await db.exec(`select set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',false)`)
},60000)
afterAll(async()=>{await db?.close()})
it('automatically indexes inserted chapters, updates changed facts and removes deletions',async()=>{
 await db.query('insert into public.books values($1)',[book])
 await db.query('insert into public.chapters values($1,$2,1,$3)',[chapter,book,JSON.stringify([paragraph])])
 const rows=await db.query<{payload:{facts:unknown[]};modes:string[]}>('select payload,modes from private.website_grammar_sources where chapter_id=$1',[chapter])
 expect(rows.rows).toHaveLength(1);expect(rows.rows[0].modes).toEqual(['grammatical_case','sentence_role','word_type'])
 const changed=structuredClone(paragraph);delete (changed.tokens[1] as Record<string,unknown>).syntactic_role
 await db.query('update public.chapters set content=$1 where id=$2',[JSON.stringify([changed]),chapter])
 expect((await db.query<{modes:string[]}>('select modes from private.website_grammar_sources where chapter_id=$1',[chapter])).rows[0].modes).not.toContain('sentence_role')
 await db.query('delete from public.chapters where id=$1',[chapter]);expect((await db.query('select * from private.website_grammar_sources where chapter_id=$1',[chapter])).rows).toHaveLength(0)
})
it('uses exact raw import metadata when a transcript projection omits labels; publication is checked on every fetch',async()=>{
 const projected=structuredClone(paragraph);delete (projected.tokens[1] as Record<string,unknown>).syntactic_role
 await db.query('insert into public.youtube_transcripts values($1,$2,$3,$4,true,false)',[transcript,JSON.stringify({content:[{text:'كَتَبَ الطَّالِبُ دَرْسًا',offset:1000,tokens:paragraph.tokens,english:paragraph.translation}]}),'ready','website_admin_transcript'])
 await db.query('insert into public.transcript_segments(id,transcript_id,canonical_paragraph,original_text,start_seconds) values(1,$1,$2,$3,1)',[transcript,JSON.stringify(projected),'كَتَبَ الطَّالِبُ دَرْسًا'])
 const query="select public.website_grammar_candidates('sentence_role','test','{}',null) data"
 const result=await db.query<{data:{sentence_hash:string}[]}>(query);expect(result.rows[0].data).toHaveLength(1)
 expect((await db.query<{data:unknown[]}>('select public.website_grammar_candidates($1,$2,$3,$4) data',['sentence_role','test',[result.rows[0].data[0].sentence_hash],null])).rows[0].data).toHaveLength(0)
 await db.query('update public.youtube_transcripts set searchable=false where id=$1',[transcript]);expect((await db.query<{data:unknown[]}>(query)).rows[0].data).toHaveLength(0)
 await db.query('update public.youtube_transcripts set explore_published=true where id=$1',[transcript]);expect((await db.query<{data:unknown[]}>(query)).rows[0].data).toHaveLength(1)
 const invalidated=structuredClone(projected);(invalidated.tokens[1] as Record<string,unknown>).syntactic_role=null
 await db.query('update public.transcript_segments set canonical_paragraph=$1 where id=1',[JSON.stringify(invalidated)]);expect((await db.query<{data:unknown[]}>(query)).rows[0].data).toHaveLength(0)
 await db.query('delete from public.transcript_segments where id=1');expect((await db.query('select * from private.website_grammar_sources where segment_id=1')).rows).toHaveLength(0)
})
it('rejects incomplete/unknown facts without inventing grammar and blocks anonymous or direct table access',async()=>{
 for(const invalid of [null,{}, {tokens:[]}, {...paragraph,translation:'[inaudible]'}, {...paragraph,tokens:[{arabic:'!!!',pos:'noun'},{arabic:'...',pos:'noun'}]}])expect((await db.query<{data:unknown}>('select private.website_grammar_extract($1) data',[JSON.stringify(invalid)])).rows[0].data).toBeNull()
 expect((await db.query<{allowed:boolean}>("select has_table_privilege('authenticated','private.website_grammar_sources','select') allowed")).rows[0].allowed).toBe(false)
 expect((await db.query<{allowed:boolean}>("select has_function_privilege('anon','public.website_grammar_candidates(text,text,text[],integer)','execute') allowed")).rows[0].allowed).toBe(false)
 await db.exec("select set_config('request.jwt.claim.sub','',false)")
 await expect(db.query("select public.website_grammar_candidates('word_type','test')")).rejects.toThrow('Sign in')
})
