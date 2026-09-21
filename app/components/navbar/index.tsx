'use client'

import { DarkModeOutlined, LightModeOutlined, MenuOutlined, Person } from '@mui/icons-material'
import { AppBar, Avatar, Box, Button, Container, IconButton, Toolbar, Tooltip, Typography, useMediaQuery } from '@mui/material'
import { useTheme } from '@mui/material/styles'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { useAuth } from '@/app/AuthContext'
import { useColorMode } from '@/app/components/ThemeProvider'
import { supabase } from '@/app/lib/supabase/client'
import AuthDialog from '@/app/components/AuthDialog'
import ClientStyles from '@/app/components/ClientStyles'
import BrandLogo from './BrandLogo'
import ContactDialog from './ContactDialog'
import MobileDrawer from './MobileDrawer'
import UserMenu from './UserMenu'
import { NAV_ITEMS, NAV_ROUTES } from './constants'
import { NAV_CSS } from './styles'

let hasAnimated = false

export default function Navbar() {
    const theme = useTheme()
    const isMobile = useMediaQuery(theme.breakpoints.down('md'))
    const router = useRouter()
    const pathname = usePathname()
    const { user } = useAuth()
    const { mode, toggleColorMode } = useColorMode()
    const isLoggedIn = Boolean(user)

    const [drawerOpen, setDrawerOpen] = useState(false)
    const [contactOpen, setContactOpen] = useState(false)
    const [authDialogOpen, setAuthDialogOpen] = useState(false)
    const [authDialogMode, setAuthDialogMode] = useState<'register' | 'signin'>('signin')
    const [userMenuAnchor, setUserMenuAnchor] = useState<null | HTMLElement>(null)
    const [scrolled, setScrolled] = useState(false)

    const supportsOverlay = pathname === '/' || pathname === '/explore' || pathname === '/vocabulary'
    const isOverlay = supportsOverlay && !scrolled && !drawerOpen && !userMenuAnchor && !contactOpen && !authDialogOpen
    const navColor = isOverlay ? '#fff' : 'var(--awm-forest)'

    useEffect(() => {
        hasAnimated = true
    }, [])

    useEffect(() => {
        const target = pathname === '/explore' ? document.getElementById('explore-feed') : window
        const update = () => {
            const scrollTop = target instanceof Window ? target.scrollY : target?.scrollTop ?? 0
            setScrolled(scrollTop > 24)
        }
        update()
        target?.addEventListener('scroll', update, { passive: true })
        return () => target?.removeEventListener('scroll', update)
    }, [pathname])

    useEffect(() => {
        const handler = (event: Event) => {
            const mode = (event as CustomEvent<{ mode?: 'register' | 'signin' }>).detail?.mode
            setAuthDialogMode(mode === 'register' ? 'register' : 'signin')
            setAuthDialogOpen(true)
        }
        window.addEventListener('open-auth-dialog', handler)
        return () => window.removeEventListener('open-auth-dialog', handler)
    }, [])

    const handleLogout = async () => {
        await supabase.auth.signOut()
        window.location.href = '/'
    }

    const safePush = (url: string) => {
        router.push(url)
    }

    const openSignIn = () => {
        setAuthDialogMode('signin')
        setAuthDialogOpen(true)
    }

    const userInitial = user?.email?.charAt(0)?.toUpperCase() ?? 'M'

    const handleBrandClick = () => {
        safePush('/')
        setDrawerOpen(false)
    }

    return (
        <>
            <ClientStyles id="awm-navbar-styles" css={NAV_CSS} />

            <MobileDrawer
                open={drawerOpen}
                onClose={() => setDrawerOpen(false)}
                isLoggedIn={isLoggedIn}
                user={user}
                onAuthOpen={openSignIn}
                onLogout={handleLogout}
                onContactOpen={() => setContactOpen(true)}
                navigate={safePush}
            />

            <ContactDialog open={contactOpen} onClose={() => setContactOpen(false)} />

            <UserMenu
                anchorEl={userMenuAnchor}
                onClose={() => setUserMenuAnchor(null)}
                user={user}
                onLogout={() => {
                    setUserMenuAnchor(null)
                    handleLogout()
                }}
            />

            <AuthDialog key={authDialogMode} open={authDialogOpen} onClose={() => setAuthDialogOpen(false)} initialMode={authDialogMode} />

            <AppBar
                id="main-navbar"
                position="fixed"
                elevation={0}
                sx={{
                    pt: 'env(safe-area-inset-top)',
                    color: navColor,
                    backgroundColor: isOverlay ? 'rgba(5,23,15,0.22)' : 'var(--awm-white)',
                    backdropFilter: isOverlay ? 'blur(6px)' : 'blur(16px)',
                    WebkitBackdropFilter: isOverlay ? 'blur(6px)' : 'blur(16px)',
                    borderBottom: isOverlay ? '1px solid rgba(255,255,255,0.12)' : '1px solid color-mix(in srgb, var(--awm-gold) 15%, transparent)',
                    boxShadow: isOverlay ? 'none' : '0 4px 24px color-mix(in srgb, var(--awm-bark) 8%, transparent)',
                    zIndex: 1200,
                    transition: 'background-color .25s ease, backdrop-filter .25s ease, border-color .25s ease, box-shadow .25s ease, color .25s ease',
                    '@media (prefers-reduced-motion: reduce)': { transition: 'none' },
                }}
            >
                <Container maxWidth="xl">
                    <Toolbar disableGutters sx={{ py: { xs: 0.5, md: 1 }, minHeight: { xs: 56, md: 64 } }}>
                        {isMobile ? (
                            <Box sx={{ display: 'grid', gridTemplateColumns: '72px minmax(0, 1fr) 72px', alignItems: 'center', width: '100%' }}>
                                <IconButton onClick={() => setDrawerOpen(true)} sx={{ p: 0.75, color: navColor, transition: 'color .25s ease', justifySelf: 'start' }} aria-label="Open menu">
                                    <MenuOutlined sx={{ fontSize: 21 }} />
                                </IconButton>

                                <Box sx={{ minWidth: 0, display: 'flex', justifyContent: 'center' }}>
                                    <BrandLogo isMobile={isMobile} onClick={handleBrandClick} shouldAnimate={!hasAnimated} overlay={isOverlay} />
                                </Box>

                                <Box sx={{ display: 'flex', alignItems: 'center', justifySelf: 'end', gap: 0.25 }}>
                                    <IconButton onClick={toggleColorMode} sx={{ p: 0.65, color: navColor, transition: 'color .25s ease' }} aria-label={`Switch to ${mode === 'dark' ? 'light' : 'dark'} mode`}>
                                        {mode === 'dark' ? <LightModeOutlined sx={{ fontSize: 20 }} /> : <DarkModeOutlined sx={{ fontSize: 20 }} />}
                                    </IconButton>
                                    {isLoggedIn ? (
                                        <IconButton
                                            onClick={(e) => setUserMenuAnchor(e.currentTarget)}
                                            size="small"
                                            sx={{ position: 'relative' }}
                                            aria-label="Open user menu"
                                        >
                                            <Avatar
                                                sx={{
                                                    width: 28,
                                                    height: 28,
                                                    background: 'linear-gradient(135deg, var(--awm-gold), var(--awm-gold-light))',
                                                    color: '#fff',
                                                    fontFamily: 'var(--font-sans)',
                                                    fontWeight: 700,
                                                    fontSize: '0.85rem',
                                                }}
                                            >
                                                {userInitial}
                                            </Avatar>
                                        </IconButton>
                                    ) : (
                                        <IconButton onClick={openSignIn} sx={{ p: 0.75, color: navColor, transition: 'color .25s ease' }} aria-label="Sign in">
                                            <Person sx={{ fontSize: 21 }} />
                                        </IconButton>
                                    )}
                                </Box>
                            </Box>
                        ) : (
                            <Box sx={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto minmax(0, 1fr)', width: '100%', alignItems: 'center' }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: { md: 2.5, lg: 4 } }}>
                                    {NAV_ITEMS.map((item) => (
                                        <Link key={item} href={NAV_ROUTES[item]} style={{ color: 'inherit', textDecoration: 'none' }}>
                                            <Typography
                                                className="nav-link"
                                                variant="body2"
                                                sx={{
                                                    fontWeight: 500,
                                                    letterSpacing: '0.06em',
                                                    fontSize: { md: '0.8rem', lg: '0.875rem' },
                                                    whiteSpace: 'nowrap',
                                                    color: navColor,
                                                    cursor: 'pointer',
                                                    py: 2,
                                                }}
                                            >
                                                {item}
                                            </Typography>
                                        </Link>
                                    ))}
                                </Box>

                                <BrandLogo isMobile={isMobile} onClick={handleBrandClick} shouldAnimate={!hasAnimated} overlay={isOverlay} />

                                <Box sx={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 0.75 }}>
                                    <Tooltip title={mode === 'dark' ? 'Use light mode' : 'Use dark mode'}>
                                        <IconButton onClick={toggleColorMode} sx={{ color: navColor, transition: 'color .25s ease' }} aria-label={`Switch to ${mode === 'dark' ? 'light' : 'dark'} mode`}>
                                            {mode === 'dark' ? <LightModeOutlined /> : <DarkModeOutlined />}
                                        </IconButton>
                                    </Tooltip>
                                    {isLoggedIn ? (
                                        <IconButton
                                            onClick={(e) => setUserMenuAnchor(e.currentTarget)}
                                            size="small"
                                            aria-label="Open user menu"
                                        >
                                            <Avatar
                                                sx={{
                                                    width: 32,
                                                    height: 32,
                                                    background: 'linear-gradient(135deg, var(--awm-gold), var(--awm-gold-light))',
                                                    color: '#fff',
                                                    fontFamily: 'var(--font-sans)',
                                                    fontWeight: 700,
                                                    fontSize: '0.85rem',
                                                }}
                                            >
                                                {userInitial}
                                            </Avatar>
                                        </IconButton>
                                    ) : (
                                        <Button
                                            onClick={openSignIn}
                                            variant="outlined"
                                            size="small"
                                            startIcon={<Person sx={{ fontSize: 16 }} />}
                                            sx={{
                                                borderColor: isOverlay ? 'rgba(255,255,255,.58)' : 'color-mix(in srgb, var(--awm-gold) 40%, transparent)',
                                                color: navColor,
                                                fontFamily: 'var(--font-sans)',
                                                fontWeight: 500,
                                                fontSize: '0.8rem',
                                                textTransform: 'none',
                                                borderRadius: 'var(--awm-radius-none)',
                                                px: 1.8,
                                                '&:hover': {
                                                    borderColor: 'var(--awm-gold-light)',
                                                    background: isOverlay ? 'rgba(255,255,255,.1)' : 'color-mix(in srgb, var(--awm-gold) 6%, transparent)',
                                                },
                                            }}
                                        >
                                            Sign In
                                        </Button>
                                    )}
                                </Box>
                            </Box>
                        )}
                    </Toolbar>
                </Container>

                {isMobile && isLoggedIn && <Box sx={{ height: 2, background: 'color-mix(in srgb, var(--awm-gold) 15%, transparent)' }} />}
            </AppBar>
        </>
    )
}
