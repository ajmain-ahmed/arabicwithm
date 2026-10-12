import bidiFactory from 'bidi-js'
const bidi=bidiFactory()

/** Visual-order runs with logical text inside each run for OpenType Arabic shaping. */
export function pdfTextRuns(text:string) {
 const levels=bidi.getEmbeddingLevels(text,'auto')
 const indices=Array.from({length:text.length},(_,index)=>index)
 for(const [start,end] of bidi.getReorderSegments(text,levels)){
  const reversed=indices.slice(start,end+1).reverse()
  indices.splice(start,reversed.length,...reversed)
 }
 const runs:{indices:number[];rtl:boolean}[]=[]
 for(const index of indices){
  const rtl=Boolean(levels.levels[index]&1),last=runs.at(-1)
  if(last&&last.rtl===rtl&&index===last.indices.at(-1)!+(rtl?-1:1))last.indices.push(index)
  else runs.push({indices:[index],rtl})
 }
 return runs.map(run=>({text:(run.rtl?run.indices.reverse():run.indices).map(index=>text[index]).join(''),rtl:run.rtl}))
}
