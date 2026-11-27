"use client"
import {UiText} from '@/app/components/WebsiteLocaleProvider'

import {useState} from 'react'
import {Box,Button} from '@mui/material'
import StructuredActivity from '@/app/components/books/structured/StructuredActivity'
import type {WebsiteQuestion} from '@/app/grammar/websiteQuestions'
/** Reuse the existing ordering renderer and the exact reviewed source sentence.
 * This restores the source order; it does not grade alternative Arabic orders. */
export default function OrderingActivity({question,onNext}:{question:WebsiteQuestion;onNext:()=>void}){
 const [result,setResult]=useState<boolean|null>(null)
 const words=question.arabic.trim().split(/\s+/)
 const activity={id:`learn-order-${question.id}`,prompt_en:'Restore the original source sentence. Compare your order with the model answer.',stimulus_en:question.english,interaction:{kind:'ordering',grading:'automatic',shuffle:true,tiles:words.map((text_ar,i)=>({id:String(i),text_ar}))}}
 const answer={correct_order:words.map((_,i)=>String(i)),answer_ar:question.arabic,explanation_en:question.explanation}
 return <Box data-grammar-question={question.id} sx={{'& fieldset':{bgcolor:'background.paper',borderColor:'divider'},'& li, & li > div':{textAlign:'center'},'& [lang=ar]':{fontSize:'var(--grammar-target-size)',lineHeight:1.9,textAlign:'center'},'& [role=status] [lang=ar]':{fontSize:'var(--grammar-arabic-size)'}}}><Box data-grammar-feedback={result===null?undefined:result?'correct':'incorrect'}><StructuredActivity activity={activity} answer={answer} onResult={setResult}/></Box>{result!==null&&<Button variant="contained" onClick={onNext}><UiText>{"Next Activity"}</UiText></Button>}</Box>
}
