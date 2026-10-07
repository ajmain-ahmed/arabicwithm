import { normalizeYouTubeId } from '@/app/lib/cartoons'

export interface CanonicalChunk { text: string; offset: number; duration: number; english?: string; tokens?: Record<string, unknown>[]; [key: string]: unknown }
export function transcriptVideoId(input: string): string {
  if (input.length>2048) throw new Error('Enter a valid YouTube URL.')
  const id=normalizeYouTubeId(input)
  if (!id) throw new Error('Enter a valid YouTube URL or 11-character video ID.')
  if (!/^[A-Za-z0-9_-]{11}$/.test(input.trim())) {
    const url=new URL(/^https?:\/\//i.test(input.trim())?input.trim():`https://${input.trim()}`)
    if (!['https:','http:'].includes(url.protocol)||url.username||url.password||url.port) throw new Error('Enter a valid YouTube URL.')
  }
  return id
}
function milliseconds(value: string): number {
  const match=value.match(/^(?:(\d{1,2}):)?(\d{2}):(\d{2})[.,](\d{3})$/)
  if (!match||Number(match[2])>=60||Number(match[3])>=60) throw new Error('Use SRT/VTT timestamps with milliseconds and explicit start/end times.')
  return ((Number(match[1]??0)*60+Number(match[2]))*60+Number(match[3]))*1000+Number(match[4])
}
function cues(input:string):CanonicalChunk[] {
  if (!input.trim()||new TextEncoder().encode(input).length>20*1024*1024) throw new Error('Supply a timestamped transcript of at most 20 MB.')
  const result:CanonicalChunk[]=[]
  const blocks=input.replace(/^\uFEFF/,'').replace(/\r\n?/g,'\n').trim().split(/\n\s*\n/).flatMap(block=>{const lines=block.split('\n');return lines.length>1&&lines.every(line=>line.includes('-->'))?lines:[block]})
  for (const block of blocks) {
    if (/^(WEBVTT|NOTE|STYLE|REGION)(\s|$)/.test(block)) {
      if (block.startsWith('WEBVTT')&&block.includes('-->')) throw new Error('Separate the WEBVTT header from cues with a blank line.')
      continue
    }
    const lines=block.split('\n')
    if(lines.filter(line=>line.includes('-->')).length>1) throw new Error('Separate subtitle cues with blank lines; each cue must have one timestamp range.')
    const index=lines.findIndex(line=>line.includes('-->'))
    if (index<0) throw new Error('Untimed text cannot be published. Supply SRT, VTT or explicit timestamp ranges.')
    const timing=lines[index].match(/^\[?\s*((?:\d{1,2}:)?\d{2}:\d{2}[.,]\d{3})\s*-->\s*((?:\d{1,2}:)?\d{2}:\d{2}[.,]\d{3})\s*\]?\s*(.*)$/)
    if (!timing) throw new Error('Each cue needs an explicit start and end timestamp.')
    const offset=milliseconds(timing[1]),end=milliseconds(timing[2])
    const inline=timing[3].trim()
    // VTT positioning is metadata, not transcript content.
    const text=([inline&&!/^(align|position|line|size|vertical):/.test(inline)?inline:'',...lines.slice(index+1)].filter(Boolean).join('\n')).replace(/<[^>]*>/g,'').trim()
    if (!text||end<=offset||end>43200000) throw new Error('Each cue needs text and a positive duration within 12 hours.')
    result.push({text,offset,duration:end-offset})
  }
  if (!result.length) throw new Error('Supply at least one timed cue.')
  return result.sort((a,b)=>a.offset-b.offset)
}
export function normaliseManualTranscript(arabic:string,english=''):{provider:'manual';lang:'ar';content:CanonicalChunk[]} {
  const content=cues(arabic)
  if (content.some(c=>!/[\u0600-\u06ff]/.test(c.text))) throw new Error('Every original cue must contain Arabic text.')
  if (english.trim()) {
    const translated=cues(english)
    const byTiming=new Map<string,CanonicalChunk[]>()
    for(const cue of content){const key=`${cue.offset}:${cue.duration}`;const matches=byTiming.get(key)??[];matches.push(cue);byTiming.set(key,matches)}
    for (const cue of translated) {
      const matches=byTiming.get(`${cue.offset}:${cue.duration}`)??[]
      if (matches.length!==1||matches[0].english) throw new Error('English cue boundaries must match one original Arabic cue uniquely.')
      matches[0].english=cue.text
    }
  }
  return {provider:'manual',lang:'ar',content}
}
export function transcriptResultHref(id:string,seconds:number):string {
  if (!/^[0-9a-f-]{36}$/i.test(id)||!Number.isFinite(seconds)||seconds<0) throw new Error('Invalid transcript location.')
  return `/transcripts/${id}?t=${seconds}`
}
