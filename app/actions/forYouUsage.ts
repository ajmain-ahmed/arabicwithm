'use server'

import {z} from 'zod'
import {getAuthenticatedUserId} from '@/app/actions/auth'
import {serviceClient} from '@/app/lib/supabase'

export interface ForYouUsage {unlimited:boolean;remainingMs:number|null;busy:boolean;day:string}
const resultSchema=z.object({unlimited:z.boolean(),remainingMs:z.number().nonnegative().nullable(),busy:z.boolean(),day:z.string()})
export async function syncForYouUsage(input:{lease:string;totalMs:number;active:boolean}):Promise<ForYouUsage>{
 const userId=await getAuthenticatedUserId()
 if(!userId)throw new Error('Sign in to use For You.')
 const data=z.object({lease:z.string().uuid(),totalMs:z.number().int().min(0).max(2147483647),active:z.boolean()}).parse(input)
 const {data:usage,error}=await serviceClient.rpc('website_for_you_usage',{p_user_id:userId,p_lease:data.lease,p_total_ms:data.totalMs,p_active:data.active})
 if(error)throw new Error('Unable to verify For You access. Please retry.')
 return resultSchema.parse(usage)
}
