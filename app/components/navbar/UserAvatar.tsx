'use client'

import { Avatar } from '@mui/material'
import { existingProfileImage } from '@/app/lib/profilePresets'
import { normalizeThumbnailCrop, thumbnailCropCss } from '@/app/lib/thumbnailCrop'

export default function UserAvatar({ name, metadata }: { name: string; metadata?: Record<string, unknown> }) {
  return <Avatar src={existingProfileImage(metadata?.avatar_url) ?? undefined} alt={name} sx={{
    width: 32, height: 32,
    background: 'linear-gradient(135deg, var(--awm-gold), var(--awm-gold-light))', color: '#fff',
    fontFamily: 'var(--font-sans)', fontWeight: 700, fontSize: '0.85rem',
    '& .MuiAvatar-img': { objectFit: 'cover', ...thumbnailCropCss(normalizeThumbnailCrop(metadata?.avatar_crop)) },
  }}>{name.charAt(0).toUpperCase() || 'M'}</Avatar>
}
