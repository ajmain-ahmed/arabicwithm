import { create } from 'zustand'

interface PipPayload {
  videoId: string
  episodePath: string
  title: string
  showTitle: string
  currentTime: number
  orientation?: 'landscape' | 'portrait'
}

interface SeekTarget {
  time: number
  nonce: number
}

interface PlayerState {
  pipOpen: boolean
  videoId: string | null
  episodePath: string | null
  title: string
  showTitle: string
  currentTime: number
  orientation: 'landscape' | 'portrait'
  isPlaying: boolean
  seekTarget: SeekTarget | null
  openPip: (payload: PipPayload) => void
  closePip: () => void
  setCurrentTime: (t: number) => void
  setIsPlaying: (p: boolean) => void
  requestSeek: (time: number) => void
}

export const usePlayerStore = create<PlayerState>((set) => ({
  pipOpen: false,
  videoId: null,
  episodePath: null,
  title: '',
  showTitle: '',
  currentTime: 0,
  orientation: 'landscape',
  isPlaying: false,
  seekTarget: null,

  openPip: (payload) =>
    set({
      pipOpen: true,
      videoId: payload.videoId,
      episodePath: payload.episodePath,
      title: payload.title,
      showTitle: payload.showTitle,
      currentTime: payload.currentTime,
      orientation: payload.orientation ?? 'landscape',
      isPlaying: true,
    }),

  closePip: () =>
    set({
      pipOpen: false,
      videoId: null,
      episodePath: null,
      title: '',
      showTitle: '',
      currentTime: 0,
      orientation: 'landscape',
      isPlaying: false,
    }),

  setCurrentTime: (t) => set({ currentTime: t }),
  setIsPlaying: (p) => set({ isPlaying: p }),
  requestSeek: (time) => set({ seekTarget: { time, nonce: Date.now() } }),
}))
