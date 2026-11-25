'use client'
import {Paper,Typography} from '@mui/material'
import {useWebsiteLocale} from '@/app/components/WebsiteLocaleProvider'
import type {ReactNode} from 'react'
export default function PracticePanel({name,title,children}:{name:string;title:string;children:ReactNode}){
 const {t,direction}=useWebsiteLocale()
 return <Paper component="section" dir={direction} aria-label={t(name)} variant="outlined" sx={{p:{xs:1.5,sm:2},minWidth:0,borderRadius:'12px'}}><Typography component="h2" sx={{fontSize:22,mb:2}}>{t(title)}</Typography>{children}</Paper>
}
