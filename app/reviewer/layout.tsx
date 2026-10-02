import { redirect } from 'next/navigation'
import { Box, Container } from '@mui/material'
import { getAuthenticatedAccess } from '@/app/actions/auth'
export default async function ReviewerLayout({ children }: { children: React.ReactNode }) {
 const access=await getAuthenticatedAccess()
 if(!access||!['editor','admin'].includes(access.role??'user')) redirect('/')
 return <Container maxWidth="lg"><Box sx={{py:4,color:'var(--awm-bark)'}}>{children}</Box></Container>
}
