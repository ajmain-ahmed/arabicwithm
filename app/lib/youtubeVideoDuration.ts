import 'server-only'
import { MAX_TRANSCRIPT_TIME_MS } from '@/app/lib/transcriptTiming'

const MAX_SECONDS = MAX_TRANSCRIPT_TIME_MS / 1000
const cache = new Map<string, {expires:number; value:Promise<number|null>}>()
const object = (value:unknown): value is Record<string,unknown> => Boolean(value && typeof value === 'object' && !Array.isArray(value))
const valid = (seconds:number) => Number.isFinite(seconds) && seconds > 0 && seconds <= MAX_SECONDS

/** YouTube Data API contentDetails.duration is an ISO 8601 duration. */
export function youtubeIsoDuration(value:unknown):number|null {
  if (typeof value !== 'string') return null
  const match = value.match(/^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+(?:\.\d+)?)S)?$/)
  if (!match || !match.slice(1).some(Boolean)) return null
  const seconds = Number(match[1] ?? 0)*3600 + Number(match[2] ?? 0)*60 + Number(match[3] ?? 0)
  return valid(seconds) ? seconds : null
}

/** Read only bounded metadata; never fetch video/audio or start transcription. */
async function metadata(url:string,limit:number):Promise<string> {
  const response = await fetch(url,{cache:'no-store',redirect:'error',signal:AbortSignal.timeout(8000),headers:{'Accept-Language':'en-GB,en;q=0.9'}})
  if (!response.ok || !response.body) throw new Error('YouTube metadata unavailable')
  const reader = response.body.getReader(), decoder = new TextDecoder()
  let bytes = 0, text = ''
  try {
    for (;;) {
      const part = await reader.read()
      if (part.done) break
      bytes += part.value.byteLength
      if (bytes > limit) throw new Error('YouTube metadata exceeds budget')
      text += decoder.decode(part.value,{stream:true})
    }
    return text + decoder.decode()
  } finally { await reader.cancel().catch(()=>{});reader.releaseLock() }
}

/** Extract the actual player metadata JSON, respecting braces in string values. */
export function youtubeWatchDuration(html:string,id:string):number|null {
  const marker = /(?:var\s+ytInitialPlayerResponse\s*=|window\["ytInitialPlayerResponse"\]\s*=)\s*\{/g
  const match = marker.exec(html)
  if (!match) return null
  const start = marker.lastIndex - 1
  let depth = 0, quoted = false, escaped = false
  for (let index = start; index < html.length; index++) {
    const char = html[index]
    if (quoted) {
      if (escaped) escaped = false
      else if (char === '\\') escaped = true
      else if (char === '"') quoted = false
    } else if (char === '"') quoted = true
    else if (char === '{') depth++
    else if (char === '}' && --depth === 0) {
      try {
        const player:unknown = JSON.parse(html.slice(start,index+1))
        if (!object(player) || !object(player.videoDetails) || !object(player.playabilityStatus)) return null
        if (player.playabilityStatus.status !== 'OK' || player.videoDetails.videoId !== id || player.videoDetails.isLiveContent === true) return null
        const length = player.videoDetails.lengthSeconds
        const seconds = typeof length === 'string' && /^\d+$/.test(length) ? Number(length) : typeof length === 'number' ? length : NaN
        return valid(seconds) ? seconds : null
      } catch { return null }
    }
  }
  return null
}

async function retrieve(id:string):Promise<number|null> {
  const key = process.env.YOUTUBE_DATA_API_KEY
  if (key) {
    try {
      const params = new URLSearchParams({part:'contentDetails',id,fields:'items(id,contentDetails/duration)',key})
      const result:unknown = JSON.parse(await metadata(`https://www.googleapis.com/youtube/v3/videos?${params}`,65536))
      if (object(result) && Array.isArray(result.items)) {
        const item = result.items.find(item => object(item) && item.id === id)
        if (object(item) && object(item.contentDetails)) {
          const duration = youtubeIsoDuration(item.contentDetails.duration)
          if (duration !== null) return duration
        }
      }
    } catch { /* Try the supplied video's public YouTube player metadata. */ }
  }
  try { return youtubeWatchDuration(await metadata(`https://www.youtube.com/watch?v=${id}&hl=en`,4*1024*1024),id) }
  catch { return null }
}

export async function getYouTubeVideoDuration(id:string):Promise<number|null> {
  if (!/^[A-Za-z0-9_-]{11}$/.test(id)) throw new Error('Invalid YouTube video ID.')
  const existing = cache.get(id)
  if (existing && existing.expires > Date.now()) return existing.value
  if (cache.size >= 256) cache.delete(cache.keys().next().value!)
  const entry = {expires:Date.now()+30000,value:retrieve(id)}
  cache.set(id,entry)
  const seconds = await entry.value
  entry.expires = Date.now() + (seconds === null ? 30000 : 10*60*1000)
  return seconds
}
