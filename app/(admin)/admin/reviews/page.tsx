import { Stack, Typography } from '@mui/material'
import SuggestionsList from '@/app/reviewer/SuggestionsList'
import { getAuthenticatedAccess } from '@/app/actions/auth'
export default async function ReviewsPage(){const access=await getAuthenticatedAccess();return <Stack spacing={2}><Typography variant="h4">Reviews</Typography><SuggestionsList admin actorId={access?.userId}/></Stack>}
