import { notFound } from 'next/navigation'
import { fetchPublicProfile } from '@/app/actions/profiles'
import ProfileView from '@/app/profile/ProfileView'
export const dynamic = 'force-dynamic'
export default async function PublicProfilePage({ params }: { params: Promise<{ user: string }> }) {
  const profile = await fetchPublicProfile((await params).user)
  if (!profile) notFound()
  return <ProfileView profile={profile} />
}
