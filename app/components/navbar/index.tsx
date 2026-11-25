'use client'
import {UiText} from '@/app/components/WebsiteLocaleProvider'


import { returnToPublicHome } from '@/app/lib/publicHome'
import { AdminPanelSettings, DarkModeOutlined, LightModeOutlined, MenuOutlined, Person } from '@mui/icons-material'
import { AppBar, Box, Button, Container, IconButton, Toolbar, Tooltip, Typography, useMediaQuery } from '@mui/material'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useAuth } from '@/app/AuthContext'
import { useColorMode } from '@/app/components/ThemeProvider'
import { useAccountAccess } from '@/app/lib/useAccountAccess'
import { fetchMyDisplayName } from '@/app/actions/profiles'
// The supabase client is imported dynamically inside handleLogout (interaction
// time) so supabase-js stays out of the initial bundle. The auth dialog is
// mounted on first open for the same reason — it pulls supabase-js too.
import ClientStyles from '@/app/components/ClientStyles'
import BrandLogo from './BrandLogo'
import WebsiteLanguageButton from './WebsiteLanguageButton'
import {useWebsiteLocale} from '@/app/components/WebsiteLocaleProvider'
import { usePremiumStatus } from '@/app/lib/usePremiumStatus'
import UserMenu from './UserMenu'
import UserAvatar from './UserAvatar'
import MemberActions from './MemberActions'
import { NAV_ITEMS, NAV_ROUTES } from './constants'
import { NAV_CSS } from './styles'

let hasAnimated = false

/* Mounted on first open (see render site): keeps supabase-js, which the
   dialog imports, out of the anonymous first-load path. */
const AuthDialog = dynamic(() => import('@/app/components/AuthDialog'), { ssr: false })
/* The mobile drawer is interaction-only; its chunk loads on first open. */
const MobileDrawerLazy = dynamic(() => import('./MobileDrawer'), { ssr: false })

export default function Navbar() {
 const {t:awmT}=useWebsiteLocale()

    const {t}=useWebsiteLocale()
    // Only optional account chrome depends on this client hint; layout is CSS-owned.
    const isMobile = useMediaQuery('(max-width:899.95px)')
    const router = useRouter()
    const pathname = usePathname()
    const { user } = useAuth()
    const membership = usePremiumStatus(user?.id)
    const activeMember = Boolean(membership?.premium || membership?.admin)
    const { mode, toggleColorMode } = useColorMode()
    const isLoggedIn = Boolean(user)

    const [drawerOpen, setDrawerOpen] = useState(false)
    const [drawerMounted, setDrawerMounted] = useState(false)
    const [authDialogOpen, setAuthDialogOpen] = useState(false)
    const [authDialogPurpose,setAuthDialogPurpose]=useState<string|undefined>()
    const [authDialogMode, setAuthDialogMode] = useState<'register' | 'signin'>('signin')
    const [userMenuAnchor, setUserMenuAnchor] = useState<null | HTMLElement>(null)
    const navbarRef = useRef<HTMLElement>(null)
    const { isAdmin, isReviewer } = useAccountAccess()

    const showAdminLink = isAdmin && pathname !== '/'

    /* / and /explore use the dark overlay treatment in BOTH themes — the
       navbar is always presented in its dark-mode appearance. */
    const supportsOverlay = pathname === '/' || pathname === '/explore'
    const isOverlay = supportsOverlay && !drawerOpen && !userMenuAnchor && !authDialogOpen
    const navColor = isOverlay ? '#fff' : '#f5ede0'

    useEffect(() => {
        hasAnimated = true
    }, [])

    useLayoutEffect(() => {
        const navbar = navbarRef.current
        if (!navbar) return
        const measure = () => {
            const height = navbar.getBoundingClientRect().height
            if (height > 0) document.documentElement.style.setProperty('--awm-navbar-height', `${height}px`)
        }
        measure()
        const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(measure)
        observer?.observe(navbar, { box: 'border-box' })
        window.addEventListener('resize', measure)
        return () => { observer?.disconnect(); window.removeEventListener('resize', measure); document.documentElement.style.removeProperty('--awm-navbar-height') }
    }, [])

    useEffect(() => {
        const handler = (event: Event) => {
            const detail=(event as CustomEvent<{mode?:'register'|'signin';purpose?:string}>).detail
            const mode=detail?.mode
            setAuthDialogPurpose(typeof detail?.purpose==='string'?detail.purpose.slice(0,120):undefined)
            setAuthDialogMode(mode === 'register' ? 'register' : 'signin')
            setAuthDialogOpen(true)
        }
        window.addEventListener('open-auth-dialog', handler)
        return () => window.removeEventListener('open-auth-dialog', handler)
    }, [])

    const handleLogout = async () => {
        // Interaction-time only: keep supabase-js out of the initial bundle.
        const { supabase } = await import('@/app/lib/supabase/client')
        await supabase.auth.signOut({ scope: 'local' })
        returnToPublicHome()
    }

    const safePush = (url: string) => {
        router.push(url)
    }

    const openSignIn = () => {
        setAuthDialogPurpose(undefined)
        setAuthDialogMode('signin')
        setAuthDialogOpen(true)
    }

    /* The saved profile display name is the source of truth for chrome like
       the menu header and avatar initial; metadata/email are only fallbacks
       for accounts that have never saved a profile. */
    const [savedName, setSavedName] = useState<string | null>(null)
    useEffect(() => {
        let active = true
        if (!user?.id) {
            queueMicrotask(() => { if (active) setSavedName(null) })
            return () => { active = false }
        }
        void fetchMyDisplayName()
            .then(name => { if (active) setSavedName(name) })
            .catch(() => { if (active) setSavedName(null) })
        return () => { active = false }
    }, [user?.id])
    const resolvedName = savedName ?? (user?.user_metadata?.full_name ? String(user.user_metadata.full_name) : undefined) ?? user?.email?.split('@')[0] ?? ''

    const handleBrandClick = () => {
        safePush('/')
        setDrawerOpen(false)
    }

    return (
        <>
            <ClientStyles id="awm-navbar-styles" css={NAV_CSS} />

            {/* Interaction-only: defer the drawer's chunk until first use, then
                KEEP it mounted and drive it with `open` so MUI's slide/close
                transitions actually run (mounting already-open skips them). */}
            {drawerMounted && <MobileDrawerLazy
                open={drawerOpen}
                onClose={() => setDrawerOpen(false)}
                isLoggedIn={isLoggedIn}
                user={user}
                isAdmin={isAdmin}
                isReviewer={isReviewer}
                onAuthOpen={openSignIn}
                onLogout={() => {
                    setDrawerOpen(false)
                    handleLogout()
                }}
                navigate={safePush}
            />}


            <UserMenu
                anchorEl={userMenuAnchor}
                onClose={() => setUserMenuAnchor(null)}
                user={user}
                displayName={resolvedName}
                isAdmin={isAdmin}
                isReviewer={isReviewer}
                onLogout={() => {
                    setUserMenuAnchor(null)
                    handleLogout()
                }}
            />

            {authDialogOpen && <AuthDialog key={authDialogMode} open onClose={() => setAuthDialogOpen(false)} initialMode={authDialogMode} purpose={authDialogPurpose} />}

            <AppBar
                ref={navbarRef}
                id="main-navbar"
                position="fixed"
                elevation={0}
                sx={{
                    pt: 'env(safe-area-inset-top)',
                    color: navColor,
                    backgroundColor: isOverlay ? (pathname === '/explore' ? 'rgb(5,23,15)' : 'rgba(5,23,15,0.22)') : '#141416',
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
                        {/* CSS selects the correct header before hydration. A server
                            desktop default put the Home logo over Watch on phones. */}
                            <Box data-navbar-mobile sx={{ display: { xs: 'grid', md: 'none' }, gridTemplateColumns: 'minmax(0, 1fr) auto minmax(0, 1fr)', alignItems: 'center', width: '100%' }}>
                                {/* Equal 1fr flanks pin the brand to the true viewport
                                    center: the hamburger and the icon pair have different
                                    widths, so auto columns hugging their content shoved
                                    the logo left of center on signed-out mobile. */}
                                <Box sx={{display:'flex',alignItems:'center',justifySelf:'start'}}>
                                <IconButton
                                    onPointerEnter={() => void import('./MobileDrawer')}
                                    onTouchStart={() => void import('./MobileDrawer')}
                                    onClick={() => { setDrawerMounted(true); setDrawerOpen(true) }}
                                    sx={{ width: 44, height: 44, p: 0.75, color: navColor, transition: 'color .25s ease', justifySelf: 'start' }}
                                    aria-label={t("Open menu")}
                                >
                                    <MenuOutlined sx={{ fontSize: 21 }} />
                                </IconButton>
                                <WebsiteLanguageButton />
                                </Box>

                                <Box sx={{ minWidth: 0, display: 'flex', justifyContent: 'center', pl: 0 }}>
                                    <BrandLogo activeMember={activeMember} isMobile onClick={handleBrandClick} shouldAnimate={!hasAnimated} overlay={isOverlay} />
                                </Box>

                                <Box sx={{ display: 'flex', alignItems: 'center', justifySelf: 'end', gap: 0.25 }}>
                                    <IconButton onClick={toggleColorMode} sx={{ width: 44, height: 44, p: 0.65, color: navColor, transition: 'color .25s ease' }} aria-label={t(`Switch to ${mode === 'dark' ? 'light' : 'dark'} mode`)}>
                                        {mode === 'dark' ? <LightModeOutlined sx={{ fontSize: 20 }} /> : <DarkModeOutlined sx={{ fontSize: 20 }} />}
                                    </IconButton>
                                    {/* Signed-in mobile users reach profile/settings/logout
                                        from the drawer; the bar keeps only the theme toggle. */}
                                    {!isLoggedIn && (
                                        <IconButton onClick={openSignIn} sx={{ width: 44, height: 44, p: 0.75, color: navColor, transition: 'color .25s ease' }} aria-label={awmT("Sign in")}>
                                            <Person sx={{ fontSize: 21 }} />
                                        </IconButton>
                                    )}
                                </Box>
                            </Box>
                            <Box data-navbar-desktop sx={{ display: { xs: 'none', md: 'grid' }, gridTemplateColumns: 'minmax(0, 1fr) auto minmax(0, 1fr)', width: '100%', alignItems: 'center' }}>
                                <Box component="nav" aria-label={awmT("Primary navigation")} sx={{ display: 'flex', alignItems: 'center', gap: { md: 2.5, lg: 4 } }}>
                                    {NAV_ITEMS.map((item) => {
                                      // Watch must still open when a cached/pending RSC transition stalls.
                                      const Destination = item === "Watch" ? 'a' : Link
                                      return (
                                        <Destination key={item} href={NAV_ROUTES[item]} style={{ color: 'inherit', textDecoration: 'none' }}>
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
                                                {t(item)}
                                            </Typography>
                                        </Destination>
                                      )
                                    })}
                                </Box>

                                <BrandLogo activeMember={activeMember} isMobile={false} onClick={handleBrandClick} shouldAnimate={!hasAnimated} overlay={isOverlay} />

                                <Box sx={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 1.25 }}>
                                    <WebsiteLanguageButton />
                                    {isLoggedIn && showAdminLink && <Button component={Link} href="/admin/users" startIcon={<AdminPanelSettings />} sx={{ color: navColor, textTransform: 'none', fontWeight: 600, whiteSpace: 'nowrap' }}><UiText>{"Admin"}</UiText></Button>}
                                    <Tooltip title={t(mode === 'dark' ? "Use light mode" : "Use dark mode")}>
                                        <IconButton onClick={toggleColorMode} sx={{ color: navColor, transition: 'color .25s ease' }} aria-label={t(`Switch to ${mode === 'dark' ? 'light' : 'dark'} mode`)}>
                                            {mode === 'dark' ? <LightModeOutlined /> : <DarkModeOutlined />}
                                        </IconButton>
                                    </Tooltip>
                                    {isLoggedIn && !isMobile && <MemberActions />}
                                    {isLoggedIn ? (
                                        !isMobile && <IconButton
                                            onClick={(e) => setUserMenuAnchor(e.currentTarget)}
                                            size="small"
                                            aria-label={t("Open user menu")}
                                        >
                                            <UserAvatar name={resolvedName} metadata={user?.user_metadata} />
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
                                                columnGap: 1,
                                                '& .MuiButton-startIcon': { margin: 0 },
                                                '&:hover': {
                                                    borderColor: 'var(--awm-gold-light)',
                                                    background: isOverlay ? 'rgba(255,255,255,.1)' : 'color-mix(in srgb, var(--awm-gold) 6%, transparent)',
                                                },
                                            }}
                                        >
                                            {t("Sign In")}
                                        </Button>
                                    )}
                                </Box>
                            </Box>
                    </Toolbar>
                </Container>

                {isLoggedIn && <Box sx={{ display: { xs: 'block', md: 'none' }, height: 2, background: 'color-mix(in srgb, var(--awm-gold) 15%, transparent)' }} />}
            </AppBar>
        </>
    )
}
