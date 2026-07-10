'use client'

import { MenuOutlined, Person } from '@mui/icons-material'
import { AppBar, Avatar, Box, Button, Container, IconButton, Toolbar, Typography, useMediaQuery } from '@mui/material'
import { useTheme } from '@mui/material/styles'
import { useRouter } from 'next/navigation'
import React, { useCallback, useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useAuth } from '@/app/AuthContext'
import { supabase } from '@/app/lib/supabase/client'
import AuthDialog from '@/app/components/AuthDialog'
import BrandLogo from './BrandLogo'
import ContactDialog from './ContactDialog'
import MegaMenuGrid from './MegaMenuGrid'
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
    const isLoggedIn = Boolean(user)

    const [drawerOpen, setDrawerOpen] = useState(false)
    const [contactOpen, setContactOpen] = useState(false)
    const [authDialogOpen, setAuthDialogOpen] = useState(false)
    const [learnMenuOpen, setLearnMenuOpen] = useState(false)
    const [userMenuAnchor, setUserMenuAnchor] = useState<null | HTMLElement>(null)

    const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
    const menuContainerRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        hasAnimated = true
    }, [])

    useEffect(() => {
        return () => {
            if (closeTimerRef.current) clearTimeout(closeTimerRef.current)
        }
    }, [])

    useEffect(() => {
        const handler = () => setAuthDialogOpen(true)
        window.addEventListener('open-auth-dialog', handler)
        return () => window.removeEventListener('open-auth-dialog', handler)
    }, [])

    const scheduleClose = useCallback(() => {
        if (closeTimerRef.current) clearTimeout(closeTimerRef.current)
        closeTimerRef.current = setTimeout(() => {
            setLearnMenuOpen(false)
        }, 150)
    }, [])

    const cancelClose = useCallback(() => {
        if (closeTimerRef.current) clearTimeout(closeTimerRef.current)
    }, [])

    const handleLogout = async () => {
        await supabase.auth.signOut()
        window.location.href = '/'
    }

    const safePush = (url: string) => {
        router.push(url)
    }

    const userInitial = user?.email?.charAt(0)?.toUpperCase() ?? 'M'

    const closeAll = () => {
        setLearnMenuOpen(false)
        setDrawerOpen(false)
    }

    const handleBrandClick = () => {
        safePush('/')
        setDrawerOpen(false)
        setLearnMenuOpen(false)
    }

    return (
        <>
            <style>{NAV_CSS}</style>

            <MobileDrawer
                open={drawerOpen}
                onClose={() => setDrawerOpen(false)}
                isLoggedIn={isLoggedIn}
                user={user}
                onAuthOpen={() => setAuthDialogOpen(true)}
                onLogout={handleLogout}
                onContactOpen={() => setContactOpen(true)}
                navigate={safePush}
                closeAll={closeAll}
            />

            <ContactDialog open={contactOpen} onClose={() => setContactOpen(false)} />

            <UserMenu
                anchorEl={userMenuAnchor}
                onClose={() => setUserMenuAnchor(null)}
                user={user}
                onProfile={() => {
                    setUserMenuAnchor(null)
                    safePush('/profile')
                }}
                onLogout={() => {
                    setUserMenuAnchor(null)
                    handleLogout()
                }}
            />

            <AuthDialog open={authDialogOpen} onClose={() => setAuthDialogOpen(false)} />

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
                                <IconButton onClick={() => setDrawerOpen(true)} sx={{ color: 'var(--awm-forest)' }} aria-label="Open menu">
                                    <MenuOutlined />
                                </IconButton>

                                <BrandLogo isMobile={isMobile} onClick={handleBrandClick} shouldAnimate={!hasAnimated} />

                                {isLoggedIn ? (
                                    <IconButton
                                        onClick={(e) => setUserMenuAnchor(e.currentTarget)}
                                        size="small"
                                        sx={{ position: 'relative' }}
                                        aria-label="Open user menu"
                                    >
                                        <Avatar
                                            sx={{
                                                width: 30,
                                                height: 30,
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
                                    <IconButton onClick={() => setAuthDialogOpen(true)} sx={{ color: 'var(--awm-forest)' }} aria-label="Sign in">
                                        <Person />
                                    </IconButton>
                                )}
                            </Box>
                        ) : (
                            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', width: '100%', alignItems: 'center' }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                    {NAV_ITEMS.map((item) => (
                                        <Box key={item} sx={{ position: 'relative' }}>
                                            {item === 'Learn' ? (
                                                <Box
                                                    className="learn-trigger"
                                                    onMouseEnter={() => {
                                                        cancelClose()
                                                        setLearnMenuOpen(true)
                                                    }}
                                                    onMouseLeave={scheduleClose}
                                                >
                                                    <Typography
                                                        className="nav-link"
                                                        variant="body2"
                                                        sx={{
                                                            fontWeight: 500,
                                                            letterSpacing: '0.06em',
                                                            color: 'var(--awm-forest)',
                                                            cursor: 'pointer',
                                                            py: 2,
                                                            display: 'inline-block',
                                                        }}
                                                    >
                                                        {item}
                                                    </Typography>
                                                </Box>
                                            ) : (
                                                <Typography
                                                    className="nav-link"
                                                    variant="body2"
                                                    onClick={() => (item === 'Contact' ? setContactOpen(true) : safePush(NAV_ROUTES[item]))}
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
                                            )}
                                        </Box>
                                    ))}
                                </Box>

                                <BrandLogo isMobile={isMobile} onClick={handleBrandClick} shouldAnimate={!hasAnimated} />

                                <Box sx={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
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
                                            onClick={() => setAuthDialogOpen(true)}
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

                <AnimatePresence>
                    {learnMenuOpen && !isMobile && (
                        <motion.div
                            ref={menuContainerRef}
                            initial={{ opacity: 0, y: -20, height: 0 }}
                            animate={{ opacity: 1, y: 0, height: 'auto' }}
                            exit={{ opacity: 0, y: -10, height: 0 }}
                            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1], opacity: { duration: 0.2 } }}
                            onMouseEnter={cancelClose}
                            onMouseLeave={scheduleClose}
                            style={{
                                position: 'absolute',
                                top: '100%',
                                left: 0,
                                right: 0,
                                background: 'color-mix(in srgb, var(--awm-white) 98%, transparent)',
                                backdropFilter: 'blur(20px)',
                                borderBottom: '1px solid color-mix(in srgb, var(--awm-gold) 15%, transparent)',
                                boxShadow: '0 20px 40px color-mix(in srgb, var(--awm-bark) 8%, transparent)',
                                zIndex: 1199,
                                overflow: 'hidden',
                                transformOrigin: 'top',
                            }}
                        >
                            <Container maxWidth="xl">
                                <MegaMenuGrid navigate={safePush} closeAll={closeAll} />
                            </Container>
                        </motion.div>
                    )}
                </AnimatePresence>

                {isMobile && isLoggedIn && <Box sx={{ height: 2, background: 'color-mix(in srgb, var(--awm-gold) 15%, transparent)' }} />}
            </AppBar>
        </>
    )
}
