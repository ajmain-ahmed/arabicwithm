'use client'

import dynamic from "next/dynamic"

const FloatingVideoPlayer = dynamic(() => import("./FloatingVideoPlayer"), {
  ssr: false,
})

export default function LazyFloatingVideoPlayer() {
  return <FloatingVideoPlayer />
}
