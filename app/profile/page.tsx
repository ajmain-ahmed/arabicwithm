'use client'

import React, { useEffect, useMemo, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import {
    Box, Container, Typography, Button, Skeleton, LinearProgress,
    Avatar, Fade, Grid,
} from '@mui/material'
import {
    LogoutOutlined, SettingsOutlined, SupportOutlined,
    BarChartOutlined, CheckCircleOutlined, MailOutlineOutlined,
    LocalShippingOutlined, InventoryOutlined, ShoppingBagOutlined,
    ChevronRight, ArrowForwardIos,
} from '@mui/icons-material'
import Navbar from '@/app/components/navbar'
import { useAuth } from '@/app/AuthContext'
import { fetchUserProfile, type ProfileData, type LevelStat } from '@/app/actions/profile'
import { supabase } from '@/app/lib/supabase/client'   // ← adjust path if needed
import {
    Accordion, AccordionSummary, AccordionDetails,
} from '@mui/material'
import { ExpandMore } from '@mui/icons-material'

/* ─────────────────────────────────────────────
   CSS (from your second site)
───────────────────────────────────────────── */
const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;1,300&family=Jost:wght@300;400;500;600&display=swap');
  :root {
    --cream:#faf7f2; --sand:#f5ede0; --bark:#2c1a0e; --forest:#0e2e1f;
    --gold:#b8860b; --gold-lt:#d4a843; --muted:#7a6e65; --border:rgba(184,134,11,0.18);
  }
  *{box-sizing:border-box;} body{background:var(--cream);} img{max-width:100%;}
  @keyframes fadeUp { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
  .fade-up{animation:fadeUp 0.5s cubic-bezier(.22,1,.36,1) both;}
  .nav-item{display:flex;align-items:center;gap:12px;padding:11px 16px;border-radius:2px;cursor:pointer;
    transition:background 0.15s,color 0.15s;font-family:'Jost',sans-serif;font-size:0.88rem;font-weight:500;
    color:var(--muted);border:1px solid transparent;white-space:nowrap;}
  .nav-item:hover{background:rgba(184,134,11,0.05);color:var(--bark);}
  .nav-item.active{background:rgba(184,134,11,0.07);color:var(--forest);border-color:var(--border);font-weight:600;}
  .nav-item.active .nav-icon{color:var(--gold);}
  .mobile-tab{display:flex;flex-direction:column;align-items:center;gap:3px;padding:8px 4px;
    cursor:pointer;flex:1;border:none;background:transparent;transition:color 0.15s;
    color:var(--muted);font-family:'Jost',sans-serif;font-size:0.62rem;font-weight:500;letter-spacing:0.03em;}
  .mobile-tab.active{color:var(--gold);}
  .mobile-tab.signout{color:#c0392b;}
  .support-card{background:#fff;border:1px solid var(--border);border-radius:4px;padding:20px;
    transition:box-shadow 0.2s;cursor:pointer;text-decoration:none;display:block;}
  .support-card:hover{box-shadow:0 8px 32px rgba(44,26,14,0.08);}
`

/* ─────────────────────────────────────────────
   Types & Nav
───────────────────────────────────────────── */
type Section = 'stats' | 'settings' | 'support'

const validTabs: Section[] = ['stats', 'settings', 'support']

const NAV_ITEMS: { id: Section; label: string; icon: React.ReactNode }[] = [
    { id: 'stats', label: 'Stats', icon: <BarChartOutlined sx={{ fontSize: 18 }} /> },
    { id: 'settings', label: 'Settings', icon: <SettingsOutlined sx={{ fontSize: 18 }} /> },
    { id: 'support', label: 'Support', icon: <SupportOutlined sx={{ fontSize: 18 }} /> },
]

/* ─────────────────────────────────────────────
   Helpers
───────────────────────────────────────────── */
function formatDate(iso: string) {
    if (!iso) return ''
    const d = new Date(iso)
    return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
}

function SectionLabel({ children }: { children: React.ReactNode }) {
    return (
        <Typography sx={{
            fontFamily: 'Jost, sans-serif', fontSize: '0.68rem', fontWeight: 600,
            letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--gold)', mb: 1,
        }}>
            {children}
        </Typography>
    )
}

function SectionTitle({ children }: { children: React.ReactNode }) {
    return (
        <Typography sx={{
            fontFamily: 'Cormorant Garamond, serif',
            fontSize: { xs: '1.4rem', md: '1.6rem' },
            fontWeight: 600, color: 'var(--bark)', lineHeight: 1.2, mb: 3,
        }}>
            {children}
        </Typography>
    )
}

/* ─────────────────────────────────────────────
   Chart Section (your original, untouched)
───────────────────────────────────────────── */
function ChartSection({ level }: { level: LevelStat | null }) {
    const completed = level?.completedWords ?? 0
    const revision = level?.revisionWords ?? 0
    const total = level?.totalWords ?? 0
    const remaining = Math.max(0, total - completed - revision)
    const progressPct = total > 0 ? Math.round((completed / total) * 100) : 0
    const color = level?.color ?? '#b8860b'
    const label = level ? `${level.label} (${level.code})` : 'All Levels'

    const completedWidth = total > 0 ? (completed / total) * 100 : 0
    const revisionWidth = total > 0 ? (revision / total) * 100 : 0

    return (
        <Box sx={{
            background: '#fff',
            border: '1px solid rgba(184,134,11,0.15)',
            borderRadius: '10px',
            p: { xs: 3, md: 4 },
            mb: { xs: 3, md: 4 },
            display: 'flex',
            flexDirection: { xs: 'column', md: 'row' },
            alignItems: 'center',
            gap: { xs: 3, md: 5 },
        }}>
            {/* Donut */}
            <Box sx={{ position: 'relative', width: 160, height: 160, flexShrink: 0 }}>
                <svg viewBox="0 0 36 36" style={{ width: '100%', height: '100%', transform: 'rotate(-90deg)' }}>
                    <path
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                        fill="none"
                        stroke="rgba(184,134,11,0.12)"
                        strokeWidth={3}
                    />
                    <path
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                        fill="none"
                        stroke={color}
                        strokeWidth={3}
                        strokeDasharray={`${progressPct}, 100`}
                        strokeLinecap="round"
                        style={{ transition: 'stroke-dasharray 0.6s ease, stroke 0.3s ease' }}
                    />
                </svg>
                <Box sx={{
                    position: 'absolute',
                    inset: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexDirection: 'column',
                }}>
                    <Typography sx={{
                        fontFamily: 'Jost, sans-serif',
                        fontSize: '1.8rem',
                        fontWeight: 700,
                        color: '#2c1a0e',
                    }}>
                        {progressPct}%
                    </Typography>
                    <Typography sx={{
                        fontFamily: 'Jost, sans-serif',
                        fontSize: '0.72rem',
                        fontWeight: 500,
                        color: '#7a6e65',
                        textTransform: 'uppercase',
                        letterSpacing: '0.06em',
                    }}>
                        mastered
                    </Typography>
                </Box>
            </Box>

            {/* Right side */}
            <Box sx={{ flex: 1, width: '100%' }}>
                <Typography sx={{
                    fontFamily: "'EB Garamond', serif",
                    fontSize: '1.4rem',
                    fontWeight: 700,
                    color: '#2c1a0e',
                    mb: 0.5,
                }}>
                    {label}
                </Typography>
                <Typography sx={{
                    fontFamily: 'Jost, sans-serif',
                    fontSize: '0.85rem',
                    color: '#7a6e65',
                    mb: 2.5,
                }}>
                    {total.toLocaleString()} total words
                    {level && level.code !== 'ALL' && ` · ${level.completedThemes}/${level.totalThemes} themes completed`}
                </Typography>

                {/* Stacked status bar */}
                <Box sx={{
                    width: '100%',
                    height: 32,
                    borderRadius: '8px',
                    display: 'flex',
                    overflow: 'hidden',
                    border: '1px solid rgba(184,134,11,0.12)',
                }}>
                    {completed > 0 && (
                        <Box sx={{
                            width: `${completedWidth}%`,
                            background: '#2e7d32',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            minWidth: completedWidth > 0 && completedWidth < 8 ? 32 : 'auto',
                        }}>
                            <Typography sx={{
                                fontFamily: 'Jost, sans-serif',
                                fontSize: '0.75rem',
                                fontWeight: 700,
                                color: '#fff',
                                whiteSpace: 'nowrap',
                            }}>
                                {completed}
                            </Typography>
                        </Box>
                    )}
                    {revision > 0 && (
                        <Box sx={{
                            width: `${revisionWidth}%`,
                            background: '#1565c0',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            minWidth: revisionWidth > 0 && revisionWidth < 8 ? 32 : 'auto',
                        }}>
                            <Typography sx={{
                                fontFamily: 'Jost, sans-serif',
                                fontSize: '0.75rem',
                                fontWeight: 700,
                                color: '#fff',
                                whiteSpace: 'nowrap',
                            }}>
                                {revision}
                            </Typography>
                        </Box>
                    )}
                    {remaining > 0 && (
                        <Box sx={{
                            flex: 1,
                            background: 'rgba(184,134,11,0.08)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            minWidth: 32,
                        }}>
                            <Typography sx={{
                                fontFamily: 'Jost, sans-serif',
                                fontSize: '0.75rem',
                                fontWeight: 700,
                                color: '#9e8a7a',
                                whiteSpace: 'nowrap',
                            }}>
                                {remaining}
                            </Typography>
                        </Box>
                    )}
                </Box>

                {/* Legend */}
                <Box sx={{ display: 'flex', gap: { xs: 2, sm: 3 }, mt: 1.5 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                        <Box sx={{ width: 10, height: 10, borderRadius: '2px', background: '#2e7d32' }} />
                        <Typography sx={{ fontFamily: 'Jost, sans-serif', fontSize: '0.78rem', color: '#7a6e65' }}>
                            Mastered
                        </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                        <Box sx={{ width: 10, height: 10, borderRadius: '2px', background: '#1565c0' }} />
                        <Typography sx={{ fontFamily: 'Jost, sans-serif', fontSize: '0.78rem', color: '#7a6e65' }}>
                            Revision
                        </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                        <Box sx={{ width: 10, height: 10, borderRadius: '2px', background: 'rgba(184,134,11,0.2)' }} />
                        <Typography sx={{ fontFamily: 'Jost, sans-serif', fontSize: '0.78rem', color: '#7a6e65' }}>
                            Remaining
                        </Typography>
                    </Box>
                </Box>
            </Box>
        </Box>
    )
}

/* ─────────────────────────────────────────────
   Level Card (your original, untouched)
───────────────────────────────────────────── */
function LevelCard({
    level,
    isSelected,
    onClick,
}: {
    level: LevelStat
    isSelected: boolean
    onClick: () => void
}) {
    const isComplete = level.progressPct === 100
    const hasStarted = level.completedWords > 0 || level.revisionWords > 0

    return (
        <Box
            onClick={onClick}
            sx={{
                background: '#fff',
                border: '2px solid',
                borderColor: isSelected
                    ? '#b8860b'
                    : isComplete
                        ? 'rgba(46,125,50,0.25)'
                        : 'rgba(184,134,11,0.18)',
                borderRadius: '10px',
                p: { xs: 2.5, md: 3 },
                display: 'flex',
                flexDirection: 'column',
                gap: 2,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                boxShadow: isSelected ? '0 8px 24px rgba(184,134,11,0.12)' : 'none',
                '&:hover': {
                    transform: 'translateY(-2px)',
                    boxShadow: '0 12px 32px rgba(44,26,14,0.08)',
                    borderColor: isSelected ? '#b8860b' : isComplete ? 'rgba(46,125,50,0.4)' : 'rgba(184,134,11,0.35)',
                },
            }}
        >
            {/* Header */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <Box>
                    <Typography sx={{
                        fontFamily: 'Jost, sans-serif', fontSize: '0.78rem',
                        fontWeight: 600, color: '#7a6e65',
                        textTransform: 'uppercase', letterSpacing: '0.08em',
                    }}>
                        {level.label}
                    </Typography>
                    <Typography sx={{
                        fontFamily: "'EB Garamond', serif", fontSize: '1.6rem',
                        fontWeight: 700, color: '#2c1a0e', lineHeight: 1.2, mt: 0.25,
                    }}>
                        {level.code}
                    </Typography>
                </Box>
                <Box sx={{
                    width: 50, height: 50, borderRadius: '50%', flexShrink: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: isSelected
                        ? 'rgba(184,134,11,0.12)'
                        : isComplete
                            ? 'rgba(46,125,50,0.08)'
                            : 'rgba(184,134,11,0.08)',
                }}>
                    <Typography sx={{
                        fontFamily: 'Jost, sans-serif', fontSize: '1rem',
                        fontWeight: 700, color: isSelected ? '#b8860b' : isComplete ? '#2e7d32' : '#b8860b',
                    }}>
                        {level.progressPct}%
                    </Typography>
                </Box>
            </Box>

            {/* Progress bar */}
            <LinearProgress
                variant="determinate"
                value={level.progressPct}
                sx={{
                    height: 6, borderRadius: 3,
                    backgroundColor: 'rgba(184,134,11,0.1)',
                    '& .MuiLinearProgress-bar': {
                        background: isComplete
                            ? 'linear-gradient(90deg, #2e7d32, #4caf50)'
                            : 'linear-gradient(90deg, #b8860b, #d4a843)',
                        borderRadius: 3,
                    },
                }}
            />

            {/* Mini stats */}
            <Box sx={{ display: 'flex', gap: { xs: 2, md: 3 }, pt: 0.5 }}>
                <Box>
                    <Typography sx={{ fontFamily: 'Jost, sans-serif', fontSize: '0.72rem', color: '#9e8a7a', fontWeight: 500 }}>
                        Words
                    </Typography>
                    <Typography sx={{ fontFamily: 'Jost, sans-serif', fontSize: '0.95rem', fontWeight: 600, color: '#2c1a0e' }}>
                        {level.completedWords}
                        <Box component="span" sx={{ color: '#9e8a7a', fontWeight: 400 }}>
                            /{level.totalWords}
                        </Box>
                    </Typography>
                </Box>
                <Box>
                    <Typography sx={{ fontFamily: 'Jost, sans-serif', fontSize: '0.72rem', color: '#9e8a7a', fontWeight: 500 }}>
                        Revision
                    </Typography>
                    <Typography sx={{ fontFamily: 'Jost, sans-serif', fontSize: '0.95rem', fontWeight: 600, color: '#1565c0' }}>
                        {level.revisionWords}
                    </Typography>
                </Box>
                <Box>
                    <Typography sx={{ fontFamily: 'Jost, sans-serif', fontSize: '0.72rem', color: '#9e8a7a', fontWeight: 500 }}>
                        Themes
                    </Typography>
                    <Typography sx={{ fontFamily: 'Jost, sans-serif', fontSize: '0.95rem', fontWeight: 600, color: '#2c1a0e' }}>
                        {level.completedThemes}
                        <Box component="span" sx={{ color: '#9e8a7a', fontWeight: 400 }}>
                            /{level.totalThemes}
                        </Box>
                    </Typography>
                </Box>
            </Box>

            {/* Footer hint */}
            <Box sx={{ mt: 'auto', pt: 0.5 }}>
                <Typography sx={{
                    fontFamily: 'Jost, sans-serif',
                    fontSize: '0.78rem',
                    color: '#9e8a7a',
                    textAlign: 'center',
                }}>
                    {isSelected
                        ? 'Click again to show all stats'
                        : isComplete
                            ? 'Level complete — click to view'
                            : hasStarted
                                ? 'Click to view stats'
                                : 'Click to view stats'}
                </Typography>
            </Box>
        </Box>
    )
}

/* ─────────────────────────────────────────────
   Loading Skeleton (your original)
───────────────────────────────────────────── */
function ProfileSkeleton() {
    return (
        <Container maxWidth="lg" sx={{ py: { xs: 3, sm: 4, md: 6 } }}>
            <Box sx={{ background: '#fff', border: '1px solid rgba(184,134,11,0.15)', borderRadius: '10px', p: { xs: 3, md: 4 }, mb: 4, display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: { xs: 3, md: 5 }, alignItems: 'center' }}>
                <Skeleton variant="circular" width={160} height={160} />
                <Box sx={{ flex: 1, width: '100%' }}>
                    <Skeleton variant="text" width={180} height={28} sx={{ mb: 1 }} />
                    <Skeleton variant="text" width={260} height={18} sx={{ mb: 2.5 }} />
                    <Skeleton variant="rounded" height={32} sx={{ borderRadius: '8px', mb: 1.5 }} />
                    <Box sx={{ display: 'flex', gap: 3 }}>
                        <Skeleton variant="text" width={80} height={16} />
                        <Skeleton variant="text" width={80} height={16} />
                        <Skeleton variant="text" width={80} height={16} />
                    </Box>
                </Box>
            </Box>
            <Skeleton variant="text" width={200} height={36} sx={{ mb: 3 }} />
            <Grid container spacing={3}>
                {[...Array(6)].map((_, i) => (
                    <Grid key={i} size={{ xs: 12, sm: 6, lg: 4 }}>
                        <Box sx={{ background: '#fff', border: '1px solid rgba(184,134,11,0.15)', borderRadius: '10px', p: 3 }}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                                <Skeleton variant="text" width={80} height={24} />
                                <Skeleton variant="circular" width={50} height={50} />
                            </Box>
                            <Skeleton variant="rounded" height={6} sx={{ mb: 2, borderRadius: 3 }} />
                            <Box sx={{ display: 'flex', gap: 3, mb: 2 }}>
                                <Skeleton variant="text" width={50} height={20} />
                                <Skeleton variant="text" width={50} height={20} />
                                <Skeleton variant="text" width={50} height={20} />
                            </Box>
                        </Box>
                    </Grid>
                ))}
            </Grid>
        </Container>
    )
}

/* ─────────────────────────────────────────────
   Stats Section (your original content)
───────────────────────────────────────────── */
function StatsSection({
    profile,
    chartLevel,
    selectedLevelCode,
    onCardClick,
}: {
    profile: ProfileData
    chartLevel: LevelStat
    selectedLevelCode: string | null
    onCardClick: (code: string) => void
}) {
    return (
        <Box className="fade-up">
            <Fade in timeout={400}>
                <Box>
                    <ChartSection level={chartLevel} />
                </Box>
            </Fade>

            <Box sx={{ mb: { xs: 2.5, md: 3 } }}>
                <Typography sx={{
                    fontFamily: "'EB Garamond', serif",
                    fontSize: { xs: '1.5rem', md: '2rem' },
                    fontWeight: 700, color: '#2c1a0e',
                }}>
                    Level Progress
                </Typography>
                <Typography sx={{
                    fontFamily: 'Jost, sans-serif',
                    fontSize: { xs: '0.85rem', md: '0.95rem' },
                    color: '#7a6e65', mt: 0.5,
                }}>
                    Click a card to filter the chart
                </Typography>
            </Box>

            <Fade in timeout={600}>
                <Grid container spacing={3}>
                    {profile.levels.map((level) => (
                        <Grid key={level.code} size={{ xs: 12, sm: 6, lg: 4 }}>
                            <LevelCard
                                level={level}
                                isSelected={selectedLevelCode === level.code}
                                onClick={() => onCardClick(level.code)}
                            />
                        </Grid>
                    ))}
                </Grid>
            </Fade>
        </Box>
    )
}

/* ─────────────────────────────────────────────
   Settings Section (from your second site)
───────────────────────────────────────────── */
function SettingsSection({ userEmail }: { userEmail: string }) {
    const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')

    const handleResetLink = async () => {
        setStatus('sending')
        const { error } = await supabase.auth.resetPasswordForEmail(userEmail, {
            redirectTo: `${window.location.origin}/reset-password`,
        })
        setStatus(error ? 'error' : 'sent')
    }

    return (
        <Box className="fade-up">
            <SectionLabel>Preferences</SectionLabel>
            <SectionTitle>Settings</SectionTitle>
            <Box sx={{ background: '#fff', border: '1px solid var(--border)', borderRadius: '4px', p: { xs: 2, sm: 3 } }}>
                <Typography sx={{ fontFamily: 'Jost, sans-serif', fontSize: '0.85rem', fontWeight: 600, color: 'var(--bark)', mb: 0.5 }}>Password</Typography>
                <Typography sx={{ fontFamily: 'Jost, sans-serif', fontSize: '0.8rem', color: 'var(--muted)', mb: 2.5, lineHeight: 1.6 }}>
                    We'll send a secure reset link to <Box component="span" sx={{ color: 'var(--bark)', fontWeight: 500 }}>{userEmail}</Box>
                </Typography>
                {status === 'sent' ? (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, px: 2, py: 1.4, background: 'rgba(46,125,50,0.06)', border: '1px solid rgba(46,125,50,0.2)', borderRadius: '2px' }}>
                        <CheckCircleOutlined sx={{ fontSize: 16, color: '#2e7d32', flexShrink: 0 }} />
                        <Typography sx={{ fontFamily: 'Jost, sans-serif', fontSize: '0.82rem', color: '#2e7d32' }}>
                            Reset link sent — check your inbox.
                        </Typography>
                    </Box>
                ) : (
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                        <Button
                            onClick={handleResetLink}
                            disabled={status === 'sending'}
                            variant="contained"
                            sx={{ alignSelf: 'flex-start', background: 'linear-gradient(135deg,#b8860b,#d4a843)', color: 'var(--forest)', fontFamily: 'Jost, sans-serif', fontWeight: 700, textTransform: 'none', borderRadius: '2px', px: 3, '&:disabled': { background: 'rgba(44,26,14,0.08)', color: 'rgba(44,26,14,0.3)' } }}
                        >
                            {status === 'sending' ? 'Sending…' : 'Send Reset Link'}
                        </Button>
                        {status === 'error' && (
                            <Typography sx={{ fontFamily: 'Jost, sans-serif', fontSize: '0.78rem', color: '#c0392b' }}>
                                Something went wrong. Please try again.
                            </Typography>
                        )}
                    </Box>
                )}
            </Box>
        </Box>
    )
}

/* ─────────────────────────────────────────────
   Support Section (from your second site)
───────────────────────────────────────────── */
function FaqItem({ q, a }: { q: string; a: string }) {
    const [open, setOpen] = useState(false)
    return (
        <Box sx={{ borderBottom: '1px solid rgba(44,26,14,0.07)', '&:last-child': { borderBottom: 'none' } }}>
            <Box onClick={() => setOpen(o => !o)} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', py: 1.8, cursor: 'pointer', gap: 2 }}>
                <Typography sx={{ fontFamily: 'Jost, sans-serif', fontSize: '0.88rem', fontWeight: 500, color: 'var(--bark)' }}>{q}</Typography>
                <ChevronRight sx={{ fontSize: 16, color: 'var(--muted)', flexShrink: 0, transition: 'transform 0.2s', transform: open ? 'rotate(90deg)' : 'none' }} />
            </Box>
            {open && <Typography sx={{ fontFamily: 'Jost, sans-serif', fontSize: '0.82rem', color: 'var(--muted)', lineHeight: 1.7, pb: 2 }}>{a}</Typography>}
        </Box>
    )
}

function SupportSection() {
    return (
        <Box className="fade-up">
            <SectionLabel>Help</SectionLabel>
            <SectionTitle>Support</SectionTitle>

            {/* Support cards grid (unchanged) */}
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2, mb: 4 }}>
                {[
                    { icon: <MailOutlineOutlined sx={{ fontSize: 22 }} />, title: 'Email Us', body: 'For account questions, feedback, or anything else.', action: 'hello@yourapp.com', href: 'mailto:hello@yourapp.com' },
                    { icon: <LocalShippingOutlined sx={{ fontSize: 22 }} />, title: 'Learning Guide', body: 'Tips on how to get the most out of your daily practice.', action: 'Learn more', href: '#' },
                    { icon: <InventoryOutlined sx={{ fontSize: 22 }} />, title: 'Bug Reports', body: "Something not working? We'll get it fixed.", action: 'Contact us', href: 'mailto:hello@yourapp.com?subject=Bug Report' },
                    { icon: <ShoppingBagOutlined sx={{ fontSize: 22 }} />, title: 'Data & Privacy', body: 'Questions about your data? Read our policy or email us.', action: 'Read policy', href: '#' },
                ].map((item) => (
                    <Box key={item.title} className="support-card" component="a" href={item.href}>
                        <Box sx={{ color: 'var(--gold)', mb: 1.5 }}>{item.icon}</Box>
                        <Typography sx={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '1.1rem', fontWeight: 600, color: 'var(--bark)', mb: 0.5 }}>{item.title}</Typography>
                        <Typography sx={{ fontFamily: 'Jost, sans-serif', fontSize: '0.82rem', color: 'var(--muted)', lineHeight: 1.6, mb: 1.5 }}>{item.body}</Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <Typography sx={{ fontFamily: 'Jost, sans-serif', fontSize: '0.75rem', fontWeight: 600, color: 'var(--gold)', letterSpacing: '0.04em' }}>{item.action}</Typography>
                            <ArrowForwardIos sx={{ fontSize: 10, color: 'var(--gold)' }} />
                        </Box>
                    </Box>
                ))}
            </Box>

            {/* FAQ Accordion */}
            <Box sx={{ background: '#fff', border: '1px solid var(--border)', borderRadius: '4px', overflow: 'hidden' }}>
                <Box sx={{ p: { xs: 2, sm: 3 }, pb: { xs: 1, sm: 1 } }}>
                    <Typography sx={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '1.3rem', fontWeight: 600, color: 'var(--bark)', mb: 1.5 }}>
                        Common Questions
                    </Typography>
                </Box>

                {[
                    { q: 'How is my progress calculated?', a: 'Progress is based on the number of words you have marked as mastered across all themes and levels.' },
                    { q: 'Can I reset my progress?', a: 'Yes — email us and we can reset any level back to zero.' },
                    { q: 'What do the colours mean?', a: 'Green segments are mastered words, blue are in revision, and gold is what remains to learn.' },
                    { q: 'Is my data secure?', a: 'Absolutely. Your data is stored securely and never shared with third parties.' },
                ].map(({ q, a }, i) => (
                    <Accordion
                        key={q}
                        disableGutters
                        elevation={0}
                        sx={{
                            background: 'transparent',
                            borderTop: '1px solid rgba(44,26,14,0.07)',
                            '&:last-of-type': { borderBottom: '1px solid rgba(44,26,14,0.07)' },
                            '&::before': { display: 'none' },          // remove MUI default divider
                        }}
                    >
                        <AccordionSummary
                            expandIcon={<ExpandMore sx={{ fontSize: 20, color: 'var(--muted)' }} />}
                            sx={{
                                px: { xs: 2, sm: 3 },
                                py: 0.5,
                                '& .MuiAccordionSummary-content': {
                                    my: 1.2,
                                    fontFamily: 'Jost, sans-serif',
                                    fontSize: '0.88rem',
                                    fontWeight: 500,
                                    color: 'var(--bark)',
                                },
                            }}
                        >
                            {q}
                        </AccordionSummary>
                        <AccordionDetails sx={{ px: { xs: 2, sm: 3 }, pb: 2.5, pt: 0 }}>
                            <Typography sx={{
                                fontFamily: 'Jost, sans-serif',
                                fontSize: '0.82rem',
                                color: 'var(--muted)',
                                lineHeight: 1.7,
                            }}>
                                {a}
                            </Typography>
                        </AccordionDetails>
                    </Accordion>
                ))}
            </Box>
        </Box>
    )
}

/* ─────────────────────────────────────────────
   Page
───────────────────────────────────────────── */
function ProfilePageInner() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const { user, loading: authLoading } = useAuth()
    const [profile, setProfile] = useState<ProfileData | null>(null)
    const [loading, setLoading] = useState(true)
    const [selectedLevelCode, setSelectedLevelCode] = useState<string | null>(null)
    const [activeSection, setActiveSection] = useState<Section>('stats')

    /* sync active tab from URL */
    useEffect(() => {
        const tab = searchParams.get('tab') as Section
        setActiveSection(validTabs.includes(tab) ? tab : 'stats')
    }, [searchParams])

    useEffect(() => {
        if (authLoading) return
        if (!user) {
            router.push('/')
            return
        }
        let cancelled = false
        fetchUserProfile()
            .then((data) => {
                if (!cancelled && data) setProfile(data)
            })
            .catch((err) => {
                if (!cancelled) console.error(err)
            })
            .finally(() => {
                if (!cancelled) setLoading(false)
            })
        return () => { cancelled = true }
    }, [user, authLoading, router])

    const globalLevel = useMemo<LevelStat | null>(() => {
        if (!profile) return null
        return {
            code: 'ALL',
            label: 'All Levels',
            slug: '',
            color: '#b8860b',
            totalThemes: profile.totalThemes,
            completedThemes: profile.completedThemes,
            totalWords: profile.totalWords,
            completedWords: profile.completedWords,
            revisionWords: profile.revisionWords,
            progressPct: profile.totalWords > 0
                ? Math.round((profile.completedWords / profile.totalWords) * 100)
                : 0,
            themes: [],
        }
    }, [profile])

    const chartLevel = useMemo(() => {
        if (!profile) return null
        if (!selectedLevelCode) return globalLevel
        const found = profile.levels.find((l) => l.code === selectedLevelCode)
        return found ?? globalLevel
    }, [profile, selectedLevelCode, globalLevel])

    const handleCardClick = (code: string) => {
        setSelectedLevelCode((prev) => (prev === code ? null : code))
    }

    const handleSignOut = async () => {
        await supabase.auth.signOut()
        router.push('/')
    }

    const handleNavClick = (id: Section) => {
        router.push(`/profile?tab=${id}`)
    }

    if (authLoading || loading) {
        return (
            <>
                <Navbar />
                <Box component="main" sx={{ background: '#faf7f2', minHeight: '100vh' }}>
                    <Box sx={{
                        position: 'relative',
                        pt: { xs: 10, sm: 12 },
                        pb: { xs: 4, sm: 5 },
                        overflow: 'hidden',
                        backgroundImage: 'url(/cartoons/cartooons.avif)',
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                        '&::before': {
                            content: '""',
                            position: 'absolute',
                            inset: 0,
                            background: 'radial-gradient(ellipse at center, rgba(14,46,31,0.55) 0%, rgba(7,26,15,0.85) 70%, rgba(7,26,15,0.95) 100%)',
                        },
                    }}>
                        <Container maxWidth="lg" sx={{ position: 'relative', zIndex: 1 }}>
                            <Skeleton variant="text" width={240} height={48} sx={{ bgcolor: 'rgba(255,255,255,0.08)' }} />
                            <Skeleton variant="text" width={180} height={20} sx={{ bgcolor: 'rgba(255,255,255,0.06)', mt: 1 }} />
                        </Container>
                    </Box>
                    <ProfileSkeleton />
                </Box>
            </>
        )
    }

    if (!profile || !chartLevel) return null

    return (
        <>
            <style>{CSS}</style>
            <Navbar />

            <Box component="main" sx={{ background: '#faf7f2', minHeight: '100vh' }}>
                {/* Banner */}
                <Box sx={{
                    position: 'relative',
                    pt: { xs: 10, sm: 12 },
                    pb: { xs: 4, sm: 5 },
                    overflow: 'hidden',
                    backgroundImage: 'url(/cartoons/cartooons.avif)',
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    '&::before': {
                        content: '""',
                        position: 'absolute',
                        inset: 0,
                        background: 'radial-gradient(ellipse at center, rgba(14,46,31,0.55) 0%, rgba(7,26,15,0.85) 70%, rgba(7,26,15,0.95) 100%)',
                    },
                }}>
                    <Container maxWidth="lg" sx={{ position: 'relative', zIndex: 1 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                            <Avatar sx={{
                                width: { xs: 52, sm: 64 }, height: { xs: 52, sm: 64 },
                                background: 'linear-gradient(135deg, #b8860b, #d4a843)',
                                color: '#0e2e1f',
                                fontFamily: 'Jost, sans-serif',
                                fontWeight: 700,
                                fontSize: { xs: '1.25rem', sm: '1.5rem' },
                            }}>
                                {profile.email.charAt(0).toUpperCase()}
                            </Avatar>
                            <Box>
                                <Typography sx={{
                                    fontFamily: "'EB Garamond', serif",
                                    fontSize: { xs: '1.8rem', sm: '2.4rem', md: '3.2rem' },
                                    fontWeight: 700, color: '#f5ede0', lineHeight: 1.1,
                                    textShadow: '0 2px 16px rgba(0,0,0,0.55)',
                                }}>
                                    {profile.email?.split('@')[0] ?? ''}
                                </Typography>
                                <Typography sx={{
                                    fontFamily: 'Jost, sans-serif',
                                    fontSize: { xs: '0.85rem', sm: '0.95rem', md: '1.05rem' },
                                    color: 'rgba(245,237,224,0.85)', mt: 0.5,
                                    textShadow: '0 1px 10px rgba(0,0,0,0.45)',
                                }}>
                                    Member since {formatDate(profile.joinedAt)}
                                </Typography>
                            </Box>
                        </Box>
                    </Container>
                </Box>

                {/* ── DESKTOP ── */}
                <Box sx={{ display: { xs: 'none', md: 'block' } }}>
                    <Container maxWidth="lg" sx={{ py: 8 }}>
                        <Box sx={{ display: 'flex', gap: 5, alignItems: 'flex-start' }}>
                            {/* Sidebar */}
                            <Box sx={{ width: 220, flexShrink: 0, position: 'sticky', top: 96 }}>
                                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                                    {NAV_ITEMS.map(item => (
                                        <Box
                                            key={item.id}
                                            className={`nav-item${activeSection === item.id ? ' active' : ''}`}
                                            onClick={() => handleNavClick(item.id)}
                                        >
                                            <Box className="nav-icon" sx={{ color: activeSection === item.id ? 'var(--gold)' : 'var(--muted)', display: 'flex', transition: 'color 0.15s' }}>
                                                {item.icon}
                                            </Box>
                                            {item.label}
                                        </Box>
                                    ))}
                                    <Box sx={{ height: '1px', background: 'var(--border)', my: 1 }} />
                                    <Box className="nav-item" onClick={handleSignOut} sx={{ color: '#c0392b !important' }}>
                                        <LogoutOutlined sx={{ fontSize: 18 }} />Sign Out
                                    </Box>
                                </Box>
                            </Box>

                            {/* Content */}
                            <Box sx={{ flex: 1, minWidth: 0 }}>
                                {activeSection === 'stats' && (
                                    <StatsSection
                                        profile={profile}
                                        chartLevel={chartLevel}
                                        selectedLevelCode={selectedLevelCode}
                                        onCardClick={handleCardClick}
                                    />
                                )}
                                {activeSection === 'settings' && <SettingsSection userEmail={profile.email} />}
                                {activeSection === 'support' && <SupportSection />}
                            </Box>
                        </Box>
                    </Container>
                </Box>

                {/* ── MOBILE ── */}
                <Box sx={{ display: { xs: 'block', md: 'none' }, pb: 9 }}>
                    <Container maxWidth="lg" sx={{ py: 3 }}>
                        {activeSection === 'stats' && (
                            <StatsSection
                                profile={profile}
                                chartLevel={chartLevel}
                                selectedLevelCode={selectedLevelCode}
                                onCardClick={handleCardClick}
                            />
                        )}
                        {activeSection === 'settings' && <SettingsSection userEmail={profile.email} />}
                        {activeSection === 'support' && <SupportSection />}
                    </Container>

                    {/* Fixed bottom tab bar */}
                    <Box sx={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 100, background: '#fff', borderTop: '1px solid var(--border)', display: 'flex', boxShadow: '0 -4px 20px rgba(44,26,14,0.08)' }}>
                        {NAV_ITEMS.map(item => (
                            <Box
                                key={item.id}
                                component="button"
                                className={`mobile-tab${activeSection === item.id ? ' active' : ''}`}
                                onClick={() => handleNavClick(item.id)}
                            >
                                <Box sx={{ display: 'flex', color: 'inherit' }}>{item.icon}</Box>
                                {item.label}
                            </Box>
                        ))}
                        <Box component="button" className="mobile-tab signout" onClick={handleSignOut}>
                            <Box sx={{ display: 'flex', color: 'inherit' }}><LogoutOutlined sx={{ fontSize: 18 }} /></Box>
                            Sign Out
                        </Box>
                    </Box>
                </Box>
            </Box>
        </>
    )
}

export default function ProfilePage() {
    return (
        <Suspense>
            <ProfilePageInner />
        </Suspense>
    )
}