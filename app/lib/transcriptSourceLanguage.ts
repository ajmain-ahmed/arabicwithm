export type SourceLanguage='ar'|'en'
export const sourceLanguage=(value:unknown):SourceLanguage=>value==='en'?'en':'ar'
export function sourceLanguageFromMetadata(raw:unknown):SourceLanguage{return sourceLanguage(raw&&typeof raw==='object'&&!Array.isArray(raw)?(raw as Record<string,unknown>).source_language:undefined)}
/** Validation warning only: this never determines mode or swaps stored fields. */
export function englishSourceNeedsReview(tokens:{english:string;arabic:string}[],translation?:string|null):boolean{
 return !tokens.length||!translation||!/[\u0621-\u064a]/u.test(translation)||tokens.some(token=>/[\u0621-\u064a]/u.test(token.english)||(/[A-Za-z]/.test(token.english)&&!/[\u0621-\u064a]/u.test(token.arabic)))
}
