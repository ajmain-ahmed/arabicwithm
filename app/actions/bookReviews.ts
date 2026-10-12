'use server'
import { z } from 'zod'
import { getAuthClient } from '@/app/lib/supabase/server'
import { getAuthenticatedUserId } from '@/app/actions/auth'

export async function loadOwnBookReview(bookId:string) {
 const userId=await getAuthenticatedUserId()
 if(!userId)throw new Error('Sign in to leave a review.')
 const client=await getAuthClient()
 const {data,error}=await client.from('book_reviews').select('rating,review_text').eq('book_id',z.string().uuid().parse(bookId)).eq('user_id',userId).maybeSingle()
 if(error)throw new Error('Unable to load your review.')
 return data as {rating:number;review_text:string}|null
}
export async function saveOwnBookReview(bookId:string,rating:number,text:string) {
 const userId=await getAuthenticatedUserId()
 if(!userId)throw new Error('Sign in to leave a review.')
 const client=await getAuthClient()
 const {error}=await client.from('book_reviews').upsert({book_id:z.string().uuid().parse(bookId),user_id:userId,rating:z.number().int().min(1).max(5).parse(rating),review_text:z.string().trim().max(2000).parse(text),updated_at:new Date().toISOString()},{onConflict:'book_id,user_id'})
 if(error)throw new Error('Unable to save your review. Please retry.')
}
export async function deleteOwnBookReview(bookId:string) {
 const userId=await getAuthenticatedUserId()
 if(!userId)throw new Error('Sign in to manage your review.')
 const client=await getAuthClient()
 const {error}=await client.from('book_reviews').delete().eq('book_id',z.string().uuid().parse(bookId)).eq('user_id',userId)
 if(error)throw new Error('Unable to delete your review.')
}
