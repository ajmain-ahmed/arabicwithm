'use client'

import { useEffect, useState } from 'react'
import { Box } from '@mui/material'
import { DiamondOutlined } from '@mui/icons-material'
import { supabase } from '@/app/lib/supabase/client'

export default function PremiumMemberMark({ userId }: { userId: string }) {
  const [membership, setMembership] = useState<{ userId: string; premium: boolean } | null>(null)
  useEffect(() => {
    let active = true
    const refresh = async () => {
      try {
        const { data, error } = await supabase.rpc('account_has_premium', { p_user_id: userId })
        if (active && !error) setMembership({ userId, premium: data === true })
      } catch {}
    }
    refresh()
    window.addEventListener('account-access-changed', refresh)
    window.addEventListener('focus', refresh)
    return () => { active = false; window.removeEventListener('account-access-changed', refresh); window.removeEventListener('focus', refresh) }
  }, [userId])
  if (membership?.userId !== userId || !membership.premium) return null
  return <Box component="span" role="img" aria-label="AWM Plus member" title="AWM Plus member" sx={{ position: 'absolute', right: 0, bottom: 0, display: 'flex', bgcolor: 'var(--awm-white)', color: 'var(--awm-gold)', borderRadius: '50%', p: .25 }}><DiamondOutlined sx={{ fontSize: 16 }} /></Box>
}
