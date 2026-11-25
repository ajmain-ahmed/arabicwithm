'use client'
import {LinearProgress} from '@mui/material'
import {useWebsiteLocale} from '@/app/components/WebsiteLocaleProvider'
export default function LocalisedProgress({label}:{label:string}){const {t}=useWebsiteLocale();return <LinearProgress aria-label={t(label)}/>}
