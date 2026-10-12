export interface ManualImportState {
 importId:string;id:string;completed:boolean;committed:number;expected:number;tokens:number;
 enrichment:'ready'|'partial'|'unavailable'
}
export type ImportReply={ok:true;state:ManualImportState}|{ok:false;error:string;code?:string;retryable:boolean}
export interface ManualImportProgress {phase:'Preparing transcript'|'Importing segments and tokens'|'Finalising import'|'Import completed';committed:number;expected:number;percent:number}
export interface ImportTransport {
 prepare:()=>Promise<ImportReply>;
 append:(id:string,offset:number,limit:number)=>Promise<ImportReply>;
 finish:(id:string)=>Promise<ImportReply>;
}
const wait=(ms:number)=>new Promise<void>(resolve=>setTimeout(resolve,ms))
// A lost response may follow a successful commit. The database's batch checkpoint
// makes retrying this same offset safe; never start the entire import again.
export async function runManualImport(transport:ImportTransport,onProgress:(progress:ManualImportProgress)=>void,options:{batchSize?:number;sleep?:(ms:number)=>Promise<void>}={}):Promise<ManualImportState>{
 const sleep=options.sleep??wait
 let limit=Math.max(1,Math.min(100,options.batchSize??100))
 async function request(call:()=>Promise<ImportReply>):Promise<ManualImportState>{
  for(let attempt=0;;attempt++){
   let reply:ImportReply
   try{reply=await call()}catch(error){reply={ok:false,retryable:true,error:error instanceof Error?error.message:'Unable to contact the import service.'}}
   if(reply.ok)return reply.state
   if(!reply.retryable||attempt>=3)throw new Error(reply.error+(reply.retryable?' Committed batches are saved. Retry with the same transcript and settings to resume.':''))
   if(reply.code==='57014')limit=Math.max(1,Math.floor(limit/2))
   await sleep(500*2**attempt)
  }
 }
 onProgress({phase:'Preparing transcript',committed:0,expected:0,percent:0})
 let state=await request(transport.prepare)
 while(!state.completed&&state.committed<state.expected){
  onProgress({phase:'Importing segments and tokens',committed:state.committed,expected:state.expected,percent:Math.min(99,Math.floor(state.committed/state.expected*100))})
  const offset=state.committed,id=state.importId
  const next=await request(()=>transport.append(id,offset,limit))
  if(next.importId!==id||next.expected!==state.expected||next.committed<=offset||next.committed>next.expected)throw new Error('Import progress could not be verified. Retry to resume saved batches.')
  state=next
 }
 // Finalisation is idempotent. Repeat it even for a completed checkpoint so
 // a lost acknowledgement cannot leave the website's read caches stale.
 onProgress({phase:'Finalising import',committed:state.committed,expected:state.expected,percent:99})
 state=await request(()=>transport.finish(state.importId))
 if(!state.completed||state.committed!==state.expected)throw new Error('The import has not passed verification. Retry to resume saved batches.')
 onProgress({phase:'Import completed',committed:state.committed,expected:state.expected,percent:100})
 return state
}
