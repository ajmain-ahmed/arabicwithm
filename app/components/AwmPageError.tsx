'use client'
/* eslint-disable @next/next/no-html-link-for-pages -- Recovery must work without a healthy App Router. */
import {useEffect,useSyncExternalStore} from 'react'
import styles from './AwmPageError.module.css'
const subscribe=(listener:()=>void)=>{window.addEventListener('online',listener);window.addEventListener('offline',listener);return()=>{window.removeEventListener('online',listener);window.removeEventListener('offline',listener)}}
export default function AwmPageError({error,message,onReload}:{error?:unknown;message?:string;onReload?:()=>void}){
 const offline=useSyncExternalStore(subscribe,()=>navigator.onLine===false,()=>false)
 useEffect(()=>{if(error)console.error('[AWM page load]',error)},[error])
 return <section role="alert" aria-labelledby="awm-page-error-title" className={styles.wrap} data-awm-page-error>
  <div className={styles.card}>
   {/* The original supplied illustration is served locally without alteration. */}
   {/* eslint-disable-next-line @next/next/no-img-element */}
   <img className={styles.art} src="/images/awm-error-goku.png" width="1074" height="1600" alt=""/>
   <div className={styles.copy}><p className={styles.brand}>ArabicWithM</p><h1 id="awm-page-error-title">This page took a little detour</h1>
    <p>{offline?'You seem to be offline. Check your connection, then reload the page.':message??"We couldn\u2019t load this page properly. Give it another go and we\u2019ll try again."}</p>
    <div className={styles.actions}><button type="button" onClick={onReload??(()=>window.location.reload())}><span aria-hidden="true">↻</span> Reload</button><a href="/">Go Home</a></div>
   </div>
  </div>
 </section>
}
