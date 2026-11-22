import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Give Feedback',
  robots: { index: false, follow: true },
}

export default function FeedbackLayout({ children }: { children: React.ReactNode }) {
  return children
}
