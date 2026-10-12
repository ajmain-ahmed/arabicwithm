import PDFDocument from 'pdfkit'
import { join } from 'node:path'
import type { ReviewExportData } from '@/app/lib/reviewExports'
import { pdfTextRuns } from '@/app/lib/reviewPdfText'

export async function suggestionsPdf(data: ReviewExportData): Promise<Buffer> {
 const doc=new PDFDocument({size:'A4',margin:44,bufferPages:true,info:{Title:`${data.title} — Suggestions`,Author:'Arabic With M'}})
 const chunks: Buffer[]=[]
 const result=new Promise<Buffer>((resolve,reject)=>{doc.on('data',c=>chunks.push(c));doc.on('end',()=>resolve(Buffer.concat(chunks)));doc.on('error',reject)})
 doc.registerFont('Arabic',join(process.cwd(),'public/fonts/review/Amiri-Regular.ttf'))
 doc.font('Arabic')
 const write=(text:string,size=12)=>{
  doc.fontSize(size).fillColor('#2c1a0e')
  if(/[\u0600-\u06ff]/u.test(text)){
   // PDFKit's automatic wrapper emits words separately, reversing Arabic word order.
   // Wrap in logical order, then shape each complete line in a single text run.
   const width=doc.page.width-88,lines:string[]=[]
   const runWidth=(value:string)=>pdfTextRuns(value).reduce((sum,run)=>sum+doc.widthOfString(run.text,{features:['liga']}),0)
   for(const paragraph of text.split(/\r?\n/)){
    let line=''
    for(const word of paragraph.split(/\s+/u)){
     const next=line?line+' '+word:word
     if(line&&runWidth(next)>width){lines.push(line);line=word}else line=next
    }
    lines.push(line)
   }
   for(const line of lines){
    if(doc.y+doc.currentLineHeight(true)>doc.page.height-55)doc.addPage()
    const y=doc.y
    let x=Math.max(44,doc.page.width-44-runWidth(line))
    for(const run of pdfTextRuns(line)){
     doc.text(run.text,x,y,{lineBreak:false,features:['liga']})
     x+=doc.widthOfString(run.text,{features:['liga']})
    }
    doc.y=y+doc.currentLineHeight(true)+3;doc.x=44
   }
  }else doc.text(text,{width:doc.page.width-88,lineGap:3})
  doc.moveDown(0.35)
 }
 write('Arabic With M · Suggestions',20)
 write(data.title,18)
 write(`${data.type==='book'?'Book':'Show'} · ${data.suggestions.length} suggestions`)
 write('Line numbers are 1-based within each saved chapter/episode. Compare the original text against the downloaded current source before applying changes. Suggestions may refer to an earlier saved version.',10)
 if(!data.suggestions.length)write('No suggestions match the selected scope and filters.')
 for(const s of data.suggestions){
  if(doc.y>doc.page.height-180)doc.addPage()
  write(s.unit_title,16)
  write(`Line ${s.line_index+1} · ${s.status} · ${s.created_at}`,10)
  write('Submitted by',10);write(s.author_name??'Reviewer',12)
  for(const [label,value] of [['Original Arabic',s.original_arabic],['Original English',s.original_english],['Proposed Arabic',s.suggested_arabic],['Proposed English',s.suggested_english],['Comment',s.comment],['Reason',s.reason],['Admin response',s.admin_response]]){
   if(!value)continue
   if(doc.y>doc.page.height-95)doc.addPage()
   write(label!,10);write(value!,/[\u0600-\u06ff]/u.test(value!)?15:12)
  }
  doc.moveDown()
 }
 const range=doc.bufferedPageRange()
 for(let i=0;i<range.count;i++){
  doc.switchToPage(i)
  // Keep footer inside the content area to avoid creating pages during pagination.
  doc.fontSize(9).fillColor('#7a6e65').text(`Arabic With M · ${i+1} / ${range.count}`,44,doc.page.height-42,{lineBreak:false})
 }
 doc.end()
 return result
}
