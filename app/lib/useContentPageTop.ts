'use client'
import { useCallback, useLayoutEffect, useRef, useState } from 'react'

export function scrollContentTop(anchor:HTMLElement){
 let parent=anchor.parentElement
 while(parent&&parent!==document.body&&parent!==document.documentElement){
  if(/auto|scroll/.test(getComputedStyle(parent).overflowY)&&parent.scrollHeight>parent.clientHeight){
   parent.scrollTo({top:Math.max(0,parent.scrollTop+anchor.getBoundingClientRect().top-parent.getBoundingClientRect().top-12),behavior:'instant'});return
  }
  parent=parent.parentElement
 }
 const navbar=document.getElementById('main-navbar')
 const offset=navbar&&/fixed|sticky/.test(getComputedStyle(navbar).position)?Math.max(0,navbar.getBoundingClientRect().bottom):0
 window.scrollTo({top:Math.max(0,window.scrollY+anchor.getBoundingClientRect().top-offset-12),behavior:'instant'})
}
/** Scroll once after the latest requested content has actually committed. */
export function useContentPageTop(key:string,ready:boolean){
 const ref=useRef<HTMLDivElement>(null),handled=useRef(0),[navigation,setNavigation]=useState(0)
 const requestScroll=useCallback(()=>setNavigation(value=>value+1),[])
 useLayoutEffect(()=>{
  if(ready&&ref.current&&navigation>handled.current){scrollContentTop(ref.current);handled.current=navigation}
 },[key,ready,navigation])
 return {ref,requestScroll}
}
