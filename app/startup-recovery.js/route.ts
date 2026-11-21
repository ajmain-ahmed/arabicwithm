import { startupRecoveryScript } from '@/app/lib/startupRecoveryScript'

// Old retained HTML still requests this URL. Serve the same current recovery code.
export function GET() {
  return new Response(startupRecoveryScript, { headers: {
    'Content-Type': 'text/javascript; charset=utf-8',
    'Cache-Control': 'no-store',
  } })
}
