'use client'
import {createContext,useContext,useEffect,useMemo,useSyncExternalStore,type ReactNode} from 'react'
import {usePathname} from 'next/navigation'
import {localeDirection,websiteLocale,WEBSITE_LOCALE_KEY,type WebsiteLocale} from '@/app/lib/localisation/locale'
import {translateMessage} from '@/app/lib/localisation/messages'
import {WEBSITE_LOCALISATION_ENABLED} from '@/app/lib/localisation/features'
const listeners=new Set<()=>void>()
let memoryLocale:WebsiteLocale|null=null
function snapshot(fallback:WebsiteLocale){try{return websiteLocale(localStorage.getItem(WEBSITE_LOCALE_KEY)??memoryLocale??fallback)}catch{return memoryLocale??fallback}}
function subscribe(listener:()=>void){listeners.add(listener);window.addEventListener('storage',listener);return()=>{listeners.delete(listener);window.removeEventListener('storage',listener)}}
function choose(locale:WebsiteLocale){if(!WEBSITE_LOCALISATION_ENABLED)return;memoryLocale=locale;try{localStorage.setItem(WEBSITE_LOCALE_KEY,locale)}catch{};try{document.cookie=`${WEBSITE_LOCALE_KEY}=${locale}; Path=/; Max-Age=31536000; SameSite=Lax${location.protocol==='https:'?'; Secure':''}`}catch{};for(const listener of listeners)listener()}
const defaults={locale:'en' as WebsiteLocale,serverLocale:'en' as WebsiteLocale,direction:'ltr' as 'ltr'|'rtl',setLocale:choose,t:(text:string,values?:Record<string,string|number>)=>translateMessage('en',text,values)}
const Context=createContext(defaults)
const subscribeHydration=()=>()=>{}
// A newly streamed route can hydrate beneath an already-Arabic layout. Each
// consumer first matches its server HTML, then adopts the current preference.
export function useWebsiteLocale(){
 const context=useContext(Context),hydrated=useSyncExternalStore(subscribeHydration,()=>true,()=>false)
 return hydrated?context:{...context,locale:context.serverLocale,direction:localeDirection(context.serverLocale),t:(text:string,values?:Record<string,string|number>)=>translateMessage(context.serverLocale,text,values)}
}
export default function WebsiteLocaleProvider({children,initialLocale='en'}:{children:ReactNode;initialLocale?:WebsiteLocale}){
 const selected=useSyncExternalStore(subscribe,()=>snapshot(initialLocale),()=>initialLocale),path=usePathname()
 const englishOnly=!WEBSITE_LOCALISATION_ENABLED||path?.startsWith('/admin'),locale=englishOnly?'en':selected,serverLocale=englishOnly?'en':initialLocale,direction=localeDirection(locale)
 useEffect(()=>{document.documentElement.lang=locale;document.documentElement.dir=direction},[locale,direction])
 const value=useMemo(()=>({locale,serverLocale,direction,setLocale:choose,t:(text:string,values?:Record<string,string|number>)=>translateMessage(locale,text,values)}),[locale,serverLocale,direction])
 return <Context.Provider value={value}>{children}</Context.Provider>
}
export function UiText({children,values}:{children:string;values?:Record<string,string|number>}){const {t}=useWebsiteLocale();return <>{t(children,values)}</>}
