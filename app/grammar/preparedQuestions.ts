import curriculum from './mobile-curriculum.json'
import {formLabel,sourceValid,validVerb,type PreparedRow,type Verb} from './models'
import {websiteQuestions} from './websiteQuestions'
import {displayArabic} from '@/app/lib/displayArabic'
import {shuffle} from './questionBank'

export interface Pattern {
 id:string;pattern:string;note:string;example:string;meaning:string;dictionaryEntryId?:number
}
const indexedPatterns:Pattern[]=curriculum.patterns.map(p=>({id:`dictionary-${p.dictionaryEntryId}`,pattern:p.pattern,note:p.tendency,example:p.example,meaning:p.meaning,dictionaryEntryId:p.dictionaryEntryId}))
/** Both inventories are reviewed source data; no morphology is guessed from a word. */
export const wordPatternInventory:Pattern[]=[...indexedPatterns,...websiteQuestions.flatMap(q=>q.wordPattern?[{...q.wordPattern,note:q.explanation,example:q.arabic,meaning:q.english}]:[])]
  .filter((p,i,all)=>all.findIndex(other=>other.pattern===p.pattern)===i)
export interface PreparedQuestion {
 id:string;arabic:string;english:string;surface:string;targetIndex?:number;sourceLabel:string;
 answer:string;answerLabel:string;note:string;choices:{id:string;label:string}[];
 patternKey:string;wordKey:string;pairKey:string;verb?:Verb
}
const wordKey=(word:string)=>displayArabic(word,false).replace(/[^\p{L}\p{N}]/gu,'').replace(/^ال/,'')
function patternQuestion(p:Pattern):PreparedQuestion{
 const word=p.dictionaryEntryId?`dictionary-${p.dictionaryEntryId}`:wordKey(p.example)
 return {id:`reviewed-pattern-${p.id}`,arabic:p.example,english:p.meaning,surface:p.example,sourceLabel:'Reviewed foundations',answer:p.id,answerLabel:p.pattern,note:p.note,
  choices:shuffle([p,...shuffle(wordPatternInventory.filter(other=>other.id!==p.id)).slice(0,5)]).map(p=>({id:p.id,label:p.pattern})),patternKey:p.id,wordKey:word,pairKey:`${word}:${p.id}`}
}
export function contextExplanation(verb:Verb,meaning?:string):string{
 const form=verb.form?curriculum.forms[verb.form-1]:(curriculum.quadriliteral as Record<string,{past:string;present:string;tendency:string}>)[verb.quadriliteral_pattern!]
 const past=verb.form===1?verb.form_i?.past||form.past:form.past,present=verb.form===1?verb.form_i?.present||form.present:form.present
 return `The stem matches ${formLabel(verb)} (${past} / ${present}). ${form.tendency} Here: ${(meaning||verb.meaning).replace(/[.!?]+$/,'')}.`
}
export function preparedQuestions(rows:PreparedRow[],activity:'patterns'|'context'):PreparedQuestion[]{
 const result:PreparedQuestion[]=[]
 for(const row of rows){
  if(!sourceValid(row)||typeof row.payload?.arabic!=='string'||typeof row.payload.english!=='string'||!Array.isArray(row.payload.targets))continue
  for(const target of row.payload.targets){
   if(!Number.isInteger(target.token_index)||target.token_index<0||target.token_index>=row.payload.arabic.split(/\s+/).length||typeof target.surface!=='string')continue
   if(activity==='patterns'){
    const pattern=Number.isInteger(target.pattern_index)?indexedPatterns[target.pattern_index!]:undefined
    if(!pattern||pattern.dictionaryEntryId!==target.dictionary_entry_id)continue
    const base=patternQuestion(pattern)
    result.push({...base,id:`${row.id}:${target.token_index}:${pattern.id}`,arabic:row.payload.arabic,english:row.payload.english,surface:target.surface,targetIndex:target.token_index,sourceLabel:row.source_label})
   }else if(validVerb(target.verb)){
    const verb=target.verb,answer=verb.quadriliteral_pattern??String(verb.form),word=wordKey(target.surface)
    result.push({id:`${row.id}:${target.token_index}:${answer}`,arabic:row.payload.arabic,english:row.payload.english,surface:target.surface,targetIndex:target.token_index,sourceLabel:row.source_label,
      answer,answerLabel:formLabel(verb),note:contextExplanation(verb,target.meaning),verb,
      choices:verb.quadriliteral_pattern?Object.entries(curriculum.quadriliteral).map(([id,f])=>({id,label:f.label})):curriculum.forms.map((_,i)=>({id:String(i+1),label:`Form ${['I','II','III','IV','V','VI','VII','VIII','IX','X'][i]}`})),
      patternKey:answer,wordKey:word,pairKey:`${word}:${answer}`})
   }
  }
 }
 return activity==='patterns'?[...result,...wordPatternInventory.map(patternQuestion)]:result
}
export interface RecentQuestion {wordKey:string;patternKey:string;pairKey:string}
/** Random ties, balanced coverage, and short recent windows without starving small pools. */
export function variedPractice(pool:PreparedQuestion[],recent:RecentQuestion[]=[],limit=12):PreparedQuestion[]{
 const remaining=shuffle(pool),result:PreparedQuestion[]=[],counts=new Map<string,number>(),history=[...recent]
 while(remaining.length&&result.length<limit){
  const cost=(q:PreparedQuestion)=>
   (counts.get(q.patternKey)??0)*100+
   (history.slice(-3).some(h=>h.patternKey===q.patternKey)?20:0)+
   (history.slice(-8).some(h=>h.wordKey===q.wordKey)?30:0)+
   (history.slice(-12).some(h=>h.pairKey===q.pairKey)?40:0)
  remaining.sort((a,b)=>cost(a)-cost(b))
  const q=remaining.shift()!;result.push(q);history.push(q);counts.set(q.patternKey,(counts.get(q.patternKey)??0)+1)
  // Same words in different source sentences do not count as new questions.
  for(let i=remaining.length-1;i>=0;i--)if(remaining[i].pairKey===q.pairKey)remaining.splice(i,1)
 }
 return result
}
