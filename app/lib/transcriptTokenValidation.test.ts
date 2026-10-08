import {it,expect} from 'vitest'
import {normaliseManualTranscriptJson} from './manualTranscriptJson'
it.each(['','!','،','َُّ','ﹶ','ـ','123','hello','مرحبا!','مرحبا hello','پ','ﷲ','𞸀'])('source token %j is retained without mandatory enrichment',arabic=>{
 const token={arabic,headword:42,unknown:'keep'},raw=normaliseManualTranscriptJson(JSON.stringify([{text:'Original text 42!',start_ms:1234,tokens:[token]}]))
 expect(raw.content[0].tokens).toEqual([token]);expect(raw.content[0].text).toBe('Original text 42!');expect(raw.content[0].duration).toBeNull()
})
