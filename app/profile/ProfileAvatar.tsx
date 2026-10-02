'use client'
import { useEffect, useRef, useState } from 'react'
import { Avatar, Box, Button, Typography } from '@mui/material'
import { AddAPhotoOutlined } from '@mui/icons-material'
import { supabase } from '@/app/lib/supabase/client'
import ThumbnailCropper from '@/app/(admin)/admin/components/EpisodeThumbnailCropper'
import { DEFAULT_THUMBNAIL_CROP, normalizeThumbnailCrop, thumbnailCropCss, type ThumbnailCrop } from '@/app/lib/thumbnailCrop'

async function avatarBlob(file: File): Promise<Blob> {
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 5 * 1024 * 1024) throw new Error('Choose a JPEG, PNG or WebP image under 5 MB.')
  const url = URL.createObjectURL(file)
  try {
    const image = new Image()
    await new Promise<void>((resolve, reject) => { image.onload = () => resolve(); image.onerror = () => reject(new Error('Unable to read this image.')); image.src = url })
    const canvas = document.createElement('canvas'), scale = Math.min(1, 1024 / Math.max(image.width, image.height))
    canvas.width = Math.max(1, Math.round(image.width * scale)); canvas.height = Math.max(1, Math.round(image.height * scale))
    const context = canvas.getContext('2d')
    if (!context) throw new Error('Image uploads are unavailable in this browser.')
    context.drawImage(image, 0, 0, canvas.width, canvas.height)
    return await new Promise<Blob>((resolve, reject) => canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('Unable to prepare the image.')), 'image/webp', 0.9))
  } finally { URL.revokeObjectURL(url) }
}
export default function ProfileAvatar({ id, name, src, editable, crop: initialCrop }: { id: string; name: string; src: string | null; editable: boolean; crop?: ThumbnailCrop }) {
  const [image, setImage] = useState(src), [busy, setBusy] = useState(false), [error, setError] = useState('')
  const [crop, setCrop] = useState(() => normalizeThumbnailCrop(initialCrop))
  const [pending, setPending] = useState<{ src: string; file?: File; crop: ThumbnailCrop } | null>(null)
  const input = useRef<HTMLInputElement>(null)
  useEffect(() => () => { if (pending?.file) URL.revokeObjectURL(pending.src) }, [pending])
  const select = (file?: File) => {
    if (!file) return
    setError('')
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 5 * 1024 * 1024) {
      setError('Choose a JPEG, PNG or WebP image under 5 MB.'); return
    }
    setPending({ src: URL.createObjectURL(file), file, crop: { ...DEFAULT_THUMBNAIL_CROP } })
    if (input.current) input.current.value = ''
  }
  const upload = async (nextCrop: ThumbnailCrop) => {
    if (!pending || busy) return
    setBusy(true); setError('')
    try {
      const { data, error: authError } = await supabase.auth.getUser()
      if (authError || data.user?.id !== id) throw new Error('Sign in again to update your picture.')
      let avatar = pending.src
      if (pending.file) {
        const blob = await avatarBlob(pending.file), path = `${id}/avatar-${crypto.randomUUID()}.webp`
        const { error: uploadError } = await supabase.storage.from('profile-media').upload(path, blob, { contentType: 'image/webp', upsert: false })
        if (uploadError) throw new Error('Unable to upload your picture. Please try again.')
        avatar = supabase.storage.from('profile-media').getPublicUrl(path).data.publicUrl
      }
      const position = normalizeThumbnailCrop(nextCrop)
      const { error: saveError } = await supabase.auth.updateUser({ data: { avatar_url: avatar, avatar_crop: position } })
      if (saveError) throw new Error('Unable to save your picture. Please try again.')
      setImage(avatar); setCrop(position); setPending(null)
    } catch (e) { setError(e instanceof Error ? e.message : 'Unable to upload your picture.') }
    finally { setBusy(false); if (input.current) input.current.value = '' }
  }
  return <Box sx={{ textAlign: 'center', width: { xs: '100%', sm: 130 }, flexShrink: 0 }}>
    <Avatar src={image ?? undefined} alt={name} sx={{ width: 104, height: 104, mx: 'auto', bgcolor: 'var(--awm-forest)', color: 'var(--awm-cream)', fontFamily: 'var(--font-heading)', fontSize: 44, border: '3px solid color-mix(in srgb, var(--awm-gold) 45%, transparent)', '& .MuiAvatar-img': thumbnailCropCss(crop) }}>{name.charAt(0).toUpperCase() || 'A'}</Avatar>
    {editable && <><input ref={input} type="file" accept="image/jpeg,image/png,image/webp" aria-label="Choose a profile picture" hidden onChange={e => select(e.target.files?.[0])} /><Button size="small" startIcon={<AddAPhotoOutlined />} disabled={busy} onClick={() => input.current?.click()} sx={{ mt: 1 }}>{busy ? 'Saving…' : 'Change photo'}</Button>{image && <Button size="small" disabled={busy} onClick={() => { setError(''); setPending({ src: image, crop }) }}>Adjust photo</Button>}</>}
    {pending && <ThumbnailCropper key={pending.src} open imageSrc={pending.src} value={pending.crop} aspectRatio="1 / 1" circular title="Adjust profile photo" description={error || 'Drag or use arrow keys to reposition. Zoom to frame your face; this circle matches your saved avatar.'} confirmLabel={busy ? 'Saving…' : 'Save photo'} saving={busy} onClose={() => { if (!busy) setPending(null) }} onConfirm={position => void upload(position)} />}
    {error && <Typography role="alert" sx={{ mt: 1, color: 'error.main', fontSize: 12 }}>{error}</Typography>}
  </Box>
}
