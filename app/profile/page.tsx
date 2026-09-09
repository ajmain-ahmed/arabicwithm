import { redirect } from 'next/navigation'
import { getAuthenticatedUserId } from '@/app/actions/auth'
export default async function MyProfilePage() {
  const id = await getAuthenticatedUserId()
  if (!id) redirect('/')
  redirect(`/profile/${id}`)
}
