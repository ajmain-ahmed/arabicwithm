'use client'

import EnglishSourceSegment from './EnglishSourceSegment'
import type {ForYouToken} from '@/app/lib/forYou'

/** Explore and For You share the canonical English-source renderer. Other
 * transcript surfaces retain their existing typography. */
export default function EnglishForYouSegment(props:{
 line:{tokens:ForYouToken[];original_text?:string;english_text?:string|null;translation?:string|null}
 settings:{meanings:boolean;sentence:boolean;arabicSize?:number;englishSize?:number}
 time:number;mobile?:boolean;active?:boolean;explore?:boolean
}){
 return <EnglishSourceSegment {...props}/>
}
