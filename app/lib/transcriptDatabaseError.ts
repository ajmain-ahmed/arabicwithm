interface DatabaseFailure {code?:string;message:string}
/** Admin diagnostics expose the operation and SQLSTATE, never raw JSON or SQL context. */
export function transcriptDatabaseError(operation:string,error:DatabaseFailure):string {
 if(['PGRST202','42883','42P01'].includes(error.code??''))return `${operation} configuration: required database function/table is unavailable (${error.code}). Apply the website transcript migrations to the configured project.`
 if(error.code==='42501')return `${operation} permission: the server cannot execute the transcript database operation. Check service-role grants (${error.code}).`
 if(error.code==='23503'&&/group/i.test(error.message))return 'Group assignment: the selected group no longer exists. Choose another group or Ungrouped.'
 if(/invalid_canonical_transcript/.test(error.message))return `${operation} enrichment: AWM token metadata was rejected by the database canonical validator (${error.code??'P0001'}). Apply manual_awm_import_compatibility; check entry_type, POS, headword and transliteration.`
 return `${operation} database${error.code?` (${error.code})`:''}: ${error.message.slice(0,1000)}`
}
