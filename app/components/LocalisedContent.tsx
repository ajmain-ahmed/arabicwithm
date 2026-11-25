'use client'
import {useWebsiteLocale} from './WebsiteLocaleProvider'
import {localisedText} from '@/app/lib/localisation/locale'
export default function LocalisedContent({original,arabic,approved}:{original:string;arabic?:string|null;approved?:string|null}){const {locale}=useWebsiteLocale();return <bdi>{localisedText(locale,original,arabic,approved)}</bdi>}
