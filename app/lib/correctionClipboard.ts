import type { BookCorrection } from '@/app/lib/reviews'

/** Keep every record paired with its own saved passage, including older source versions. */
export function orderedCorrections(corrections: readonly BookCorrection[]): BookCorrection[] {
 return [...corrections].sort((a,b)=>a.line_index-b.line_index||a.created_at.localeCompare(b.created_at)||a.id.localeCompare(b.id))
}
export function formatCorrection(correction: BookCorrection): string {
 return `Original:\n${correction.selected_text ?? correction.original_arabic}\n\nSuggestion:\n${correction.comment}`
}
export function formatCorrectionCollection(corrections: readonly BookCorrection[]): string {
 if(!corrections.length)throw new Error('There are no comments to copy in this chapter.')
 return orderedCorrections(corrections).map((correction,index)=>`### Correction ${index+1}\n\n${formatCorrection(correction)}`).join('\n\n')
}

/** Start the clipboard operation in the click event while the server verifies access. */
export async function writeCorrectionClipboard(text: Promise<string>): Promise<void> {
 // Observe failures even when the browser denies the write before consuming the data promise.
 void text.catch(()=>{})
 if(navigator.clipboard?.write&&typeof ClipboardItem!=='undefined'){
  const data=text.then(value=>new Blob([value],{type:'text/plain'}))
  void data.catch(()=>{})
  const item=new ClipboardItem({'text/plain':data})
  await navigator.clipboard.write([item])
 }else{
  const value=await text
  if(!navigator.clipboard?.writeText)throw new Error('Clipboard access is unavailable in this browser. Use HTTPS and allow clipboard access.')
  await navigator.clipboard.writeText(value)
 }
}
