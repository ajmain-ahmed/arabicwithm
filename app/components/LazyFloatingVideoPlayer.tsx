'use client'

import dynamic from "next/dynamic"
import { usePlayerStore } from "@/store/playerStore"

const FloatingVideoPlayer = dynamic(() => import("./FloatingVideoPlayer"), {
  ssr: false,
})

/* The PiP chunk (framer-motion drag, YouTube bridge) is ~200KB — mount it only
   when a video is actually open, not on every page load. */
export default function LazyFloatingVideoPlayer() {
  const active = usePlayerStore((state) => state.pipOpen || Boolean(state.videoId))
  if (!active) return null
  return <FloatingVideoPlayer />
}
