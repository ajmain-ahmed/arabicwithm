'use server'
import {getAuthenticatedUserId} from '@/app/actions/auth'
import {isPresetBucket,type ProfilePresetBucket} from '@/app/lib/profilePresets'
import {readProfilePresets} from '@/app/lib/profilePresetStorage'

export async function listProfilePresets(bucket:ProfilePresetBucket){
 if(!await getAuthenticatedUserId())throw new Error('Sign in to choose a profile preset.')
 if(!isPresetBucket(bucket))throw new Error('Invalid profile collection.')
 try{return await readProfilePresets(bucket)}catch{throw new Error('Profile presets could not be loaded. Please try again.')}
}
