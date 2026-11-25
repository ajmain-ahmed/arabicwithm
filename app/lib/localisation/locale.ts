export const WEBSITE_LOCALES = ['en','ar'] as const
export type WebsiteLocale = typeof WEBSITE_LOCALES[number]
export const WEBSITE_LOCALE_KEY = 'awm-website-locale'
export function websiteLocale(value:unknown):WebsiteLocale{return value==='ar'?'ar':'en'}
export function localeDirection(locale:WebsiteLocale):'rtl'|'ltr'{return locale==='ar'?'rtl':'ltr'}
export function localisedText(locale:WebsiteLocale,original:string,authoredArabic?:string|null,approvedArabic?:string|null){
 return locale==='ar'?(authoredArabic?.trim()||approvedArabic?.trim()||original):original
}
export function formatLocaleDate(value:Date|string|number,locale:WebsiteLocale,options:Intl.DateTimeFormatOptions={dateStyle:'medium'}){
 return new Intl.DateTimeFormat(locale==='ar'?'ar':'en-GB',options).format(new Date(value))
}
