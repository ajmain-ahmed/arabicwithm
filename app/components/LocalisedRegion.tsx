'use client'
import {Box,type BoxProps} from '@mui/material'
import {useWebsiteLocale} from '@/app/components/WebsiteLocaleProvider'
/** Localise accessible region labels supplied by a Server Component without
 * adding locale cookies, another DOM wrapper or a locale-dependent key. */
export default function LocalisedRegion({'aria-label':label,title,...props}:BoxProps){
 const {t}=useWebsiteLocale()
 return <Box {...props} aria-label={label?t(label):undefined} title={title?t(title):undefined}/>
}
