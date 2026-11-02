'use client'

import { useEffect, useRef } from 'react'
import {useGrammarPreferences} from './GrammarUI'

export function feedbackDelay(explanation:string):number{
 const length=explanation.trim().length
 return length<=60?1500:length<=180?2500:4000
}

/** Keep incorrect-answer explanations in place; advance only completed answers. */
export default function useCorrectAutoAdvance(correct: boolean, advance: () => void, explanation='') {
  const {preferences}=useGrammarPreferences(),delay=feedbackDelay(explanation)
  const latest = useRef(advance)
  useEffect(() => { latest.current = advance }, [advance])
  useEffect(() => {
    if (!correct||!preferences.autoNext) return
    const timer = setTimeout(() => latest.current(), delay)
    return () => clearTimeout(timer)
  }, [correct,preferences.autoNext,delay])
}
