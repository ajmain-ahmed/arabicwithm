'use client'

import { DarkModeOutlined, LightModeOutlined, MenuOutlined, Person } from '@mui/icons-material'
import { AppBar, Avatar, Box, Button, Container, IconButton, Toolbar, Tooltip, Typography, useMediaQuery } from '@mui/material'
import { useTheme } from '@mui/material/styles'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
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
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'))
    const router = useRouter()
    const { user } = useAuth()
    const { mode, toggleColorMode } = useColorMode()
    const isLoggedIn = Boolean(user)

    const [drawerOpen, setDrawerOpen] = useState(false)
    const [contactOpen, setContactOpen] = useState(false)
    const [authDialogOpen, setAuthDialogOpen] = useState(false)
    const [authDialogMode, setAuthDialogMode] = useState<'register' | 'signin'>('signin')
    const [userMenuAnchor, setUserMenuAnchor] = useState<null | HTMLElement>(null)

    useEffect(() => {
        hasAnimated = true
    }, [])

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
                    background: 'var(--awm-white)',
                    backdropFilter: 'blur(16px)',
                    borderBottom: '1px solid color-mix(in srgb, var(--awm-gold) 15%, transparent)',
                    boxShadow: '0 4px 24px color-mix(in srgb, var(--awm-bark) 8%, transparent)',
                    zIndex: 1200,
                }}
            >
                <Container maxWidth="xl">
                    <Toolbar disableGutters sx={{ py: { xs: 0.5, md: 1 }, minHeight: { xs: 56, md: 64 } }}>
                        {isMobile ? (
                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                                <IconButton onClick={() => setDrawerOpen(true)} sx={{ p: 0.75, color: 'var(--awm-forest)' }} aria-label="Open menu">
                                    <MenuOutlined sx={{ fontSize: 21 }} />
                                </IconButton>

                                <BrandLogo isMobile={isMobile} onClick={handleBrandClick} shouldAnimate={!hasAnimated} />

                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.25 }}>
                                    <IconButton onClick={toggleColorMode} sx={{ p: 0.65, color: 'var(--awm-forest)' }} aria-label={`Switch to ${mode === 'dark' ? 'light' : 'dark'} mode`}>
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
                                                    color: '#0e2e1f',
                                                    fontFamily: 'var(--font-sans)',
                                                    fontWeight: 700,
                                                    fontSize: '0.85rem',
                                                }}
                                            >
                                                {userInitial}
                                            </Avatar>
                                        </IconButton>
                                    ) : (
                                        <IconButton onClick={openSignIn} sx={{ p: 0.75, color: 'var(--awm-forest)' }} aria-label="Sign in">
                                            <Person sx={{ fontSize: 21 }} />
                                        </IconButton>
                                    )}
                                </Box>
                            </Box>
                        ) : (
                            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', width: '100%', alignItems: 'center' }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                    {NAV_ITEMS.map((item) => (
                                        <Link key={item} href={NAV_ROUTES[item]} style={{ color: 'inherit', textDecoration: 'none' }}>
                                            <Typography
                                                className="nav-link"
                                                variant="body2"
                                                sx={{
                                                    fontWeight: 500,
                                                    letterSpacing: '0.06em',
                                                    color: 'var(--awm-forest)',
                                                    cursor: 'pointer',
                                                    py: 2,
                                                }}
                                            >
                                                {item}
                                            </Typography>
                                        </Link>
                                    ))}
                                </Box>

                                <BrandLogo isMobile={isMobile} onClick={handleBrandClick} shouldAnimate={!hasAnimated} />

                                <Box sx={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 0.75 }}>
                                    <Tooltip title={mode === 'dark' ? 'Use light mode' : 'Use dark mode'}>
                                        <IconButton onClick={toggleColorMode} sx={{ color: 'var(--awm-forest)' }} aria-label={`Switch to ${mode === 'dark' ? 'light' : 'dark'} mode`}>
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
                                                    color: 'var(--awm-forest)',
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
                                                borderColor: 'color-mix(in srgb, var(--awm-gold) 40%, transparent)',
                                                color: 'var(--awm-forest)',
                                                fontFamily: 'var(--font-sans)',
                                                fontWeight: 500,
                                                fontSize: '0.8rem',
                                                textTransform: 'none',
                                                borderRadius: 'var(--awm-radius-none)',
                                                px: 1.8,
                                                '&:hover': {
                                                    borderColor: 'var(--awm-gold-light)',
                                                    background: 'color-mix(in srgb, var(--awm-gold) 6%, transparent)',
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
