import { redirect } from 'next/navigation'
import ResetPasswordForm from './ResetPasswordForm'

type ResetPasswordPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value
}

export default async function ResetPasswordPage({ searchParams }: ResetPasswordPageProps) {
  const params = await searchParams
  const code = first(params.code)

  // Older emails may still point straight here. Complete the PKCE exchange
  // in the server callback before rendering the password form.
  if (code) {
    const callbackParams = new URLSearchParams({ code, next: '/reset-password' })
    redirect(`/auth/callback?${callbackParams.toString()}`)
  }

  const authError = first(params.error)
  const initialError = authError
    ? 'This password reset link is invalid or has expired. Please request a new link.'
    : undefined

  return <ResetPasswordForm initialError={initialError} />
}
