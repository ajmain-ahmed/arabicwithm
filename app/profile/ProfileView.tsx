'use client'
import { useState } from 'react'
import { Alert, Box, Button, Container, Dialog, DialogActions, DialogContent, DialogTitle, FormControlLabel, Paper, Switch, TextField, Typography } from '@mui/material'
import { EmojiEvents, LockOutlined, MenuBook, PsychologyOutlined, Star } from '@mui/icons-material'
import { updateProfile, type PublicProfile } from '@/app/actions/profiles'
import { PremiumSection } from '@/app/components/PremiumPrompt'

export default function ProfileView({ profile }: { profile: PublicProfile }) {
  const [name, setName] = useState(profile.displayName)
  const [isPublic, setPublic] = useState(profile.isPublic)
  const [shareReading, setShareReading] = useState(profile.shareReading)
  const [message, setMessage] = useState('')
  const [saving, setSaving] = useState(false)
  const [selected, setSelected] = useState<PublicProfile['shelf'][number] | null>(null)
  const achievements = [
    { title: 'First recall', target: 'Complete 1 Memory card', unlocked: profile.memoryCards >= 1, icon: PsychologyOutlined },
    { title: 'Memory explorer', target: 'Complete 100 Memory cards', unlocked: profile.memoryCards >= 100, icon: EmojiEvents },
    { title: 'Level five', target: 'Reach learning level 5', unlocked: profile.level >= 5, icon: Star },
    { title: 'Reader', target: 'Start your first book', unlocked: profile.shelf.length > 0, icon: MenuBook },
  ]
  async function save() {
    setSaving(true)
    try { await updateProfile({ displayName: name, isPublic, shareReading }); setMessage('Profile saved.') }
    catch { setMessage('Unable to save profile. Please try again.') } finally { setSaving(false) }
  }
  return <Container component="main" maxWidth="lg" sx={{ py: { xs: 3, md: 6 } }}>
    <Typography variant="h1" sx={{ fontSize: { xs: 32, md: 48 } }}>{profile.displayName}</Typography>
    <Typography color="text.secondary" sx={{ mt: 1 }}>Learning since {profile.joined}</Typography>
    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2,1fr)', md: 'repeat(4,1fr)' }, gap: 2, my: 3 }}>{[
      ['Current level', profile.level], ['Memory XP', profile.xp], ['Memory XP this week', profile.weekXp], ['Memory cards completed', profile.memoryCards],
    ].map(([label, value]) => <Paper key={label} variant="outlined" sx={{ p: 2, borderRadius: '12px' }}><Typography color="text.secondary">{label}</Typography><Typography sx={{ fontSize: 30 }}>{value}</Typography></Paper>)}</Box>
    <Typography variant="h2" sx={{ fontSize: 30 }}>Trophy cabinet</Typography>
    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2,1fr)', md: 'repeat(4,1fr)' }, gap: 2, my: 3, pb: 2, borderBottom: '8px solid', borderColor: 'divider' }}>{achievements.map(item => <Paper key={item.title} variant="outlined" sx={{ p: 2, textAlign: 'center', borderRadius: '16px' }}><item.icon sx={{ fontSize: 52, color: item.unlocked ? 'primary.main' : 'text.secondary' }} /><Typography sx={{ fontWeight: 700 }}>{item.title}</Typography><Typography variant="body2">{item.target}</Typography><Typography variant="body2">{item.unlocked ? 'Unlocked' : <><LockOutlined sx={{ fontSize: 14 }} /> Locked</>}</Typography></Paper>)}</Box>
    <Typography variant="h2" sx={{ fontSize: 30 }}>Currently reading</Typography>
    <Typography color="text.secondary" sx={{ mt: 1 }}>Your bookshelf remembers your current chapter.</Typography>
    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2,minmax(0,1fr))', sm: 'repeat(4,minmax(0,1fr))' }, gap: 2, py: 3, borderBottom: '12px solid', borderColor: 'divider' }}>{profile.shelf.map(book => <Button key={book.slug} onClick={() => setSelected(book)} sx={{ display: 'flex', flexDirection: 'column', gap: 1, p: 1, borderRadius: '10px', bgcolor: 'background.paper', color: 'text.primary', '&:hover, &:focus-visible': { outline: '2px solid', outlineColor: 'primary.main', transform: 'translateY(-4px)' } }}>
      {book.cover ? <Box component="img" src={book.cover} alt="" sx={{ width: '100%', height: 170, objectFit: 'contain' }} /> : <MenuBook sx={{ fontSize: 100, height: 170 }} />}
      <Typography sx={{ fontWeight: 700 }}>{book.title}</Typography><Typography variant="body2">Chapter {book.position} of {book.total}</Typography>
    </Button>)}</Box>
    {!profile.shelf.length && <Typography sx={{ my: 2 }} color="text.secondary">No reading activity shared yet.</Typography>}
    <Dialog open={Boolean(selected)} onClose={() => setSelected(null)} maxWidth="xs" fullWidth aria-labelledby="shelf-title"><DialogTitle id="shelf-title">{selected?.title}</DialogTitle><DialogContent><Typography>By {selected?.author}</Typography><Typography sx={{ mt: 1 }}>Currently reading: {selected?.chapter}</Typography><Typography color="text.secondary">Chapter {selected?.position} of {selected?.total}</Typography></DialogContent><DialogActions><Button onClick={() => setSelected(null)}>Close</Button><Button href={selected?.href}>Continue reading</Button></DialogActions></Dialog>
    {profile.own && <Paper variant="outlined" sx={{ mt: 4, p: 3, borderRadius: '12px' }}><Typography variant="h2" sx={{ fontSize: 26, mb: 2 }}>Profile settings</Typography><TextField label="Public display name" value={name} onChange={e => setName(e.target.value)} fullWidth slotProps={{ htmlInput: { maxLength: 60 } }} /><FormControlLabel control={<Switch checked={isPublic} onChange={e => setPublic(e.target.checked)} />} label="Make my learning profile public" /><FormControlLabel control={<Switch checked={shareReading} onChange={e => setShareReading(e.target.checked)} />} label="Share my bookshelf on my public profile" /><Typography variant="body2" sx={{ mb: 2 }}>Your email, account details and private settings are never shown publicly.</Typography><Button disabled={saving} onClick={() => void save()} variant="contained">Save profile</Button>{message && <Alert sx={{ mt: 2 }}>{message}</Alert>}{isPublic && <Typography sx={{ mt: 2, overflowWrap: 'anywhere' }}>Public profile: /profile/{profile.id}</Typography>}</Paper>}
    {profile.own && <PremiumSection />}
  </Container>
}
