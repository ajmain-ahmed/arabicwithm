'use client'
import AwmPageError from '@/app/components/AwmPageError'
export default function PageError({error}:{error:Error&{digest?:string}}){return <AwmPageError error={error}/>}
