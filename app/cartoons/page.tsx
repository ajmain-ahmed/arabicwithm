// app/cartoons/page.tsx  ← REPLACE the file above with this one
// This is a Server Component — no 'use client' needed.
// It reads the filesystem and passes data to the client shell.

import { getAllShows } from '../lib/cartoons'
import CartoonsPage from './CartoonsPage' 

export const metadata = {
  title: 'Arabic Cartoons | ArabicWithM',
  description: 'Watch your favourite cartoons subtitled in Arabic with CEFR-graded worksheets and quizzes.',
}

export default function Page() {
  const shows = getAllShows()
  return <CartoonsPage shows={shows} />
}