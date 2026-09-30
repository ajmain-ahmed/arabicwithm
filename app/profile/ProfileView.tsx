'use client'

import Link from 'next/link'
import { useState } from 'react'
import {
  EmojiEventsOutlined,
  LockOutlined,
  MenuBookOutlined,
  PsychologyOutlined,
  StarOutlined,
} from '@mui/icons-material'
import {
  Alert,
  Box,
  Button,
  Container,
  FormControlLabel,
  Paper,
  Switch,
  TextField,
  Typography,
} from '@mui/material'
import { updateProfile, type PublicProfile } from '@/app/actions/profiles'
import { PremiumSection } from '@/app/components/PremiumPrompt'

export default function ProfileView({ profile }: { profile: PublicProfile }) {
  const [name, setName] = useState(profile.displayName)
  const [isPublic, setPublic] = useState(profile.isPublic)
  const [shareReading, setShareReading] = useState(profile.shareReading)
  const [message, setMessage] = useState('')
  const [saving, setSaving] = useState(false)
  const achievements = [
    {
      title: 'First recall',
      target: 'Complete 1 Memory card',
      unlocked: profile.memoryCards >= 1,
      icon: PsychologyOutlined,
    },
    {
      title: 'Memory explorer',
      target: 'Complete 100 Memory cards',
      unlocked: profile.memoryCards >= 100,
      icon: EmojiEventsOutlined,
    },
    {
      title: 'Level five',
      target: 'Reach learning level 5',
      unlocked: profile.level >= 5,
      icon: StarOutlined,
    },
    {
      title: 'Reader',
      target: 'Start your first book',
      unlocked: profile.shelf.length > 0,
      icon: MenuBookOutlined,
    },
  ]

  async function save() {
    setSaving(true)
    setMessage('')
    try {
      await updateProfile({ displayName: name, isPublic, shareReading })
      setMessage('Profile saved.')
    } catch {
      setMessage('Unable to save profile. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Container component="main" maxWidth="lg" sx={{ py: { xs: 4, md: 7 } }}>
      <Typography component="h1" sx={{ fontFamily: 'var(--font-heading)', fontSize: { xs: 36, md: 52 }, fontWeight: 600, color: 'var(--awm-bark)' }}>
        {profile.displayName}
      </Typography>
      <Typography sx={{ mt: 0.75, fontFamily: 'Jost, sans-serif', color: 'var(--awm-muted)' }}>
        Learning since {profile.joined}
      </Typography>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2, minmax(0, 1fr))', md: 'repeat(4, minmax(0, 1fr))' }, gap: 1.5, my: 3.5 }}>
        {[
          ['Current level', profile.level],
          ['Memory XP', profile.xp],
          ['XP this week', profile.weekXp],
          ['Cards completed', profile.memoryCards],
        ].map(([label, value]) => (
          <Paper key={label} elevation={0} sx={{ p: 2, border: '1px solid color-mix(in srgb, var(--awm-bark) 12%, transparent)', borderRadius: '12px' }}>
            <Typography sx={{ fontFamily: 'Jost, sans-serif', color: 'var(--awm-muted)', fontSize: 12 }}>{label}</Typography>
            <Typography sx={{ mt: 0.5, fontFamily: 'var(--font-heading)', color: 'var(--awm-bark)', fontSize: { xs: 28, md: 34 }, fontWeight: 600 }}>{value}</Typography>
          </Paper>
        ))}
      </Box>

      <Typography component="h2" sx={{ fontFamily: 'var(--font-heading)', fontSize: 30, fontWeight: 600, color: 'var(--awm-bark)' }}>Achievements</Typography>
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2, minmax(0, 1fr))', md: 'repeat(4, minmax(0, 1fr))' }, gap: 1.5, mt: 2 }}>
        {achievements.map((item) => (
          <Paper key={item.title} elevation={0} sx={{ p: 2, textAlign: 'center', border: '1px solid color-mix(in srgb, var(--awm-bark) 12%, transparent)', borderRadius: '12px' }}>
            <item.icon sx={{ fontSize: 42, color: item.unlocked ? 'var(--awm-gold)' : 'var(--awm-muted-light)' }} />
            <Typography sx={{ mt: 0.75, fontFamily: 'Jost, sans-serif', fontWeight: 700, color: 'var(--awm-bark)' }}>{item.title}</Typography>
            <Typography sx={{ mt: 0.35, fontFamily: 'Jost, sans-serif', color: 'var(--awm-muted)', fontSize: 12 }}>{item.target}</Typography>
            {!item.unlocked && <LockOutlined aria-label="Locked" sx={{ mt: 0.75, color: 'var(--awm-muted-light)', fontSize: 16 }} />}
          </Paper>
        ))}
      </Box>

      {(profile.own || profile.shelf.length > 0) && (
        <Box sx={{ mt: 5 }}>
          <Typography component="h2" sx={{ fontFamily: 'var(--font-heading)', fontSize: 30, fontWeight: 600, color: 'var(--awm-bark)' }}>Currently reading</Typography>
          {profile.shelf.length > 0 ? (
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))' }, gap: 1.5, mt: 2 }}>
              {profile.shelf.map((book) => (
                <Paper key={book.slug} elevation={0} sx={{ p: 2, border: '1px solid color-mix(in srgb, var(--awm-bark) 12%, transparent)', borderRadius: '12px' }}>
                  <Typography sx={{ fontFamily: 'var(--font-heading)', fontSize: 21, fontWeight: 600, color: 'var(--awm-bark)' }}>{book.title}</Typography>
                  <Typography sx={{ mt: 0.5, fontFamily: 'Jost, sans-serif', color: 'var(--awm-muted)', fontSize: 13 }}>{book.chapter}</Typography>
                  <Button component={Link} href={book.href} sx={{ mt: 1, px: 0, textTransform: 'none', color: 'var(--awm-forest)', fontWeight: 700 }}>Continue reading</Button>
                </Paper>
              ))}
            </Box>
          ) : (
            <Typography sx={{ mt: 1, fontFamily: 'Jost, sans-serif', color: 'var(--awm-muted)' }}>No reading activity yet.</Typography>
          )}
        </Box>
      )}

      {profile.own && (
        <Paper id="profile-settings" component="section" elevation={0} sx={{ mt: 5, p: { xs: 2.5, md: 3.5 }, scrollMarginTop: 88, border: '1px solid color-mix(in srgb, var(--awm-bark) 12%, transparent)', borderRadius: '14px' }}>
          <Typography component="h2" sx={{ fontFamily: 'var(--font-heading)', fontSize: 28, fontWeight: 600, color: 'var(--awm-bark)' }}>Profile settings</Typography>
          <TextField label="Public display name" value={name} onChange={(event) => setName(event.target.value)} fullWidth sx={{ mt: 2 }} slotProps={{ htmlInput: { maxLength: 60 } }} />
          <Box sx={{ mt: 1.5, display: 'grid' }}>
            <FormControlLabel control={<Switch checked={isPublic} onChange={(event) => setPublic(event.target.checked)} />} label="Make my learning profile public" />
            <FormControlLabel control={<Switch checked={shareReading} onChange={(event) => setShareReading(event.target.checked)} />} label="Share my bookshelf on my public profile" />
          </Box>
          <Typography sx={{ mt: 1, fontFamily: 'Jost, sans-serif', color: 'var(--awm-muted)', fontSize: 12 }}>Your email, account details, and private settings are never shown publicly.</Typography>
          <Button disabled={saving || name.trim().length === 0} onClick={() => void save()} variant="contained" sx={{ mt: 2, textTransform: 'none' }}>Save profile</Button>
          {message && <Alert severity={message === 'Profile saved.' ? 'success' : 'error'} sx={{ mt: 2 }}>{message}</Alert>}
        </Paper>
      )}

      {profile.own && <PremiumSection />}
    </Container>
  )
}
