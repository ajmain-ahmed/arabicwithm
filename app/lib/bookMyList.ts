import { supabase } from '@/app/lib/supabase/client'
import {useEffect} from 'react'
import {useMyListCache} from '@/store/myListStore'

export function savedBookSlugs(metadata: Record<string, unknown> | undefined): string[] {
  const value = metadata?.my_list_books
  return Array.isArray(value) ? [...new Set(value.filter((slug): slug is string => typeof slug === 'string'))] : []
}

// Serialize reader additions and manual changes so concurrent mounts cannot
// overwrite another book added in this tab. Always merge the latest account data.
let pending: Promise<void> = Promise.resolve()
let revision=0
const membership=(slugs:string[],slug:string,included:boolean)=>included?[...new Set([...slugs,slug])]:slugs.filter(value=>value!==slug)
function overlay(slugs:string[],operations:ReturnType<typeof useMyListCache.getState>['bookOperations']){
 return Object.entries(operations).reduce((result,[slug,operation])=>membership(result,slug,operation.included),slugs)
}
export function useBookMyList(user:{id:string;user_metadata?:Record<string,unknown>}|null){
 const identity=useMyListCache(state=>state.bookUserId)
 const slugs=useMyListCache(state=>state.bookSlugs)
 useEffect(()=>{
  useMyListCache.setState(state=>state.bookUserId===user?.id&&state.bookMetadata===user?.user_metadata?{}:({bookMetadata:user?.user_metadata,bookUserId:user?.id??null,bookOperations:state.bookUserId===user?.id?state.bookOperations:{},bookSlugs:overlay(savedBookSlugs(user?.user_metadata),state.bookUserId===user?.id?state.bookOperations:{})}))
 },[user?.id,user?.user_metadata])
 return user&&identity===user.id&&slugs!==null?slugs:savedBookSlugs(user?.user_metadata)
}
export function setBookInMyList(userId: string, bookSlug: string, included: boolean): Promise<void> {
  const request=++revision
  const current=useMyListCache.getState()
  const before=current.bookUserId===userId&&Boolean(current.bookSlugs?.includes(bookSlug))
  useMyListCache.setState({bookUserId:userId,bookSlugs:membership(current.bookUserId===userId?current.bookSlugs??[]:[],bookSlug,included),bookOperations:{...(current.bookUserId===userId?current.bookOperations:{}),[bookSlug]:{included,revision:request}}})
  const settle=(slugs?:string[])=>useMyListCache.setState(state=>{
   if(state.bookUserId!==userId||state.bookOperations[bookSlug]?.revision!==request)return {}
   const operations={...state.bookOperations};delete operations[bookSlug]
   return {bookOperations:operations,bookSlugs:slugs?overlay(slugs,operations):membership(state.bookSlugs??[],bookSlug,before)}
  })
  const operation = pending.catch(() => {}).then(async () => {
    const { data, error } = await supabase.auth.getUser()
    if (error || data.user?.id !== userId) throw new Error('Sign in again')
    const slugs = savedBookSlugs(data.user.user_metadata)
    if (slugs.includes(bookSlug) === included){settle(slugs);return}
    const updated = included ? [...slugs, bookSlug] : slugs.filter(slug => slug !== bookSlug)
    const { error: writeError } = await supabase.auth.updateUser({ data: { my_list_books: updated } })
    if (writeError) throw writeError
    settle(updated)
  }).catch(error=>{settle();throw error})
  pending = operation
  return operation
}
