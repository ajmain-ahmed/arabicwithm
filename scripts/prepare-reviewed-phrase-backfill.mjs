// Prepare additive SQL only. Execution is separate, after the linguistic review.
import { readFile, writeFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import assert from 'node:assert/strict'
const dir = 'artifacts/phrase-restore/corpus'
const discovery = await readFile(`${dir}/discovery.json`, 'utf8')
const review = JSON.parse(await readFile(`${dir}/reviewed.json`, 'utf8'))
assert.equal(createHash('sha256').update(discovery).digest('hex'), review.discoverySha256)
assert.equal(review.summary.accepted, 130)
assert.ok(review.sample.accepted.length >= 50 && review.sample.rejected.length >= 25 && review.sample.borderline.length >= 25)
const payload = review.accepted.map(row => ({ fields: {
  phrase_ar_di: row.arabic, phrase_tr: row.transliteration, english: row.english, cefr: row.cefr,
  word_glosses: row.wordGlosses,
  notes: `Corpus backfill 2026-11-24; individually reviewed reusable expression. ${row.evidence}.`,
}, occurrence: row.occurrences[0] }))
const quoted = JSON.stringify(payload).replaceAll("'", "''")
assert.ok(!quoted.includes('$backfill$'), 'Source text collides with the SQL block delimiter')
const sql = `begin;
do $backfill$
declare item jsonb; occurrence jsonb; phrase bigint; version text;
begin
  for item in select value from jsonb_array_elements('${quoted}'::jsonb) loop
    occurrence := item->'occurrence';
    select version_hash into version from private.enrichment_source_versions
      where source_kind=occurrence->'source'->>'kind' and source_id=occurrence->'source'->>'id';
    if version is null then raise exception 'Source disappeared; rerun discovery and review'; end if;
    -- The existing writer takes an advisory lock on the normalized Arabic.
    -- A null ID returns an existing Phrase unchanged or inserts a new one.
    phrase := public.website_write_phrase(null, item->'fields');
    insert into public.content_enrichment_examples (
      phrase_id,source_kind,source_id,unit_key,version_hash,source_title,parent_id,parent_title,
      source_url,original_url,source_timestamp,arabic,english,highlight,review_status
    ) values (
      phrase,occurrence->'source'->>'kind',occurrence->'source'->>'id',occurrence->>'unitKey',version,
      occurrence->'source'->>'title',occurrence->'source'->>'parentId',occurrence->'source'->>'parentTitle',
      occurrence->'source'->>'url',occurrence->'source'->>'originalUrl',nullif(occurrence->>'timestamp',''),
      occurrence->>'arabic',coalesce(occurrence->>'english',''),item->'fields'->>'phrase_ar_di','approved'
    ) on conflict do nothing;
  end loop;
end $backfill$;
commit;
select jsonb_build_object('phrases',(select count(*) from public.phrases),
  'phrase_examples',(select count(*) from public.content_enrichment_examples where phrase_id is not null),
  'original_six_digest',(select md5(string_agg(to_jsonb(p)::text,',' order by id)) from public.phrases p where id between 1 and 6),
  'with_glosses',(select count(*) from public.phrases where jsonb_array_length(coalesce(word_glosses,'[]'::jsonb))>0));
`
assert.ok(!/\b(delete|truncate|drop|update)\b/i.test(sql))
await writeFile(`${dir}/additive-backfill.sql`, sql)
console.log(`Prepared ${payload.length} reviewed expressions using the existing deduplicating writer; no SQL executed.`)
