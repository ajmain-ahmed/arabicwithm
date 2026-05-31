'use client'

import { useEffect } from 'react'
import { useVocabStore } from '@/store/vocabStore'
import { useAuth } from '@/app/AuthContext'

export default function GlobalDataInit({ children }: { children: React.ReactNode }) {
  const fetchUserProgressWords = useVocabStore((s) => s.fetchUserProgressWords)
  const { user } = useAuth()

  useEffect(() => {
    if (user) {
      fetchUserProgressWords()
    }
  }, [user, fetchUserProgressWords])

  return <>{children}</>
}