"use client"

import { useEffect } from "react"
import { useVocabStore } from "@/store/vocabStore"

export default function VocabInitializer() {
  const fetch = useVocabStore((s) => s.fetch)
  useEffect(() => { fetch() }, [])
  return null
}