import { z } from 'zod'
import { getAuthenticatedAccess } from '@/app/actions/auth'
import { serviceClient } from '@/app/lib/supabase'
import { exportFilename, sourceEnvelope, type ReviewExportScope, type ReviewExportData } from '@/app/lib/reviewExports'
import type { Json } from '@/app/lib/supabase/database.types'
import { reviewUnitLabel } from '@/app/lib/reviewLabels'

const scopeSchema = z.object({ type:z.enum(['book','show']), parent:z.string().uuid(), target:z.string().uuid().optional(), status:z.enum(['pending','accepted','rejected','withdrawn']).optional(), author:z.string().uuid().optional(), since:z.string().datetime().optional(), until:z.string().datetime().optional() })
export async function requireExportAdmin() {
 if (!(await getAuthenticatedAccess())?.admin) throw new Error('Forbidden')
}
export async function loadExportScope(raw: ReviewExportScope) {
 await requireExportAdmin()
 const scope=scopeSchema.parse(raw)
 const {data:parent,error}=await serviceClient.from(scope.type==='book'?'books':'shows').select('*').eq('id',scope.parent).single()
 if(error||!parent)throw new Error('Selected content not found')
 const units: Record<string, Json | undefined>[]=[]
 for(let offset=0;;offset+=500){
  let query=scope.type==='book'?serviceClient.from('chapters').select('*').eq('book_id',scope.parent):serviceClient.from('episodes').select('*').eq('show_id',scope.parent)
  if(scope.target)query=query.eq('id',scope.target)
  const {data,error}=await query.order(scope.type==='book'?'chapter_number':'created_at',{ascending:scope.type==='book'}).order('id').range(offset,offset+499)
  if(error)throw new Error('Unable to load source content')
  units.push(...(data??[]))
  if((data?.length??0)<500)break
 }
 if(scope.target&&!units.length)throw new Error('Selected chapter or episode does not belong to this content')
 const title=String(parent.title), unit=scope.target?String(units[0].title):undefined
 return {scope,parent,units,title,filename:exportFilename(title,unit)}
}
export async function loadSourceExport(raw: ReviewExportScope) {
 const data=await loadExportScope(raw)
 return {filename:data.filename,source:sourceEnvelope(data.scope.type,data.parent,data.units,Boolean(data.scope.target))}
}
export async function loadSuggestionExport(raw: ReviewExportScope): Promise<ReviewExportData> {
 const {scope,units,title,filename}=await loadExportScope(raw)
 const suggestions: ReviewExportData['suggestions']=[]
 const names=new Map<string,string>()
 for(let offset=0;;offset+=500){
  let query=serviceClient.from('content_suggestions').select('id,author_id,content_type,parent_id,target_id,line_index,location,original_block,original_arabic,original_english,suggested_arabic,suggested_english,suggested_tokens,comment,reason,status,created_at,updated_at,reviewed_by,reviewed_at,admin_response').eq('content_type',scope.type).eq('parent_id',scope.parent)
  if(scope.target)query=query.eq('target_id',scope.target)
  if(scope.status)query=query.eq('status',scope.status)
  if(scope.author)query=query.eq('author_id',scope.author)
  if(scope.since)query=query.gte('created_at',scope.since)
  if(scope.until)query=query.lte('created_at',scope.until)
  const {data,error}=await query.order('target_id').order('line_index').order('created_at').order('id').range(offset,offset+499)
  if(error)throw new Error('Unable to load suggestions')
  for(const s of data??[]){const unit=units.find(u=>u.id===s.target_id);suggestions.push({...s,unit_title:unit?reviewUnitLabel({id:String(unit.id),title:String(unit.title),chapter_number:typeof unit.chapter_number==='number'?unit.chapter_number:undefined}):s.location})}
  if((data?.length??0)<500)break
 }
 const ids=[...new Set(suggestions.map(s=>s.author_id))]
 // Export display names only; never serialize Auth metadata or private account fields.
 for(let offset=0;offset<ids.length;offset+=500){
  const {data,error}=await serviceClient.from('public_profiles').select('user_id,display_name').in('user_id',ids.slice(offset,offset+500))
  if(error)throw new Error('Unable to load reviewer names')
  for(const p of data??[])names.set(p.user_id,p.display_name)
 }
 const order=new Map(units.map((u,index)=>[u.id,index]))
 suggestions.sort((a,b)=>(order.get(a.target_id)??Number.MAX_SAFE_INTEGER)-(order.get(b.target_id)??Number.MAX_SAFE_INTEGER)||a.line_index-b.line_index||a.created_at.localeCompare(b.created_at)||a.id.localeCompare(b.id))
 return {title,filename,type:scope.type,suggestions:suggestions.map(s=>({...s,author_name:names.get(s.author_id)??'Reviewer'}))}
}
