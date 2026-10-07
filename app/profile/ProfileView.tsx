'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { Add, AutoStories, LocalFireDepartmentRounded } from '@mui/icons-material'
import { Alert, Box, Button, Chip, Container, FormControlLabel, LinearProgress, Paper, Switch, TextField, Typography } from '@mui/material'
import { checkUsernameAvailability, updateProfile, type PublicProfile } from '@/app/actions/profiles'
import { PremiumSection } from '@/app/components/PremiumPrompt'
import BookListRemovalButton from '@/app/books/[book]/BookListRemovalButton'
import AchievementCabinet from '@/app/profile/AchievementCabinet'
import ActivityChart from '@/app/profile/ActivityChart'
import ProfileAvatar from '@/app/profile/ProfileAvatar'
import LearningProgress from '@/app/profile/LearningProgress'
import { thumbnailCropCss } from '@/app/lib/thumbnailCrop'

import { usernameSchema } from '@/app/lib/username'

const panel = { border: '1px solid color-mix(in srgb, var(--awm-bark) 12%, transparent)', borderRadius: '16px', bgcolor: 'var(--awm-white)' }
export default function ProfileView({ profile }: { profile: PublicProfile }) {
  const [name, setName] = useState(profile.displayName), [displayName, setDisplayName] = useState(profile.displayName)
  const [savedUsername,setSavedUsername]=useState(profile.username)
  const [username,setUsername]=useState(profile.username??''), [availability,setAvailability]=useState<{value:string;message:string;available:boolean}|null>(null)
  useEffect(()=>{
    if(!profile.own||!username.trim())return
    let active=true
    const parsed=usernameSchema.safeParse(username)
    if(!parsed.success)return
    const timer=setTimeout(()=>{void checkUsernameAvailability(parsed.data).then(available=>{if(active)setAvailability({value:username,message:available?'Username available.':'That username is already taken.',available})}).catch(()=>{if(active)setAvailability({value:username,message:'Unable to check availability. Please retry.',available:false})})},350)
    return()=>{active=false;clearTimeout(timer)}
  },[username,profile.own])
  const usernameValidation=username.trim()?usernameSchema.safeParse(username):null
  const usernameError=usernameValidation&&!usernameValidation.success?usernameValidation.error.issues[0].message:''
  const usernameStatus=availability?.value===username?availability:null
  const [isPublic, setPublic] = useState(profile.isPublic), [shareReading, setShareReading] = useState(profile.shareReading)
  const [message, setMessage] = useState(''), [saving, setSaving] = useState(false), [removed, setRemoved] = useState<string[]>([])
  const { learning, summary } = profile
  const shelf = profile.shelf.filter(book => !removed.includes(book.slug))
  async function save() {
    setSaving(true); setMessage('')
    try { await updateProfile({ displayName: name, isPublic, shareReading, ...(username.trim()?{username}: {}) }); setDisplayName(name.trim()); if(username.trim()){const value=usernameSchema.parse(username);setUsername(value);setSavedUsername(value)} setMessage('Profile saved.') }
    catch (error) { setMessage(error instanceof Error?error.message:'Unable to save profile. Please try again.') }
    finally { setSaving(false) }
  }
  return <Container component="main" maxWidth="lg" sx={{ py: { xs: 3, md: 6 }, color: 'var(--awm-bark)' }}>
    <Paper component="header" elevation={0} sx={{ ...panel, p: { xs: 2.5, sm: 4 }, background: 'linear-gradient(135deg, var(--awm-white), var(--awm-cream))' }}>
      <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, alignItems: 'center', gap: 3 }}>
        <ProfileAvatar id={profile.id} name={displayName} src={profile.avatar} crop={profile.avatarCrop} editable={profile.own} />
        <Box sx={{ flex: 1, minWidth: 0, width: '100%' }}>
          <Typography sx={{ color: 'var(--awm-muted)', fontSize: 12, letterSpacing: '.12em', textTransform: 'uppercase' }}>{profile.own ? 'My learning profile' : 'Learning profile'}</Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 1.5, mt: 0.75 }}><Typography component="h1" sx={{ fontFamily: 'var(--font-heading)', fontSize: { xs: 34, md: 46 }, fontWeight: 600, lineHeight: 1.1, overflowWrap: 'anywhere' }}>{displayName}</Typography>{profile.premium && <Chip aria-label="AWM Plus" label={<Box sx={{ display: 'flex', alignItems: 'center', gap: 0.25 }}>AWM<Add aria-hidden="true" sx={{ fontSize: 18 }} /></Box>} sx={{ fontWeight: 700, color: 'var(--awm-bark)', bgcolor: 'color-mix(in srgb, var(--awm-gold) 18%, transparent)', border: '1px solid color-mix(in srgb, var(--awm-gold) 40%, transparent)' }} />}</Box>
          {savedUsername&&<Typography sx={{mt:1,color:'var(--awm-muted)'}}>@{savedUsername}</Typography>}
          <Typography sx={{ mt: 1, color: 'var(--awm-muted)', fontSize: 13 }}>Learning since {profile.joined}</Typography>
          <Typography sx={{ mt: 2, fontWeight: 700 }}>Level {profile.level} · {summary.level.progressPercent}% toward Level {profile.level + 1}</Typography>
          <LinearProgress aria-label="Progress toward the next learning level" variant="determinate" value={summary.level.progressPercent} sx={{ mt: 1, height: 8, borderRadius: 99 }} />
          <Typography sx={{ mt: 0.75, color: 'var(--awm-muted)', fontSize: 12 }}>{summary.nextLevelPoints.toLocaleString('en-GB')} progression points to your next level. Each recorded learning minute and XP contributes one point.</Typography>
        </Box>
        <Box sx={{ width: { xs: '100%', sm: 'auto' }, minWidth: 130, p: 2, textAlign: 'center', borderRadius: '14px', bgcolor: 'color-mix(in srgb, var(--awm-gold) 10%, transparent)' }}><LocalFireDepartmentRounded aria-hidden="true" sx={{ color: 'var(--awm-gold)', fontSize: 38 }} /><Typography sx={{ fontWeight: 700, mt: 0.5 }}>{summary.streak} day streak</Typography><Typography sx={{ color: 'var(--awm-muted)', fontSize: 12 }}>Current streak</Typography></Box>
      </Box>
    </Paper>
    <LearningProgress profile={profile} />
    <ActivityChart activity={learning} />
    <AchievementCabinet activity={learning} userId={profile.id} editable={profile.own} featuredTrophies={profile.featuredTrophies} />
    {(profile.own || profile.shelf.length > 0) && <Box component="section" sx={{ mt: 5 }}>
      <Typography component="h2" variant="h4">Currently Reading</Typography>
      {shelf.length ? <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2,minmax(0,1fr))' }, gap: 2, mt: 2 }}>
        {shelf.map(book => <Paper key={book.slug} elevation={0} sx={{ ...panel, display: 'grid', gridTemplateColumns: { xs: '100px minmax(0,1fr)', sm: '130px minmax(0,1fr)' }, overflow: 'hidden' }}>
          <Box sx={{ bgcolor: 'var(--awm-cream)', minHeight: 190, overflow: 'hidden' }}>{book.cover ? <Box component="img" src={book.cover} alt={`${book.title} cover`} loading="lazy" sx={{ width: '100%', height: '100%', objectFit: 'cover', ...thumbnailCropCss(book.coverCrop) }} /> : <AutoStories sx={{ color: 'var(--awm-gold)', m: 3, fontSize: 40 }} />}</Box>
          <Box sx={{ minWidth: 0, p: 2 }}><Typography sx={{ fontFamily: 'var(--font-heading)', fontSize: 23, fontWeight: 600 }}>{book.title}</Typography><Typography sx={{ color: 'var(--awm-muted)', fontSize: 12 }}>{book.author}</Typography><Typography sx={{ mt: 1, fontSize: 13 }}>{book.chapter}</Typography><Typography sx={{ mt: 0.5, color: 'var(--awm-muted)', fontSize: 12 }}>Reading position: chapter {book.position} of {book.total}</Typography><LinearProgress aria-label={`${book.title} reading position`} variant="determinate" value={book.total ? Math.max(0, book.position - 1) / book.total * 100 : 0} sx={{ mt: 1, borderRadius: 99 }} /><Button component={Link} href={book.href} sx={{ mt: 1, px: 0 }}>Continue Reading</Button>{profile.own && <BookListRemovalButton bookSlug={book.slug} onRemoved={() => setRemoved(items => [...items, book.slug])} />}</Box>
        </Paper>)}
      </Box> : <Paper elevation={0} sx={{ ...panel, p: 3, mt: 2 }}><Typography>No current book. Your next story is waiting.</Typography><Button component={Link} href="/books" sx={{ mt: 1 }}>Browse books</Button></Paper>}
    </Box>}
    {profile.own && <Paper id="profile-settings" component="section" elevation={0} sx={{ ...panel, mt: 5, p: { xs: 2.5, md: 3.5 }, scrollMarginTop: 88 }}>
      <Typography component="h2" variant="h5">Profile settings</Typography>
      <TextField label="Select a username" value={username} onChange={event=>setUsername(event.target.value)} fullWidth sx={{mt:2}} error={Boolean(usernameError||usernameStatus&&!usernameStatus.available)} helperText={usernameError||usernameStatus?.message||'3-24 letters, numbers or underscores. Start with a letter.'} slotProps={{htmlInput:{maxLength:24,autoCapitalize:'none',autoCorrect:'off'}}} />
      <TextField label="Public display name" value={name} onChange={e => setName(e.target.value)} fullWidth sx={{ mt: 2 }} slotProps={{ htmlInput: { maxLength: 60 } }} />
      <Box sx={{ mt: 1.5, display: 'grid' }}><FormControlLabel control={<Switch checked={isPublic} onChange={e => setPublic(e.target.checked)} />} label="Make my learning profile public" /><FormControlLabel control={<Switch checked={shareReading} onChange={e => setShareReading(e.target.checked)} />} label="Share my bookshelf on my public profile" /></Box>
      <Typography sx={{ mt: 1, color: 'var(--awm-muted)', fontSize: 12 }}>Your email, account details and private settings are never shown publicly. Uploaded profile pictures use public profile storage.</Typography>
      <Button disabled={saving || !name.trim() || Boolean(usernameError) || Boolean(usernameStatus&&!usernameStatus.available)} onClick={() => void save()} variant="contained" sx={{ mt: 2 }}>Save profile</Button>
      {message && <Alert severity={message === 'Profile saved.' ? 'success' : 'error'} sx={{ mt: 2 }}>{message}</Alert>}
    </Paper>}
    {profile.own && <PremiumSection />}
  </Container>
}
