import {isAdminUser} from '@/app/actions/auth'
import {fetchFeaturedForAdmin} from '@/app/actions/featured'
import FeaturedManager from './FeaturedManager'
export default async function FeaturedPage() {
 // The Admin layout owns the redirect. Do not race it with a second
 // redirect or a thrown action error while the route is streaming.
 if(!await isAdminUser())return null
 const initial=await fetchFeaturedForAdmin()
 return <FeaturedManager initial={initial}/>
}
