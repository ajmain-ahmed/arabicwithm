'use client'
import {Button,Menu,MenuItem} from '@mui/material'
import {useState} from 'react'
import {useWebsiteLocale} from '@/app/components/WebsiteLocaleProvider'
export default function WebsiteLanguageButton(){

 const {locale,setLocale,t}=useWebsiteLocale(),[anchor,setAnchor]=useState<HTMLElement|null>(null)
 return <><Button aria-label={t("Website language")} aria-haspopup="menu" aria-expanded={Boolean(anchor)} onClick={event=>setAnchor(event.currentTarget)} startIcon={<svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><circle cx="12" cy="12" r="9"/><ellipse cx="12" cy="12" rx="4" ry="9"/><path d="M3 12h18"/></svg>} sx={{color:'inherit',display:'inline-flex',alignItems:'center',columnGap:.75,minWidth:0,minHeight:{xs:44,md:36},px:{xs:.25,md:1.25},fontSize:12,whiteSpace:'nowrap','& .MuiButton-startIcon':{margin:0}}}><span dir="ltr" data-language-indicator>{locale.toUpperCase()}</span></Button><Menu anchorEl={anchor} open={Boolean(anchor)} onClose={()=>setAnchor(null)}><MenuItem selected={locale==='en'} lang="en" dir="ltr" onClick={()=>{setLocale('en');setAnchor(null)}}>English — EN</MenuItem><MenuItem selected={locale==='ar'} lang="ar" dir="rtl" onClick={()=>{setLocale('ar');setAnchor(null)}}>العربية — AR</MenuItem></Menu></>
}
