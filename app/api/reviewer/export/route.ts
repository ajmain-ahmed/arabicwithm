import { z } from 'zod'
import { loadSourceExport, loadSuggestionExport, requireExportAdmin } from '@/app/lib/reviewExportData'
import { suggestionsCsv, type ReviewExportScope } from '@/app/lib/reviewExports'
import { suggestionsPdf } from '@/app/lib/reviewPdf'

export const runtime='nodejs'
export const dynamic='force-dynamic'
export async function GET(request: Request) {
 try {
  // Check the current database role before parsing scope or accessing source content.
  await requireExportAdmin()
  const params=new URL(request.url).searchParams
  const format=z.enum(['csv','pdf','json']).parse(params.get('format'))
  const scope=Object.fromEntries(['type','parent','target','status','author','since','until'].flatMap(key=>params.get(key)?[[key,params.get(key)!]]:[])) as unknown as ReviewExportScope
  let body: string | Uint8Array, filename: string, mime: string
  if(format==='json'){
   const data=await loadSourceExport(scope)
   body=JSON.stringify(data.source,null,2)+'\n';filename=data.filename+'_source.json';mime='application/json; charset=utf-8'
  }else{
   const data=await loadSuggestionExport(scope)
   body=format==='csv'?suggestionsCsv(data):new Uint8Array(await suggestionsPdf(data))
   filename=data.filename+'_suggestions.'+format;mime=format==='csv'?'text/csv; charset=utf-8':'application/pdf'
  }
  return new Response(body as BodyInit,{headers:{'Content-Type':mime,'Content-Disposition':`attachment; filename="awm-export.${format}"; filename*=UTF-8''${encodeURIComponent(filename)}`,'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'}})
 }catch(error){
  const forbidden=error instanceof Error&&error.message==='Forbidden'
  const invalid=error instanceof z.ZodError
  return Response.json({error:forbidden?'Admin access required':invalid?'Choose a valid content scope':error instanceof Error?error.message:'Unable to generate export'},{status:forbidden?403:invalid?400:500,headers:{'Cache-Control':'private, no-store'}})
 }
}
