'use client'

import { useEffect, useRef } from 'react'

/** Keep incorrect-answer explanations in place; advance only completed answers. */
export default function useCorrectAutoAdvance(correct: boolean, advance: () => void) {
  const latest = useRef(advance)
  useEffect(() => { latest.current = advance }, [advance])
  useEffect(() => {
    if (!correct) return
    const timer = setTimeout(() => latest.current(), 1500)
    return () => clearTimeout(timer)
  }, [correct])
}
