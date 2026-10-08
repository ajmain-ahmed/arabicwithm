import {expect,it} from 'vitest'
import {transcriptDatabaseError} from './transcriptDatabaseError'
it.each([['PGRST202','RPC missing','configuration'],['42501','permission denied','permission'],['23503','Import group assignment: invalid group','Group assignment'],['P0001','invalid_canonical_transcript','enrichment'],['23514','violates duration constraint','23514'],['P0001','Segment 3, token 2: headword must be text','Segment 3, token 2']])('explains actual %s failure', (code,message,expected)=>{expect(transcriptDatabaseError('Import',{code,message})).toContain(expected)})
