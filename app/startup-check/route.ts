import { startupCookieMetadata } from '@/app/lib/startupCookieMetadata'
import { startupDiagnosticScript } from '@/app/lib/startupDiagnosticScript'

/** Independent response: no layout, React, Supabase client or identity verification. */
export function GET(request?: Request) {
  const metadata = startupCookieMetadata(request?.headers.get('cookie') ?? null)
  const initial = 'ArabicWithM diagnostic v2\nDocument loaded: YES\nInline script executed: NO (not recorded yet)\nCookie metadata (NOT verified identity): ' + JSON.stringify(metadata)
  const headers = { 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff' }
  if (request && new URL(request.url).searchParams.get('plain') === '1') {
    return new Response(initial + '\nPlain-text response: no JavaScript, styles, fonts or application shell.\n', {
      headers: { ...headers, 'Content-Type': 'text/plain; charset=utf-8' },
    })
  }
  const escaped = initial.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  return new Response(`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>ArabicWithM startup check</title><style>body{background:#0e2e1f;color:#fff;font:16px system-ui;margin:24px;line-height:1.5}pre{white-space:pre-wrap;overflow-wrap:anywhere}a,button{display:inline-block;background:#f5ede0;color:#2c1a0e;padding:12px;margin:8px 8px 8px 0;border:0;border-radius:8px;font:inherit}</style></head><body><h1>ArabicWithM startup check</h1><p>Diagnostic v2. This page works independently of the Homepage. Recording stays in this tab. Website data is preserved.</p><pre id="output">${escaped}</pre><noscript>JavaScript is disabled.</noscript><p><button id="copy">Copy diagnostic report</button><a id="home" href="/">Try Homepage</a><a href="/startup-check?plain=1">Plain text check</a></p><script>${startupDiagnosticScript}</script></body></html>`, {
    headers: { ...headers, 'Content-Type': 'text/html; charset=utf-8' },
  })
}
