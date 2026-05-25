import { notFound } from 'next/navigation'
import { fetchThemesWithProgress, type ThemeProgress } from '@/app/actions/vocab'
import { getAllLevels } from '@/app/lib/study'
import ThemesLandingClient from './ThemesLandingClient'

const SLUG_TO_LEVEL: Record<string, string> = {
  Beginner: 'A0',
  Apprentice: 'A1',
  Competent: 'A2',
  Proficient: 'B1',
  'Highly-Proficient': 'B2',
  Expert: 'C1',
  Native: 'C2',
}

const SLUG_LABELS: Record<string, string> = {
  Beginner: 'Beginner | A0',
  Apprentice: 'Apprentice | A1',
  Competent: 'Competent | A2',
  Proficient: 'Proficient | B1',
  'Highly-Proficient': 'Highly Proficient | B2',
  Expert: 'Expert | C1',
  Native: 'Native | C2',
}

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const label = SLUG_LABELS[slug] ?? slug
  return {
    title: `${label} Themes | ArabicWithM`,
    description: `Browse ${label} vocabulary themes.`,
  }
}

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const levelCode = SLUG_TO_LEVEL[slug]
  if (!levelCode) notFound()

  const themes = await fetchThemesWithProgress(levelCode)
  const label = SLUG_LABELS[slug] ?? slug

  return <ThemesLandingClient slug={slug} levelCode={levelCode} label={label} themes={themes} />
}
