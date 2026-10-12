/** Metadata failure is non-fatal; release network and object URLs on every exit. */
export function readAudioDuration(source: File | string): Promise<number | null> {
  return new Promise(resolve => {
    const audio = new Audio()
    const local = typeof source !== 'string'
    const url = local ? URL.createObjectURL(source) : source
    const finish = (duration: number | null) => {
      clearTimeout(timer)
      audio.onloadedmetadata = null; audio.onerror = null
      audio.removeAttribute('src'); audio.load()
      if (local) URL.revokeObjectURL(url)
      resolve(duration)
    }
    const timer = setTimeout(() => finish(null), 10000)
    audio.preload = 'metadata'
    audio.onloadedmetadata = () => finish(Number.isFinite(audio.duration) && audio.duration > 0 ? Math.max(1, Math.round(audio.duration)) : null)
    audio.onerror = () => finish(null)
    audio.src = url
  })
}
