'use client'
import { useState } from 'react'
import { useAuth } from '@/app/AuthContext'
import AuthDialog from '@/app/components/AuthDialog'

export default function SignInRequired({ title = 'Sign in to view your profile' }: { title?: string }) {
  const { user, loading } = useAuth()
  const [open, setOpen] = useState(true)
  return <AuthDialog open={open && !loading && !user} onClose={() => setOpen(false)} purpose={title} />
}
