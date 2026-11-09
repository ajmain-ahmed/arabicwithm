'use client'
import AwmPageError from '@/app/components/AwmPageError'
export default function GlobalError({error}:{error:Error&{digest?:string}}){return <html lang="en" style={{colorScheme:'dark'}}><body style={{margin:0,background:'#091c14'}}><AwmPageError error={error}/></body></html>}
