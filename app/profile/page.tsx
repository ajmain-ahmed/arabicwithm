import { redirect } from 'next/navigation'
import { getAuthenticatedUserId } from '@/app/actions/auth'
import { profileRoute } from '@/app/lib/navigation'
import ProfileSignIn from './ProfileSignIn'

export default async function MyProfilePage() {
  const id = await getAuthenticatedUserId()
  if (!id) return <ProfileSignIn />
  redirect(profileRoute(id))
}
