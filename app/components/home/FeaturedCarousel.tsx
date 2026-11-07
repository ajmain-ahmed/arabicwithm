'use client'

import {useEffect, useRef, useState, type PointerEvent} from 'react'
import {Box, IconButton} from '@mui/material'
import {ChevronLeft, ChevronRight} from '@mui/icons-material'
import FeaturedHero, {type FeaturedShow} from './FeaturedHero'

/** One artwork viewport; navigation is entirely user controlled. */
export default function FeaturedCarousel({items}: {items: FeaturedShow[]}) {
 const slides=items.slice(0,3)
 const viewport=useRef<HTMLDivElement>(null)
 const [index,setIndex]=useState(0), [dragging,setDragging]=useState(false)
 const active=useRef(0), suppressClick=useRef(false)
 const gesture=useRef<{id:number;x:number;y:number;left:number;dragged:boolean;dx:number}|null>(null)
 function navigate(next:number){
  const el=viewport.current
  if(!el)return
  next=Math.max(0,Math.min(slides.length-1,next))
  el.scrollTo({left:next*el.clientWidth,behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'})
 }
 useEffect(()=>{
  const el=viewport.current
  if(!el)return
  const resize=new ResizeObserver(()=>el.scrollTo({left:active.current*el.clientWidth,behavior:'instant'}))
  resize.observe(el)
  return()=>resize.disconnect()
 },[])
 function begin(event:PointerEvent<HTMLDivElement>){
  if(event.button!==0||slides.length<2)return
  suppressClick.current=false
  gesture.current={id:event.pointerId,x:event.clientX,y:event.clientY,left:event.currentTarget.scrollLeft,dragged:false,dx:0}
 }
 function move(event:PointerEvent<HTMLDivElement>){
  const start=gesture.current
  if(!start||start.id!==event.pointerId)return
  const dx=event.clientX-start.x,dy=event.clientY-start.y
  if(!start.dragged){
   if(Math.abs(dx)<8||Math.abs(dx)<Math.abs(dy)*1.2)return
   start.dragged=true;suppressClick.current=true
   event.currentTarget.setPointerCapture(event.pointerId);setDragging(true)
  }
  event.preventDefault();start.dx=dx
  event.currentTarget.scrollLeft=start.left-dx
 }
 function end(event:PointerEvent<HTMLDivElement>){
  const start=gesture.current
  if(!start||start.id!==event.pointerId)return
  gesture.current=null;setDragging(false)
  if(event.currentTarget.hasPointerCapture(event.pointerId))event.currentTarget.releasePointerCapture(event.pointerId)
  if(start.dragged){
   const initial=Math.round(start.left/event.currentTarget.clientWidth)
   navigate(initial+(Math.abs(start.dx)>=32?(start.dx<0?1:-1):0))
  }
 }
 const navigation=slides.length>1?<Box data-featured-pagination sx={{display:'flex',alignItems:'center',justifyContent:'center',width:'max-content',p:.25,borderRadius:'999px',bgcolor:'rgba(5,9,8,.6)',border:'1px solid rgba(255,255,255,.2)',backdropFilter:'blur(6px)',pointerEvents:'auto'}}>
   <IconButton aria-label="Previous Featured Show" disabled={index===0} onClick={()=>navigate(index-1)} size="small" sx={{display:{xs:'none',md:'inline-flex'},width:28,height:28,color:'#fff','&.Mui-disabled':{color:'rgba(255,255,255,.35)'}}}><ChevronLeft fontSize="small"/></IconButton>
   {slides.map((item,i)=><IconButton key={item.show.id} aria-label={`Show Featured ${item.show.title}`} aria-current={i===index?'true':undefined} onClick={()=>navigate(i)} sx={{width:{xs:24,md:28},height:{xs:32,md:28}}}><Box component="span" sx={{width:7,height:7,borderRadius:'50%',bgcolor:i===index?'var(--awm-gold-light)':'rgba(255,255,255,.6)'}}/></IconButton>)}
   <IconButton aria-label="Next Featured Show" disabled={index===slides.length-1} onClick={()=>navigate(index+1)} size="small" sx={{display:{xs:'none',md:'inline-flex'},width:28,height:28,color:'#fff','&.Mui-disabled':{color:'rgba(255,255,255,.35)'}}}><ChevronRight fontSize="small"/></IconButton>
   <Box aria-live="polite" sx={{position:'absolute',width:1,height:1,overflow:'hidden',clipPath:'inset(50%)'}}>Featured Show {index+1} of {slides.length}: {slides[index]?.show.title}</Box>
  </Box>:null
 if(!slides.length)return null
 return <Box role="region" aria-roledescription="carousel" aria-label="Featured Shows" data-featured-carousel sx={{position:'relative'}}>
  <Box ref={viewport} tabIndex={slides.length>1?0:undefined} aria-label="Swipe Featured Shows"
   onPointerDown={begin} onPointerMove={move} onPointerUp={end} onPointerCancel={end}
   onDragStart={event=>event.preventDefault()}
   onClickCapture={event=>{if(suppressClick.current&&event.detail>0){event.preventDefault();event.stopPropagation();suppressClick.current=false}}}
   onKeyDown={event=>{if(event.key==='ArrowRight'||event.key==='ArrowLeft'){event.preventDefault();navigate(index+(event.key==='ArrowRight'?1:-1))}}}
   onScroll={event=>{const next=Math.max(0,Math.min(slides.length-1,Math.round(event.currentTarget.scrollLeft/event.currentTarget.clientWidth)));active.current=next;setIndex(next)}}
   sx={{display:'flex',overflowX:'auto',overscrollBehaviorX:'contain',scrollSnapType:dragging?'none':'x mandatory',scrollbarWidth:'none','&::-webkit-scrollbar':{display:'none'},touchAction:'pan-y',userSelect:'none',cursor:slides.length>1?(dragging?'grabbing':'grab'):'auto','&:focus-visible':{outline:'2px solid var(--awm-gold)',outlineOffset:-2}}}>
   {slides.map((item,i)=><Box key={item.show.id} role="group" aria-roledescription="slide" aria-label={`${i+1} of ${slides.length}: ${item.show.title}`} aria-hidden={i!==index} inert={i!==index} data-featured-slide={item.show.slug} sx={{flex:'0 0 100%',minWidth:0,scrollSnapAlign:'start',scrollSnapStop:'always'}}><FeaturedHero {...item} priority={i===0} pagination={slides.length>1} navigation={navigation}/></Box>)}
  </Box>

 </Box>
}
