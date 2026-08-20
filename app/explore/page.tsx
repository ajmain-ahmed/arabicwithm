import type { Metadata } from 'next'
import { fetchEpisodesForExplorePublic } from '@/app/actions/cartoons'
import { fetchBookPagesForExplorePublic } from '@/app/actions/books'
import ExploreFeed from './ExploreFeed'

export const revalidate = 300

export const metadata: Metadata = {
  title: 'Explore Arabic | ArabicWithM',
  description: 'Discover randomized Arabic videos and book passages with translations.',
}

export default async function ExplorePage() {
  const [episodes, bookPages] = await Promise.all([
    fetchEpisodesForExplorePublic(),
    fetchBookPagesForExplorePublic(),
  ])
  return <ExploreFeed episodes={episodes} bookPages={bookPages} />
}
