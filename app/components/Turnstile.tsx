'use client'

/* Cloudflare Turnstile widget for bot protection on auth flows.
   Renders nothing when NEXT_PUBLIC_TURNSTILE_SITE_KEY is unset, so local
   dev and e2e fixtures keep working without a key. The site key is public
   by design (it ships to the browser); enforcement happens in Supabase
   Auth using the matching secret key. */

import { useEffect, useImperativeHandle, useRef, type Ref } from 'react'

export interface TurnstileHandle {
  /* Request a fresh token after the previous one was spent or expired.
     Tokens are single-use and valid for five minutes. */
  reset: () => void
}

interface TurnstileWidget {
  render: (container: HTMLElement, options: TurnstileRenderOptions) => string
  reset: (widgetId: string) => void
  remove: (widgetId: string) => void
}

interface TurnstileRenderOptions {
  sitekey: string
  callback: (token: string) => void
  'expired-callback': () => void
  'error-callback': () => void
  theme: 'light' | 'dark' | 'auto'
}

declare global {
  interface Window {
    turnstile?: TurnstileWidget
  }
}

interface TurnstileProps {
  ref?: Ref<TurnstileHandle>
  onToken: (token: string) => void
  onExpire?: () => void
  onError?: () => void
}

const SCRIPT_SRC = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'
let scriptPromise: Promise<void> | null = null

function loadTurnstile(): Promise<void> {
  if (window.turnstile) return Promise.resolve()
  if (!scriptPromise) {
    scriptPromise = new Promise<void>((resolve, reject) => {
      const script = document.createElement('script')
      script.src = SCRIPT_SRC
      script.async = true
      script.onload = () => resolve()
      script.onerror = () => {
        scriptPromise = null
        reject(new Error('Turnstile failed to load'))
      }
      document.head.appendChild(script)
    })
  }
  return scriptPromise
}

export function Turnstile({ ref, onToken, onExpire, onError }: TurnstileProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const widgetIdRef = useRef<string | null>(null)
  /* Latest callbacks without re-rendering the widget: Turnstile keeps the
     closures given at render time, so route them through a ref. */
  const callbacksRef = useRef({ onToken, onExpire, onError })
  useEffect(() => {
    callbacksRef.current = { onToken, onExpire, onError }
  })

  useImperativeHandle(ref, () => ({
    reset: () => {
      if (widgetIdRef.current && window.turnstile) window.turnstile.reset(widgetIdRef.current)
    },
  }), [])

  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY

  useEffect(() => {
    if (!siteKey || !containerRef.current) return
    let cancelled = false
    loadTurnstile()
      .then(() => {
        if (cancelled || widgetIdRef.current || !containerRef.current || !window.turnstile) return
        widgetIdRef.current = window.turnstile.render(containerRef.current, {
          sitekey: siteKey,
          callback: (token) => callbacksRef.current.onToken(token),
          'expired-callback': () => callbacksRef.current.onExpire?.(),
          'error-callback': () => callbacksRef.current.onError?.(),
          theme: 'light',
        })
      })
      .catch(() => callbacksRef.current.onError?.())
    return () => {
      cancelled = true
      if (widgetIdRef.current && window.turnstile) {
        window.turnstile.remove(widgetIdRef.current)
        widgetIdRef.current = null
      }
    }
  }, [siteKey])

  if (!siteKey) return null
  return <div ref={containerRef} />
}

export default Turnstile
