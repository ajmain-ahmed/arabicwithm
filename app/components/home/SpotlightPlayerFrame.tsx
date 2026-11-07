'use client'

import {useEffect, useRef, useState, type KeyboardEvent, type PointerEvent, type ReactNode} from 'react'
import {Box} from '@mui/material'
import {DragIndicator} from '@mui/icons-material'

const SIZE_KEY = 'awm-spotlight-player-size-v1'
const MIN_SIZE = 38
const MAX_SIZE = 75
const DEFAULT_SIZE = 50
const bound = (value: number) => Math.max(MIN_SIZE, Math.min(MAX_SIZE, value))

/** Presentation preference only: the live iframe stays mounted throughout resizing. */
export default function SpotlightPlayerFrame({videoId, children, subtitle}: {
  videoId: string
  children: ReactNode
  subtitle: ReactNode
}) {
  const [size, setSize] = useState(DEFAULT_SIZE)
  const [dragging, setDragging] = useState(false)
  const layout = useRef<HTMLDivElement>(null)
  const currentSize = useRef(DEFAULT_SIZE)
  const gesture = useRef<{id: number; y: number; size: number; width: number; desktop: boolean} | null>(null)

  useEffect(() => {
    try {
      const saved = localStorage.getItem(SIZE_KEY)
      if (saved === null || saved.trim() === '') return
      const value = Number(saved)
      if (Number.isFinite(value)) {
        currentSize.current = bound(value)
        setSize(currentSize.current)
      }
    } catch { /* A blocked preference store leaves the usable default. */ }
  }, [])

  function resize(value: number) {
    currentSize.current = bound(value)
    setSize(currentSize.current)
  }
  function persist() {
    try { localStorage.setItem(SIZE_KEY, String(currentSize.current)) } catch {}
  }
  function begin(event: PointerEvent<HTMLDivElement>) {
    if (event.button !== 0 || !layout.current) return
    // Keep native pointer focus: cancelling it can leave Firefox focused in
    // the iframe. CSS user-select/touch-action already prevents drag selection.
    event.currentTarget.focus()
    event.currentTarget.setPointerCapture(event.pointerId)
    gesture.current = {
      id: event.pointerId, y: event.clientY, size: currentSize.current,
      width: layout.current.getBoundingClientRect().width,
      desktop: window.matchMedia('(min-width:900px)').matches,
    }
    setDragging(true)
  }
  function move(event: PointerEvent<HTMLDivElement>) {
    const start = gesture.current
    if (!start || start.id !== event.pointerId || start.width <= 0) return
    // Upward movement grows the height and proportional width. Tablet widths
    // map the same preference onto a wider, usable 65-85% range.
    const widthPercent = (start.y - event.clientY) * (16 / 9) / start.width * 100
    resize(start.size + widthPercent * (start.desktop ? 1 : (MAX_SIZE - MIN_SIZE) / 20))
  }
  function end(event: PointerEvent<HTMLDivElement>) {
    if (gesture.current?.id !== event.pointerId) return
    gesture.current = null
    setDragging(false)
    persist()
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId)
  }
  function keyboard(event: KeyboardEvent<HTMLDivElement>) {
    const step = event.shiftKey ? 5 : 1
    const value = event.key === 'Home' ? MIN_SIZE : event.key === 'End' ? MAX_SIZE
      : event.key === 'ArrowUp' || event.key === 'ArrowRight' ? currentSize.current + step
      : event.key === 'ArrowDown' || event.key === 'ArrowLeft' ? currentSize.current - step : null
    if (value === null) return
    event.preventDefault()
    resize(value)
    persist()
  }
  const tabletSize = 65 + (size - MIN_SIZE) / (MAX_SIZE - MIN_SIZE) * 20

  return <Box ref={layout} data-spotlight-player-layout>
    <Box sx={{position:'relative', width:{xs:'100%', sm:`${tabletSize}%`, md:`${size}%`}, mx:'auto'}}>
      <Box data-spotlight-video={videoId} sx={{width:'100%', aspectRatio:'16 / 9', position:'relative', bgcolor:'#000', borderRadius:'10px', overflow:'hidden', '& iframe':{width:'100%',height:'100%'}}}>
        {children}
      </Box>
      <Box component="div" role="slider" tabIndex={0} aria-label="Resize For You player" aria-orientation="vertical"
        aria-valuemin={MIN_SIZE} aria-valuemax={MAX_SIZE} aria-valuenow={Math.round(size)}
        aria-valuetext={`${Math.round((size - MIN_SIZE) / (MAX_SIZE - MIN_SIZE) * 100)}% of adjustable size range`}
        title="Drag up to enlarge, down to shrink. Arrow keys also resize."
        onPointerDown={begin} onPointerMove={move} onPointerUp={end} onPointerCancel={end} onLostPointerCapture={end} onKeyDown={keyboard}
        data-spotlight-resize data-dragging={dragging ? 'true' : 'false'}
        sx={{display:{xs:'none',sm:'flex'}, position:'absolute', left:'calc(100% + 4px)', top:'50%', transform:'translateY(-50%)', alignItems:'center', justifyContent:'center', width:28, height:64, borderRadius:'999px', cursor:'ns-resize', touchAction:'none', userSelect:'none', color:'var(--awm-muted)', bgcolor:dragging?'color-mix(in srgb, var(--awm-gold) 20%, transparent)':'transparent', '&:hover':{color:'var(--awm-gold)',bgcolor:'color-mix(in srgb, var(--awm-gold) 12%, transparent)'}, '&:focus-visible':{outline:'2px solid var(--awm-gold)',outlineOffset:2}, '& svg':{pointerEvents:'none'}}}>
        <DragIndicator fontSize="small"/>
      </Box>
    </Box>
    <Box data-spotlight-subtitle aria-label="Current subtitle" sx={{width:{xs:'100%',sm:`${Math.min(96,tabletSize+12)}%`,md:`${Math.min(88,size+24)}%`}, boxSizing:'border-box', mx:'auto', mt:2, minHeight:80, px:2, py:1.25, borderRadius:'10px', bgcolor:'var(--awm-cream-light)', border:'1px solid color-mix(in srgb, var(--awm-gold) 20%, transparent)', overflowWrap:'anywhere', textAlign:'center'}}>
      {subtitle}
    </Box>
  </Box>
}
