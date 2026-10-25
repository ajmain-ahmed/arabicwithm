'use client'
import { useRef, type RefObject } from 'react'
import { IconButton, Tooltip } from '@mui/material'
import { Height } from '@mui/icons-material'

export default function DesktopPlayerResize({playerRef,onResize}:{playerRef:RefObject<HTMLDivElement|null>;onResize:(width:number)=>void}) {
  const drag=useRef<{pointer:number;y:number;height:number;min:number;max:number}|null>(null)
  function bounds(){
    const player=playerRef.current
    if(!player)return null
    const navbar=parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--awm-navbar-height'))||64
    const max=Math.min((player.parentElement?.clientWidth??player.clientWidth)*9/16,Math.max(270,window.innerHeight-navbar-240))
    return {height:player.getBoundingClientRect().height,min:Math.min(270,max),max}
  }
  function resize(height:number,min:number,max:number){onResize(Math.min(max,Math.max(min,height))*16/9)}
  return <Tooltip title="Resize player"><IconButton aria-label="Resize video player" aria-description="Drag vertically, or use Arrow Up to shrink and Arrow Down to enlarge." sx={{cursor:'ns-resize',touchAction:'none',userSelect:'none'}}
    onPointerDown={event=>{
      if(event.button!==0)return
      const size=bounds();if(!size)return
      event.preventDefault();event.currentTarget.focus();event.currentTarget.setPointerCapture(event.pointerId)
      drag.current={pointer:event.pointerId,y:event.clientY,...size}
    }}
    onPointerMove={event=>{const start=drag.current;if(start?.pointer===event.pointerId)resize(start.height+event.clientY-start.y,start.min,start.max)}}
    onPointerUp={event=>{drag.current=null;if(event.currentTarget.hasPointerCapture(event.pointerId))event.currentTarget.releasePointerCapture(event.pointerId)}}
    onPointerCancel={()=>{drag.current=null}}
    onLostPointerCapture={()=>{drag.current=null}}
    onKeyDown={event=>{
      if(event.key!=='ArrowUp'&&event.key!=='ArrowDown')return
      event.preventDefault();const size=bounds();if(size)resize(size.height+(event.key==='ArrowDown'?24:-24),size.min,size.max)
    }}><Height/></IconButton></Tooltip>
}
