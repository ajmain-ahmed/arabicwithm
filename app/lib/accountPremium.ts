import 'server-only'
import { serviceClient } from '@/app/lib/supabase'

export async function accountHasPremium(userId: string): Promise<boolean> {
 const {data,error}=await serviceClient.rpc('account_has_premium',{p_user_id:userId})
 if(error || typeof data!=='boolean') throw new Error('Unable to verify AWM+ access.')
 return data
}
