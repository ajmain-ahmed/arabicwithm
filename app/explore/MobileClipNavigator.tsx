'use client'

import { useEffect, useRef, type ReactNode } from 'react'
import { Box } from '@mui/material'

/** A gesture changes only the active clip; buffered clips never mount players. */
export default function MobileClipNavigator({ clipKey, canPrevious, busy, step, children }: { clipKey: string; canPrevious: boolean; busy: boolean; step: (direction: 1 | -1) => void; children: ReactNode }) {
  const viewport = useRef<HTMLDivElement>(null)
  const lockedUntil = useRef(0)
  const latest = useRef({ canPrevious, busy, step })
  useEffect(() => { latest.current = { canPrevious, busy, step } }, [canPrevious, busy, step])
  useEffect(() => {
    lockedUntil.current = Date.now() + 700
    if(window.matchMedia?.('(max-width:899.95px)').matches && !window.matchMedia?.('(prefers-reduced-motion: reduce)').matches)
      viewport.current?.animate?.([{opacity:.65,transform:'translateY(8px)'},{opacity:1,transform:'translateY(0)'}],{duration:160,easing:'ease-out'})
  }, [clipKey])

  useEffect(() => {
    const node = viewport.current
    if (!node) return
    let touch: { x: number; y: number } | null = null
    let wheelDistance = 0
    let lastWheel = 0
    let wheelConsumed = false
    const mobile = () => window.matchMedia('(max-width:899.95px)').matches
    function innerScroll(target: EventTarget | null) {
      let child = target instanceof Element ? target : null
      while (child && child !== node) {
        if (child.matches('[data-feed-transcript], button, a, input, select, textarea, [role="dialog"], [role="slider"]')) return true
        const overflow = getComputedStyle(child).overflowY
        if (/(auto|scroll)/.test(overflow) && child.scrollHeight > child.clientHeight) return true
        child = child.parentElement
      }
      return false
    }
    function navigate(direction: 1 | -1) {
      if (Date.now() < lockedUntil.current || (direction === 1 && latest.current.busy) || (direction === -1 && !latest.current.canPrevious)) return
      lockedUntil.current = Date.now() + 700
      latest.current.step(direction)
    }
    function wheel(event: WheelEvent) {
      if (!mobile() || event.ctrlKey || innerScroll(event.target) || Math.abs(event.deltaX) > Math.abs(event.deltaY)) return
      event.preventDefault()
      const now = Date.now()
      // Inertial wheel events extend the same gesture, even after navigation.
      if (now - lastWheel > 250) { wheelDistance = 0; wheelConsumed = false }
      lastWheel = now
      if (wheelConsumed) return
      const delta = event.deltaY * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? node!.clientHeight : 1)
      wheelDistance += delta
      if (Math.abs(wheelDistance) >= 60) {
        wheelConsumed = true
        navigate(wheelDistance > 0 ? 1 : -1)
      }
    }
    function touchStart(event: TouchEvent) {
      touch = mobile() && event.touches.length === 1 && !innerScroll(event.target)
        ? { x: event.touches[0].clientX, y: event.touches[0].clientY } : null
    }
    function touchMove(event: TouchEvent) {
      if (!touch) return
      if (event.touches.length !== 1) { touch = null; return }
      const point = event.touches[0]
      if (Math.abs(point.clientY - touch.y) > Math.abs(point.clientX - touch.x)) event.preventDefault()
    }
    function touchEnd(event: TouchEvent) {
      if (!touch) return
      const start = touch
      touch = null
      const point = event.changedTouches[0]
      if (!point) return
      const distance = start.y - point.clientY
      if (Math.abs(distance) >= 60 && Math.abs(distance) > Math.abs(start.x - point.clientX)) navigate(distance > 0 ? 1 : -1)
    }
    function cancel() { touch = null }
    node.addEventListener('wheel', wheel, { passive: false })
    node.addEventListener('touchstart', touchStart, { passive: true })
    node.addEventListener('touchmove', touchMove, { passive: false })
    node.addEventListener('touchend', touchEnd)
    node.addEventListener('touchcancel', cancel)
    return () => {
      node.removeEventListener('wheel', wheel)
      node.removeEventListener('touchstart', touchStart)
      node.removeEventListener('touchmove', touchMove)
      node.removeEventListener('touchend', touchEnd)
      node.removeEventListener('touchcancel', cancel)
    }
  }, [])

  return <Box ref={viewport} data-mobile-clip-feed sx={{ position: 'relative', height: { xs: '100%', md: 'auto' }, display: { xs: 'flex', md: 'block' }, flexDirection: 'column', minHeight: 0, overscrollBehaviorY: 'contain' }}>
    {children}

  </Box>
}
