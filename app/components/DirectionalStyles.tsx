'use client'
import {createContext,useContext,type ReactNode} from 'react'
import {CacheProvider} from '@emotion/react'
import type {EmotionCache} from '@emotion/cache'
import {prefixer} from 'stylis'
import rtlPlugin from '@mui/stylis-plugin-rtl'
import {AppRouterCacheProvider} from '@mui/material-nextjs/v16-appRouter'
import {useWebsiteLocale} from '@/app/components/WebsiteLocaleProvider'

const EnglishCache=createContext<EmotionCache|null>(null)
export function LtrStyles({children}:{children:ReactNode}){
 const cache=useContext(EnglishCache)
 return cache?<CacheProvider value={cache}>{children}</CacheProvider>:<>{children}</>
}
function EnglishRegistry({value,children}:{value:EmotionCache;children?:ReactNode}){
 return <EnglishCache.Provider value={value}>{children}</EnglishCache.Provider>
}
function ActiveCache({value,children}:{value:EmotionCache;children?:ReactNode}){
 const english=useContext(EnglishCache),{direction}=useWebsiteLocale()
 return <CacheProvider value={direction==='rtl'?value:english!}>{children}</CacheProvider>
}
const englishOptions={key:'css',enableCssLayer:true}
const arabicOptions={key:'awm-rtl',enableCssLayer:true,stylisPlugins:[prefixer,rtlPlugin]}
export default function DirectionalStyles({children}:{children:ReactNode}){
 // Both registries support streaming SSR. Cache values switch in place;
 // neither the application tree nor a player is keyed by locale.
 return <AppRouterCacheProvider options={englishOptions} CacheProvider={EnglishRegistry}>
  <AppRouterCacheProvider options={arabicOptions} CacheProvider={ActiveCache}>{children}</AppRouterCacheProvider>
 </AppRouterCacheProvider>
}
