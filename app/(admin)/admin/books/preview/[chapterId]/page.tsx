import { structuredLearningWarnings } from '@/app/lib/structuredLearning'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Alert, Box, Stack, Typography } from '@mui/material'
import { guardAdmin } from '@/app/actions/auth'
import { fetchChapterForAdminPreview } from '@/app/actions/books'
import ChapterReader from '@/app/books/[book]/[chapter]/ChapterReader'
import { structuredChapterPages, StructuredChapterDiagnostic } from '@/app/components/books/structured/StructuredChapterRenderer'

export const dynamic = 'force-dynamic'
export default async function ChapterPreview({params,searchParams}:{params:Promise<{chapterId:string}>;searchParams:Promise<{page?:string;block?:string}>}) {
 await guardAdmin()
 const {chapterId}=await params
 const query=await searchParams
 const page=Number(query.page),block=query.block===undefined?NaN:Number(query.block)
 const result=await fetchChapterForAdminPreview(chapterId)
 if(!result)notFound()
 const {chapter,chapters,book}=result
 const index=chapters.findIndex(item=>item.id===chapter.id)
 const format=chapter.structuredContent
 const pages=result.previewDiagnostic?[<StructuredChapterDiagnostic key="incomplete" message={result.previewDiagnostic}/>]:format?.kind==='structured'?structuredChapterPages(format.chapter):format?.kind==='structured-error'?[<StructuredChapterDiagnostic key="diagnostic" message={format.message}/>]:undefined
 return <Stack spacing={2}>
  <Alert severity="info">Admin Preview{(book.isCompleted===false || !result.isPublished)?' — This chapter is not currently public':''}</Alert>
  <Link href="/admin/books">Back to Admin Books</Link>
  <Typography component="h1" variant="h4">{book.title} — {chapter.title}</Typography>
  {format?.kind==='structured'&&structuredLearningWarnings(format.chapter).length>0&&<Alert severity="warning"><ul>{structuredLearningWarnings(format.chapter).map((message,i)=><li key={i}>{message}</li>)}</ul></Alert>}
  <Box sx={{minWidth:0}}><ChapterReader key={chapter.id} adminPreview initialPage={Number.isInteger(page)&&page>=1&&page<=500?page:undefined} initialBlock={Number.isInteger(block)&&block>=0?block:undefined} bookSlug={book.slug} bookTitle={book.title} chapterTitle={chapter.title} chapterSlug={chapter.slug} content={chapter.content} structuredPages={pages}/></Box>
  <Stack direction="row" spacing={2} useFlexGap sx={{flexWrap:'wrap'}}>
   {index>0&&<Link href={`/admin/books/preview/${chapters[index-1].id}`}>Previous chapter</Link>}
   {index>=0&&index<chapters.length-1&&<Link href={`/admin/books/preview/${chapters[index+1].id}`}>Next chapter</Link>}
  </Stack>
 </Stack>
}
