import { getAuthenticatedUserId } from '@/app/actions/auth';
import LearningSignInGate from '@/app/components/LearningSignInGate';
import GrammarPage from './GrammarPage';
export const metadata = { title: 'Arabic Grammar', robots: { index: false, follow: true } };
export default async function Page() { if (!await getAuthenticatedUserId())
    return <LearningSignInGate activity="Grammar"/>; return <GrammarPage />; }
