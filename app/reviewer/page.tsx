import ReviewerWorkspace from '@/app/reviewer/ReviewerWorkspace'
import { getAuthenticatedAccess } from '@/app/actions/auth'
export default async function ReviewerPage(){const access=await getAuthenticatedAccess();return <ReviewerWorkspace admin={Boolean(access?.admin)}/>}
