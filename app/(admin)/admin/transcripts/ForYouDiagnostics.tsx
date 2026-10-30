import {fetchForYouDiagnostics} from '@/app/actions/forYou'

export default async function ForYouDiagnostics(){
 const diagnostics=await fetchForYouDiagnostics()
 return <details style={{margin:'16px 0',padding:16,border:'1px solid #d4a843',borderRadius:10}}>
  <summary>For You eligibility diagnostics</summary>
  <p>{diagnostics.totalTranscripts} transcripts · {diagnostics.adminTranscripts} Admin sources · {diagnostics.publishedTranscripts} published · {diagnostics.eligibleTranscripts} eligible sources · {diagnostics.eligibleSegments} eligible clip anchors · {diagnostics.uniqueVideos} unique videos</p>
  <p>Clip anchors are valid starting segments; clips combine complete nearby segments. Embedding availability is checked during playback; browser failures never change publication.</p>
  <div style={{overflowX:'auto'}}><table style={{width:'100%',textAlign:'left',borderCollapse:'collapse'}}>
   <thead><tr>{['Transcript','Eligible anchors','Excluded segments','Invalid timing/text','Eligibility notes'].map(label=><th key={label} style={{padding:8}}>{label}</th>)}</tr></thead>
   <tbody>{diagnostics.sources.map(source=><tr key={source.id}>
    <td style={{padding:8}}>{source.title}<br/><small>{source.youtubeId}</small></td>
    <td>{source.eligibleSegments}</td><td>{source.excludedSegments}</td><td>{source.invalidSegments}</td>
    <td>{[...source.reasons,...(source.errorCode?[`Source error: ${source.errorCode}`]:[])].join('; ')||'Eligible'}</td>
   </tr>)}</tbody>
  </table></div>
 </details>
}
