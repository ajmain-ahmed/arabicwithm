'use server'

import { z } from 'zod'
import { updateTag, revalidatePath } from 'next/cache'
import { guardReviewer, getAuthenticatedAccess } from '@/app/actions/auth'
import { serviceClient } from '@/app/lib/supabase'
import type { Json } from '@/app/lib/supabase/database.types'
import type { AccountRole, BookCorrection, DirectoryResult, ReviewerLineComment, ReviewSource, ReviewType, SuggestionInput, SuggestionStatus } from '@/app/lib/reviews'
import { orderedCorrections } from '@/app/lib/correctionClipboard'
import { reviewUnitLabel } from '@/app/lib/reviewLabels'

const uuid = z.string().uuid()
const inputSchema = z.object({ arabic: z.string().max(10000), english: z.string().max(10000), comment: z.string().max(10000), reason: z.string().max(10000) })
async function accountNames(ids: string[]) {
 const unique = [...new Set(ids)]
 if (!unique.length) return new Map<string,string>()
 const { data: profiles, error } = await serviceClient.from('public_profiles').select('user_id,display_name').in('user_id',unique)
 if (error) throw new Error('Unable to load reviewer names')
 const names = new Map((profiles ?? []).map(p => [p.user_id,p.display_name]))
 await Promise.all(unique.filter(id=>!names.has(id)).map(async id=>{
  const {data,error:identityError}=await serviceClient.auth.admin.getUserById(id)
  if (identityError) { names.set(id,id); return }
  const user=data.user
  names.set(id,String(user.user_metadata?.full_name ?? user.user_metadata?.name ?? user.email ?? id))
 }))
 return names
}
async function adminActor() {
 const access = await getAuthenticatedAccess()
 if (!access?.admin) throw new Error('Forbidden')
 return access.userId
}
export async function listManagedUsers(tab: 'all' | 'premium' | 'editor' | 'admin', search: string, page: number): Promise<DirectoryResult> {
 const actor = await adminActor()
 const { data, error } = await serviceClient.rpc('admin_user_directory', { p_actor: actor, p_tab: z.enum(['all','premium','editor','admin']).parse(tab), p_search: z.string().max(200).parse(search), p_page: z.number().int().min(0).max(1000000).parse(page), p_size: 25 })
 if (error) throw new Error(error.message)
 return data as unknown as DirectoryResult
}
export async function managedUserDetails(id: string) {
 await adminActor(); uuid.parse(id)
 const [{ data: history, error }, { data: identity, error: authError }] = await Promise.all([
  serviceClient.from('access_change_audit').select('*').eq('target_user_id', id).order('changed_at', { ascending: false }).limit(100),
  serviceClient.auth.admin.getUserById(id),
 ])
 if (error || authError) throw new Error('Unable to load account details')
 // Do not serialize the Auth user object or sensitive metadata.
 const names=await accountNames((history??[]).map(h=>h.changed_by))
 return { id: identity.user.id, history: (history??[]).map(h=>({...h,changed_by_name:names.get(h.changed_by)})) }
}
export async function changeManagedRole(id: string, role: AccountRole, reason: string, confirmation: string) {
 const actor = await adminActor()
 if (confirmation !== id) throw new Error('Confirm the target account ID')
 const { error } = await serviceClient.rpc('change_account_role', { p_actor: actor, p_target: uuid.parse(id), p_role: z.enum(['user','editor','admin']).parse(role), p_reason: z.string().trim().min(1).max(2000).parse(reason) })
 if (error) throw new Error(error.message)
 revalidatePath('/admin/users')
}
export async function reviewCatalogue(type: ReviewType, parent?: string) {
 await guardReviewer(); z.enum(['book','show']).parse(type)
 if (parent) {
  uuid.parse(parent)
  const { data, error } = type === 'book'
   ? await serviceClient.from('chapters').select('id,title,chapter_number').eq('book_id', parent).order('chapter_number').limit(1000)
   : await serviceClient.from('episodes').select('id,title').eq('show_id', parent).order('title').limit(1000)
  if (error) throw new Error(error.message)
  return data ?? []
 }
 const { data, error } = await serviceClient.from(type === 'book' ? 'books' : 'shows').select('id,title').order('title').limit(1000)
 if (error) throw new Error(error.message)
 return data ?? []
}
export async function loadReviewSource(type: ReviewType, target: string): Promise<ReviewSource> {
 await guardReviewer()
 const { data, error } = await serviceClient.rpc('review_source', { p_type: z.enum(['book','show']).parse(type), p_target: uuid.parse(target) })
 if (error) throw new Error(error.message)
 const source=data as unknown as ReviewSource
 if(!source||!Array.isArray(source.document)||source.document.some(block=>!block||!Array.isArray(block.tokens)||block.tokens.some(token=>!token||typeof token.arabic!=='string')||typeof block.translation!=='string'))throw new Error('This source contains unsupported blocks. An Admin must repair its content in the existing content editor before it can be reviewed.')
 return source
}
export async function submitSuggestion(type: ReviewType, target: string, line: number, document: Json, input: SuggestionInput) {
 const access = await guardReviewer(); const value = inputSchema.parse(input)
 const { data, error } = await serviceClient.rpc('submit_content_suggestion', { p_actor: access.userId, p_type: z.enum(['book','show']).parse(type), p_target: uuid.parse(target), p_line: z.number().int().min(0).parse(line), p_document: document, p_arabic: value.arabic, p_english: value.english, p_comment: value.comment, p_reason: value.reason })
 if (error) throw new Error(error.message)
 return data
}
export async function editSuggestion(id: string, withdraw: boolean, input: SuggestionInput) {
 const access = await guardReviewer(); const value = inputSchema.parse(input)
 const { error } = await serviceClient.rpc('edit_content_suggestion', { p_actor: access.userId, p_id: uuid.parse(id), p_withdraw: z.boolean().parse(withdraw), p_arabic: value.arabic, p_english: value.english, p_comment: value.comment, p_reason: value.reason })
 if (error) throw new Error(error.message)
}
/** The inline chapter history has the same ownership boundary as My Suggestions. */
export async function loadReviewerComments(type: ReviewType, target: string): Promise<ReviewerLineComment[]> {
 const access = await guardReviewer()
 const { data, error } = await serviceClient.from('content_suggestions')
  .select('id,line_index,comment,status,created_at,admin_response')
  .eq('author_id', access.userId).eq('content_type', z.enum(['book','show']).parse(type)).eq('target_id', uuid.parse(target))
  .neq('status','withdrawn').neq('comment','').order('created_at',{ascending:false}).limit(1000)
 if (error) throw new Error('Unable to load your previous comments. Please retry.')
 return data ?? []
}
/** Admin-only collection; cursor batches avoid the Data API row limit and UI pagination. */
export async function loadAdminBookCorrections(parent: string, target: string, ids?: string[]): Promise<BookCorrection[]> {
 await adminActor()
 uuid.parse(parent);uuid.parse(target)
 const selected=ids===undefined?undefined:[...new Set(z.array(uuid).min(1).max(10000).parse(ids))]
 const cutoff=new Date().toISOString(),rows:BookCorrection[]=[]
 const query=()=>serviceClient.from('content_suggestions')
  .select('id,author_id,parent_id,target_id,line_index,original_arabic,comment,status,created_at,admin_response')
  .eq('content_type','book').eq('parent_id',parent).eq('target_id',target)
  .neq('status','withdrawn').neq('comment','').lte('created_at',cutoff)
 if(selected){
  for(let offset=0;offset<selected.length;offset+=50){
   const {data,error}=await query().in('id',selected.slice(offset,offset+50))
   if(error)throw new Error('Unable to load corrections. Please retry.')
   rows.push(...(data??[]))
  }
  if(rows.length!==selected.length)throw new Error('A selected comment was removed or withdrawn. Refresh the comments and select again.')
 }else{
  let cursor:string|undefined
  for(;;){
   let batch=query().order('id',{ascending:true}).limit(500)
   if(cursor)batch=batch.gt('id',cursor)
   const {data,error}=await batch
   if(error)throw new Error('Unable to load corrections. Please retry.')
   rows.push(...(data??[]))
   if(!data?.length)break
   const next=data[data.length-1].id
   if(next===cursor)throw new Error('Unable to finish collecting corrections. Please retry.')
   cursor=next
  }
 }
 return orderedCorrections(rows)
}
export async function listSuggestions(admin: boolean, filters: { status: SuggestionStatus; type?: ReviewType; author?: string; parent?: string; target?: string; since?: string; until?: string }, page: number) {
 const access = await guardReviewer()
 if (admin && !access.admin) throw new Error('Forbidden')
 const offset = z.number().int().min(0).max(1000000).parse(page)*25
 let query = serviceClient.from('content_suggestions').select('id,author_id,content_type,parent_id,target_id,line_index,location,original_block,original_arabic,original_english,suggested_arabic,suggested_english,suggested_tokens,comment,reason,status,created_at,updated_at,reviewed_by,reviewed_at,admin_response', { count: 'exact' }).eq('status', z.enum(['pending','accepted','rejected','withdrawn']).parse(filters.status))
 if (!admin) query = query.eq('author_id', access.userId)
 if (filters.type) query = query.eq('content_type', z.enum(['book','show']).parse(filters.type))
 if (filters.author && admin) query = query.eq('author_id', uuid.parse(filters.author))
 if (filters.parent) query = query.eq('parent_id', uuid.parse(filters.parent))
 if (filters.target) query = query.eq('target_id', uuid.parse(filters.target))
 if (filters.since) query = query.gte('created_at', z.string().datetime().parse(filters.since))
 if (filters.until) query = query.lte('created_at', z.string().datetime().parse(filters.until))
 const { data, error, count } = await query.order('created_at', { ascending: false }).range(offset, offset+24)
 if (error) throw new Error(error.message)
 const names=admin?await accountNames((data??[]).map(s=>s.author_id)):new Map<string,string>()
 const chapterIds=[...new Set((data??[]).filter(s=>s.content_type==='book').map(s=>s.target_id))]
 const labels=new Map<string,string>()
 if(chapterIds.length){
  const {data:chapters,error}=await serviceClient.from('chapters').select('id,title,chapter_number').in('id',chapterIds)
  if(error)throw new Error('Unable to load chapter labels')
  for(const chapter of chapters??[])labels.set(chapter.id,reviewUnitLabel(chapter))
 }
 return { suggestions: (data??[]).map(s=>({...s,author_name:names.get(s.author_id),unit_label:labels.get(s.target_id)})), total: count ?? 0 }
}
export async function reviewSuggestion(id: string, action: 'accept' | 'reject' | 'reply', response: string, tokens: Json = null) {
 const actor = await adminActor()
 const { data, error } = await serviceClient.rpc('review_content_suggestion', { p_actor: actor, p_id: uuid.parse(id), p_action: z.enum(['accept','reject','reply']).parse(action), p_response: z.string().max(10000).parse(response), p_tokens: tokens })
 if (error) throw new Error(error.message)
 const result = data as { ok: boolean; conflict?: boolean; current?: Json; message?: string }
 if(result.ok){revalidatePath('/reviewer');revalidatePath('/admin/reviews')}
 if (result.ok && action==='accept') {
  updateTag('books-public'); updateTag('cartoons-public')
  revalidatePath('/books', 'layout'); revalidatePath('/cartoons', 'layout'); revalidatePath('/explore')
 }
 return result
}
