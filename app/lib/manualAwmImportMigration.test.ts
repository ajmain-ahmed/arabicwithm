// @vitest-environment node
import {PGlite} from '@electric-sql/pglite'
import {readFileSync} from 'node:fs'
import {beforeAll,afterAll,expect,it} from 'vitest'
import {normaliseManualTranscriptJson} from './manualTranscriptJson'
let db:PGlite
const awm=JSON.parse(readFileSync('app/lib/fixtures/manual-awm-word-and-phrase.json','utf8'))
const raw=JSON.parse(readFileSync('app/lib/fixtures/manual-awm-before-source-first.json','utf8')) as ReturnType<typeof normaliseManualTranscriptJson>
let imported:string
const actor='11111111-1111-4111-8111-111111111111'
const other='22222222-2222-4222-8222-222222222222'
const title='قِصَّةُ إبراهيم — الدرس  الأول!'
beforeAll(async()=>{
 db=new PGlite()
 await db.exec(`
 create role anon;create role authenticated;create role service_role;
 create schema transcript_private;
 create function public.account_role(p uuid) returns text language sql as $$select case when p='${actor}' then 'admin' else 'user' end$$;
 create table public.episodes(id uuid primary key default gen_random_uuid(),youtube_id text);
 create table public.youtube_transcripts(id uuid primary key default gen_random_uuid(),youtube_id text unique,canonical_url text,title text,channel text,thumbnail text,
 duration_seconds double precision,provider text,status text default 'ready',translation_status text default 'ready',searchable boolean default true,
 created_at timestamptz default now(),updated_at timestamptz default now(),error_code text,source_origin text default 'website_admin_transcript',episode_id uuid,raw_transcript jsonb,feed_eligible boolean default true,canonical_transcript jsonb,lease_id uuid,lease_until timestamptz);
 create table transcript_segments(id bigserial primary key,transcript_id uuid references youtube_transcripts on delete cascade,position integer,start_seconds double precision,end_seconds double precision,original_text text,english_text text,canonical_paragraph jsonb);
 create table transcript_tokens(segment_id bigint references transcript_segments on delete cascade,surface text);
 create function public.index_youtube_transcript(p_id uuid,p_lease uuid) returns void language plpgsql as $$begin
 insert into public.transcript_segments(transcript_id,position,start_seconds,end_seconds,original_text,canonical_paragraph) select p_id,(ord-1)::int,(c->>'offset')::float8/1000,((c->>'offset')::float8+(c->>'duration')::float8)/1000,c->>'text',null from jsonb_array_elements((select raw_transcript->'content' from public.youtube_transcripts where id=p_id)) with ordinality a(c,ord);
 update public.youtube_transcripts set status='ready',lease_id=null,lease_until=null where id=p_id;
 perform transcript_private.retain_source_paragraphs(p_id);
 end$$;
 create function public.normalise_transcript_word(input text) returns text language sql immutable as $$select btrim(regexp_replace(normalize(input,NFKC),'[[:space:]]+',' ','g'))$$;
 create function transcript_private.canonical_timestamp(p double precision) returns text language sql immutable as $$select case when p>=3600 then lpad((floor(p)::int/3600)::text,2,'0')||':' else '' end||lpad((case when p>=3600 then floor(p)::int/60%60 else floor(p)::int/60 end)::text,2,'0')||':'||lpad((floor(p)::int%60)::text,2,'0')$$;
 create function public.admin_record_transcript_origin(p_actor uuid,p_id uuid) returns uuid language plpgsql as $$begin update public.youtube_transcripts set source_origin='website_admin_transcript' where id=p_id;return p_id;end$$;
 create table transcript_private.translations(transcript_id uuid references public.youtube_transcripts(id));
 create function public.admin_import_youtube_transcript(p_actor uuid,p_youtube_id text,p_title text,p_channel text,p_raw jsonb,p_searchable boolean) returns uuid language plpgsql as $$
 declare result uuid;begin insert into public.youtube_transcripts(youtube_id,title,channel,raw_transcript,provider,searchable,duration_seconds) values(p_youtube_id,p_title,p_channel,p_raw,'manual',p_searchable,5) returning id into result;return result;end$$;
 create function public.admin_update_transcript_json(p_actor uuid,p_id uuid,p_raw jsonb,p_title text,p_channel text,p_searchable boolean,p_updated_at timestamptz) returns timestamptz language plpgsql as $$
 declare result timestamptz;begin
 if (select updated_at from public.youtube_transcripts where id=p_id) is distinct from p_updated_at then raise exception 'transcript_edit_conflict';end if;
 update public.youtube_transcripts set title=p_title,channel=p_channel,raw_transcript=p_raw,searchable=p_searchable,updated_at=clock_timestamp() where id=p_id returning updated_at into result;return result;end$$;
 insert into public.youtube_transcripts(youtube_id,title,provider,source_origin) values('MANUAL00001','${title}','manual','website_admin_transcript'),('SHOW0000001','Show episode','curated','awm'),('UNKNOWN0001','Unknown manual','manual','legacy_unknown'),('GENERATED01','Generated','gladia','website_admin_transcript'),('OVERLAP0001','Episode import','manual','website_admin_transcript');
 insert into public.episodes(youtube_id) values('SHOW0000001'),('OVERLAP0001');
 insert into public.youtube_transcripts(youtube_id,title,provider) select 'P'||lpad(n::text,10,'0'),'Lesson '||n,'manual' from generate_series(1,35) n;
 `)
 await db.exec(readFileSync('supabase/migrations/20261008171140_standalone_transcript_groups_restore.sql','utf8'))
 await db.exec(readFileSync('app/lib/fixtures/transcript-canonical-before-import-repair.sql','utf8'))
 await db.exec(`create trigger guard_segment before insert or update of canonical_paragraph on transcript_segments for each row execute function transcript_private.guard_canonical_write();
 create trigger guard_video before insert or update of canonical_transcript on youtube_transcripts for each row execute function transcript_private.guard_canonical_write();`)
 // Reproduce production's actual trigger failure, rather than stubbing out canonical validation.
 await expect(db.query('select admin_import_grouped_transcript($1,$2,$3,$4,$5,true,null,null)',[actor,'OLDFAIL0001','Valid AWM phrase','Original channel',raw])).rejects.toThrow('invalid_canonical_transcript')
 expect((await db.query('select id from youtube_transcripts where youtube_id=$1',['OLDFAIL0001'])).rows).toHaveLength(0)
 await db.exec(readFileSync('supabase/migrations/20261008182737_manual_awm_import_compatibility.sql','utf8'))
},20000)
afterAll(async()=>{await db?.close()})
async function snapshot(){return (await db.query('select (select jsonb_agg(to_jsonb(t) order by id) from youtube_transcripts t) videos,(select jsonb_agg(to_jsonb(s) order by id) from transcript_segments s) segments,(select jsonb_agg(to_jsonb(k) order by segment_id) from transcript_tokens k) tokens,(select jsonb_agg(to_jsonb(e) order by id) from episodes e) episodes,(select jsonb_agg(to_jsonb(m) order by transcript_id) from admin_manual_transcripts m) assignments,(select jsonb_agg(to_jsonb(j) order by transcript_id) from transcript_private.translations j) jobs')).rows}
it('imports a valid AWM file ungrouped with phrases, identical starts and milliseconds intact',async()=>{
 const result=await db.query<{id:string}>('select admin_import_grouped_transcript($1,$2,$3,$4,$5,true,null,null) id',[actor,'NEWAWM00001','AWM words and phrases','Original channel',raw])
 imported=result.rows[0].id
 const stored=(await db.query<{raw:unknown;group_id:string|null;origin:string}>('select t.raw_transcript raw,m.group_id,t.source_origin origin from youtube_transcripts t join admin_manual_transcripts m on m.transcript_id=t.id where t.id=$1',[imported])).rows[0]
 expect(stored).toMatchObject({raw,group_id:null,origin:'website_admin_transcript'})
 const rows=(await db.query<{start_seconds:number;end_seconds:number;canonical_paragraph:{tokens:unknown[];timestamp:string}}>('select * from transcript_segments where transcript_id=$1 order by position',[imported])).rows
 expect(rows.map(s=>[Math.round(s.start_seconds*1000),Math.round(s.end_seconds*1000)])).toEqual([[1234,2500],[2500,4567],[4567,8000]])
 expect(rows[1].canonical_paragraph.tokens[0]).toMatchObject({arabic:awm[1].tokens[0].arabic,english:'praise be to God',pos:'phrase',entry_type:'phrase',headword:'3',transliteration:'al-ḥamdu lillāh'})
 expect(rows[0].canonical_paragraph.timestamp).toBe('00:01.234')
 expect(rows[2].canonical_paragraph.timestamp).toBe('00:04.567')
})
it('edits an existing transcript with the same validation and preserves its identity and raw enrichment',async()=>{
 const current=(await db.query<{version:string}>('select updated_at version from youtube_transcripts where id=$1',[imported])).rows[0]
 const corrected={...raw,content:raw.content.map((c,index)=>index===1?{...c,english:'Corrected translation.'}:c)}
 await db.query('select admin_save_grouped_transcript($1,$2,$3,$4,$5,true,$6,$7,null,null)',[actor,imported,corrected,'Edited title','Original channel',current.version,'NEWAWM00001'])
 const stored=(await db.query<{raw:unknown;id:string}>('select id,raw_transcript raw from youtube_transcripts where id=$1',[imported])).rows[0]
 expect(stored).toMatchObject({id:imported,raw:corrected})
})
it('rejects duplicate imports without changing any existing canonical content',async()=>{
 const before=await snapshot()
 await expect(db.query('select admin_import_grouped_transcript($1,$2,$3,$4,$5,true,null,null)',[actor,'NEWAWM00001','Overwrite attempt','New channel',raw])).rejects.toThrow('already exists')
 expect(await snapshot()).toEqual(before)
})
it('rolls back invalid grouping and invalid enrichment with precise operation/segment errors',async()=>{
 const before=await snapshot()
 await expect(db.query('select admin_import_grouped_transcript($1,$2,$3,$4,$5,true,$6,null)',[actor,'FAILGROUP01','Invalid group','Channel',raw,other])).rejects.toThrow('group assignment')
 const invalid={...raw,content:raw.content.map((c,index)=>index===2?{...c,tokens:[{...c.tokens![0],headword:3}]}:c)}
 await expect(db.query('select admin_import_grouped_transcript($1,$2,$3,$4,$5,true,null,null)',[actor,'FAILFIELD01','Invalid field','Channel',invalid])).rejects.toThrow(/Segment 3, token 1: headword/)
 expect(await snapshot()).toEqual(before)
 const version=(await db.query<{v:string}>('select updated_at v from youtube_transcripts where id=$1',[imported])).rows[0].v
 await expect(db.query('select admin_save_grouped_transcript($1,$2,$3,$4,$5,true,$6,$7,null,null)',[actor,imported,invalid,'Should not replace','Channel',version,'NEWAWM00001'])).rejects.toThrow('headword')
 expect(await snapshot()).toEqual(before)
})
it('keeps partial legacy enrichment in raw storage without manufacturing canonical properties',async()=>{
 const partial={...raw,content:raw.content.map(c=>({...c,tokens:c.tokens?.map(token=>{const {transliteration,...rest}=token;void transliteration;return rest})}))}
 const id=(await db.query<{id:string}>('select admin_import_grouped_transcript($1,$2,$3,$4,$5,true,null,null) id',[actor,'PARTIAL0001','Partial source','Channel',partial])).rows[0].id
 expect((await db.query<{raw:unknown}>('select raw_transcript raw from youtube_transcripts where id=$1',[id])).rows[0].raw).toMatchObject(partial)
 expect((await db.query('select canonical_paragraph from transcript_segments where transcript_id=$1 and canonical_paragraph is not null',[id])).rows).toHaveLength(0)
})
it('retains generated validation and denies non-admin and client RPC execution',async()=>{
 const phrase={tokens:[{arabic:'الحمد لله',english:'praise be to God',pos:'phrase',headword:'3',entry_type:'phrase',transliteration:'al-ḥamdu lillāh'}],timestamp:'00:01',translation:'Praise be to God.',paragraph:1}
 await expect(db.query('select transcript_private.validate_canonical($1)',[[phrase]])).rejects.toThrow('invalid_canonical_transcript')
 await expect(db.query('select admin_import_grouped_transcript($1,$2,$3,$4,$5,true,null,null)',[other,'NOADMIN0001','Denied','Channel',raw])).rejects.toThrow('Forbidden')
 await db.exec('set role authenticated')
 try{await expect(db.query('select admin_import_grouped_transcript($1,$2,$3,$4,$5,true,null,null)',[actor,'NOROLES0001','Denied','Channel',raw])).rejects.toThrow('permission denied')}finally{await db.exec('reset role')}
})

it('rolls back an edit that fails grouping AFTER indexing, including prior segment IDs and translation jobs',async()=>{
 await db.query('insert into transcript_private.translations(transcript_id) values($1)',[imported])
 const before=await snapshot(),version=(await db.query<{v:string}>('select updated_at v from youtube_transcripts where id=$1',[imported])).rows[0].v
 await expect(db.query('select admin_save_grouped_transcript($1,$2,$3,$4,$5,true,$6,$7,$8,null)',[actor,imported,raw,'Must roll back','Channel',version,'NEWAWM00001',other])).rejects.toThrow()
 expect(await snapshot()).toEqual(before)
})

it('uses the same Arabic-letter rule in SQL and preflight and rejects every invalid token atomically',async()=>{
 const {hasArabicLetter}=await import('./transcriptTokenValidation')
 await db.exec(readFileSync('supabase/migrations/20261008191311_awm_token_arabic_letters.sql','utf8'))
 await db.exec(readFileSync('supabase/migrations/20261008191630_awm_arabic_text_validation_alignment.sql','utf8'))
 for(const value of ['', '!', '،', 'َُّ', 'ﹶ', 'ـ','123','hello','مرحبا!','مرحبا hello','پ','ﷲ','𞸀']){
  const result=await db.query<{valid:boolean}>('select transcript_private.has_awm_arabic_letter($1) valid',[value]);expect(result.rows[0].valid).toBe(hasArabicLetter(value))
  if(hasArabicLetter(value))await db.query('select transcript_private.validate_standalone_transcript_json($1)',[{content:[{text:value,offset:1234,duration:3766,tokens:[{arabic:value}]}]}])
 }
 const before=await snapshot(),invalid={...raw,content:raw.content.map((chunk,index)=>({...chunk,tokens:[{...chunk.tokens![0],arabic:index===0?'!':index===1?'َُّ':'hello'}]}))}
 let message='';try{await db.query('select admin_import_grouped_transcript($1,$2,$3,$4,$5,true,null,null)',[actor,'BADTOK00001','Rejected','Channel',invalid])}catch(e){message=(e as Error).message}
 for(const segment of [1,2,3])expect(message).toContain(`Segment ${segment}, token 1`)
 expect(await snapshot()).toEqual(before)
 const punctuation={provider:'manual',lang:'ar',content:[{text:'مرحبا!',offset:1234,duration:3766,tokens:[{arabic:'مرحبا!',english:'hello',pos:'noun',headword:'مرحبا',entry_type:'word',transliteration:'marhaba'}]}]}
 const id=(await db.query<{id:string}>('select admin_import_grouped_transcript($1,$2,$3,$4,$5,true,null,null) id',[actor,'PUNCT000001','Safe punctuation','Channel',punctuation])).rows[0].id
 expect((await db.query<{raw:unknown}>('select raw_transcript raw from youtube_transcripts where id=$1',[id])).rows[0].raw).toEqual(punctuation)
})
