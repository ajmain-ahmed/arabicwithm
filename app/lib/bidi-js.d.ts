declare module 'bidi-js' {
 interface Levels { levels: Uint8Array; paragraphs: {start:number;end:number;level:number}[] }
 export default function bidiFactory(): {
  getEmbeddingLevels(text:string,direction?:'ltr'|'rtl'|'auto'):Levels
  getReorderSegments(text:string,levels:Levels):[number,number][]
 }
}
