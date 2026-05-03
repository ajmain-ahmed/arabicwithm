import { getAllLevels } from '../lib/study'
import FlashcardsLandingPage from './FlashcardsLandingPage'

export const metadata = {
  title: 'Study Arabic | ArabicWithM',
  description: 'Master Arabic vocabulary through themed flashcards organised by CEFR level.',
}

export default async function Page() {
  const levels = await getAllLevels()
  return <FlashcardsLandingPage levels={levels} />
}
