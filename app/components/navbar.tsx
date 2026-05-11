'use client'

import {
    AccountCircle, Close, EmailSharp, HelpSharp, LogoutSharp,
    ManageSearchSharp, MenuOutlined, Person,
    VolunteerActivismSharp,
    ExpandMore, ExpandLess, School, Movie, MenuBook, LibraryBooks,
    InfoOutlined,
} from "@mui/icons-material";
import {
    AppBar, Avatar, Box, Button, Container, Dialog,
    Drawer, IconButton, List, ListItem, ListItemButton,
    ListItemIcon, ListItemText, Toolbar, Typography,
    Collapse, useMediaQuery,
    Menu,
    MenuItem
} from "@mui/material";
import { useTheme } from '@mui/material/styles';
import React, { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence, Variants } from 'framer-motion';
import { useAuth } from '../AuthContext';
import { supabase } from '../lib/supabase/client';
import AuthDialog from './AuthDialog';

const NAV_ITEMS = ['Learn', 'About', 'Contact'] as const;
const NAV_ROUTES: Record<string, string> = {
    'About': '/about',
    'Contact': '/contact',
};

const CARTOON_SLUG_MAP: Record<string, string> = {
    'Spongebob': 'spongebob',
    'Amazing World of Gumball': 'amazing-world-of-gumball',
    'Dragonball Z': 'dragonball-z',
    'Yu-Gi-Oh!': 'yu-gi-oh',
    'TMNT': 'tmnt',
    'Others': 'others',
};

const MOBILE_SECONDARY = ['FAQ'] as const;

const MEGA_MENU_ITEMS = [
    {
        header: 'Study',
        icon: <School sx={{ fontSize: 20, color: 'var(--forest)' }} />,
        items: ['Beginner', 'A1', 'A2', 'B1', 'B2', 'C1', 'C2', 'Revision']
    },
    {
        header: 'Cartoons',
        icon: <Movie sx={{ fontSize: 20, color: 'var(--forest)' }} />,
        items: ['Spongebob', 'Amazing World of Gumball', 'Dragonball Z', 'Yu-Gi-Oh!', 'TMNT', 'Others']
    },
    {
        header: 'Literature',
        icon: <MenuBook sx={{ fontSize: 20, color: 'var(--forest)' }} />,
        items: ['Visual', 'Written']
    },
    {
        header: 'Stories',
        icon: <LibraryBooks sx={{ fontSize: 20, color: 'var(--forest)' }} />,
        items: ['The Girl Who Escaped', 'The Turn of Success', 'The Sanctity of Marriage', 'Yusuf and the Stolen Necklace', 'The Recurring Dream', 'Seeking Advice', 'Late for School', 'Others']
    }
];

const STUDY_LEVEL_MAP: Record<string, string> = {
    'Beginner': 'Beginner',
    'A1': 'Apprentice',
    'A2': 'Competent',
    'B1': 'Proficient',
    'B2': 'Highly-Proficient',
    'C1': 'Expert',
    'C2': 'Native',
};

const NAV_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Cookie&family=EB+Garamond:ital,wght@0,700;1,700&family=Jost:wght@300;400;500;600&display=swap');
  
  :root {
    --sand:   #f5ede0;
    --cream:  #faf7f2;
    --bark:   #2c1a0e;
    --forest: #0e2e1f;
    --gold:   #b8860b;
    --gold-lt:#d4a843;
    --muted:  #7a6e65;
  }
  
  .nav-link {
    position: relative;
    cursor: pointer;
    padding-bottom: 2px;
  }
  .nav-link::after {
    content: '';
    position: absolute;
    bottom: 0; left: 0;
    width: 0; height: 1px;
    background: var(--gold);
    transition: width 0.25s cubic-bezier(.22,1,.36,1);
  }
  .nav-link:hover::after { width: 100%; }
  
  .mobile-list-btn:hover { background: rgba(184,134,11,0.06) !important; }
  
  .mega-menu-item {
    position: relative;
    cursor: pointer;
    transition: all 0.2s ease;
    padding: 4px 0;
  }
  .mega-menu-item:hover {
    color: var(--forest);
    transform: translateX(4px);
  }
  
  .learn-trigger {
    position: relative;
  }
  .learn-trigger::before {
    content: '';
    position: absolute;
    bottom: -20px;
    left: 0;
    right: 0;
    height: 20px;
    background: transparent;
    z-index: 1201;
  }

  .cartoon-header-link {
    cursor: pointer;
    transition: color 0.2s ease;
  }
  .cartoon-header-link:hover {
    color: var(--gold) !important;
  }
`;

export default function Navbar() {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
    const router = useRouter();
    const { user, loading: authLoading } = useAuth();
    const isLoggedIn = Boolean(user);

    const hasAnimatedRef = useRef(false);

    const [drawerOpen, setDrawerOpen] = useState(false);
    const [contactOpen, setContactOpen] = useState(false);
    const [authDialogOpen, setAuthDialogOpen] = useState(false);
    const [learnMenuOpen, setLearnMenuOpen] = useState(false);

    const [mobileOpenSections, setMobileOpenSections] = useState<Record<string, boolean>>({
        Study: false,
        Cartoons: false,
        Literature: false,
        Stories: false,
    });

    const [userMenuAnchor, setUserMenuAnchor] = useState<null | HTMLElement>(null);

    const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const menuContainerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        hasAnimatedRef.current = true;
    }, []);

    useEffect(() => {
        return () => {
            if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
        };
    }, []);

    const scheduleClose = useCallback(() => {
        if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
        closeTimerRef.current = setTimeout(() => {
            setLearnMenuOpen(false);
        }, 150);
    }, []);

    const cancelClose = useCallback(() => {
        if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    }, []);

    const handleLogout = async () => {
        await supabase.auth.signOut();
        router.push('/');
    };

    const userInitial = user?.email?.charAt(0)?.toUpperCase() ?? 'M';

    const toggleMobileSection = (section: string) => {
        setMobileOpenSections(prev => ({ ...prev, [section]: !prev[section] }));
    };

    const closeAll = () => {
        setLearnMenuOpen(false);
        setDrawerOpen(false);
    };

    // ── Components ─────────────────────────────────────────────────────────────

    const BrandLogo = () => {
        const text = "ArabicWithM";
        const letters = text.split("");
        const shouldAnimate = !hasAnimatedRef.current;

        const containerVariants: Variants = {
            hidden: { opacity: 1 },
            visible: {
                opacity: 1,
                transition: { staggerChildren: 0.08, delayChildren: 0.1 }
            }
        };

        const letterVariants: Variants = {
            hidden: { opacity: 0, y: 10, rotate: -5, scale: 0.8 },
            visible: {
                opacity: 1, y: 0, rotate: 0, scale: 1,
                transition: { type: "spring" as const, damping: 20, stiffness: 300 }
            }
        };

        return (
            <Box
                onClick={() => { router.push('/'); setDrawerOpen(false); setLearnMenuOpen(false); }}
                sx={{ mr: 0.5, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5, cursor: 'pointer', py: 0.5 }}
            >
                <Box component="img" src="/homepage/arabicwithm-notext.png" alt="Logo"
                    sx={{ height: isMobile ? 28 : 45, width: 'auto', objectFit: 'contain' }} />
                <Box sx={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                    <motion.div
                        variants={containerVariants}
                        initial={shouldAnimate ? "hidden" : "visible"}
                        animate="visible"
                        style={{
                            display: 'flex',
                            position: 'relative',
                            fontFamily: '"Cookie", cursive',
                            fontSize: isMobile ? '2rem' : '2.6rem',
                            fontWeight: 500,
                            background: 'linear-gradient(135deg, var(--bark) 0%, var(--forest) 100%)',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                            letterSpacing: '0.01em',
                            lineHeight: 1,
                            marginTop: '0.15em'
                        }}
                    >
                        {letters.map((letter, index) => (
                            <motion.span key={index} variants={letterVariants} style={{ display: 'inline-block' }}>
                                {letter}
                            </motion.span>
                        ))}
                    </motion.div>
                </Box>
            </Box>
        );
    };

    const GoldLine = () => (
        <Box sx={{
            height: '1px',
            background: 'linear-gradient(90deg, transparent, rgba(184,134,11,0.4), transparent)',
            width: '100%',
        }} />
    );

    const DropdownContent = ({ section, isMobile = false }: { section: typeof MEGA_MENU_ITEMS[0], isMobile?: boolean }) => {
        const handleItemClick = (item: string) => {
            if (section.header === 'Study' && item === 'Revision') {
                router.push('/revision');
            } else if (section.header === 'Study') {
                const slug = STUDY_LEVEL_MAP[item] ?? item.toLowerCase().replace(/\s+/g, '-');
                router.push(`/flashcards/${slug}`);
            } else if (section.header === 'Cartoons') {
                const slug = CARTOON_SLUG_MAP[item] ?? item.toLowerCase().replace(/\s+/g, '-');
                router.push(`/cartoons/${slug}`);
            } else {
                const key = item.toLowerCase().replace(/\s+/g, '-');
                router.push(`/learn/${section.header.toLowerCase()}/${key}`);
            }
            closeAll();
        };

        const handleHeaderClick = () => {
            if (section.header === 'Cartoons') {
                router.push('/cartoons');
                closeAll();
            } else if (section.header === 'Study') {
                router.push('/flashcards');
                closeAll();
            }
        };

        return (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                <Box sx={{
                    display: 'flex', alignItems: 'center', gap: 1, mb: 0.5,
                    pb: 1, borderBottom: '1px solid rgba(184,134,11,0.1)'
                }}>
                    {!isMobile && section.icon}
                    <Typography
                        className={section.header === 'Cartoons' ? 'cartoon-header-link' : undefined}
                        onClick={handleHeaderClick}
                        sx={{
                            fontFamily: '"EB Garamond", serif',
                            fontSize: isMobile ? '1.1rem' : '1.2rem',
                            fontWeight: 700,
                            color: 'var(--bark)',
                            letterSpacing: '0.02em',
                            cursor: section.header === 'Cartoons' || section.header === 'Study' ? 'pointer' : 'default',
                        }}
                    >
                        {section.header}
                    </Typography>
                </Box>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: isMobile ? 0.5 : 0.75, pl: isMobile ? 4 : 0 }}>
                    {section.items.map((item) => (
                        <Typography
                            key={item}
                            className="mega-menu-item"
                            onClick={() => handleItemClick(item)}
                            sx={{ fontFamily: 'Jost, sans-serif', fontSize: '0.9rem', color: 'var(--muted)', cursor: 'pointer', width: 'fit-content' }}
                        >
                            {item}
                        </Typography>
                    ))}
                </Box>
            </Box>
        );
    };

    const MegaMenuGrid = ({ isMobile = false }: { isMobile?: boolean }) => (
        <Box sx={{
            display: 'grid',
            gridTemplateColumns: isMobile ? '1fr' : { xs: '1fr 1fr', md: 'repeat(4, 1fr)' },
            gap: isMobile ? 2 : 6,
            py: isMobile ? 2 : 3,
            px: isMobile ? 0 : 2,
        }}>
            {MEGA_MENU_ITEMS.map((section) => (
                <DropdownContent key={section.header} section={section} isMobile={isMobile} />
            ))}
        </Box>
    );

    // ── User menu ──────────────────────────────────────────────────────────────
    const renderUserMenu = () => (
        <Menu
            anchorEl={userMenuAnchor}
            open={Boolean(userMenuAnchor)}
            onClose={() => setUserMenuAnchor(null)}
            transformOrigin={{ horizontal: 'right', vertical: 'top' }}
            anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
            slotProps={{
                paper: {
                    sx: {
                        mt: 1,
                        borderRadius: '4px',
                        border: '1px solid rgba(184,134,11,0.15)',
                        boxShadow: '0 12px 40px rgba(44,26,14,0.12)',
                        minWidth: 200,
                        overflow: 'hidden',
                    }
                }
            }}
        >
            <Box sx={{ px: 2, py: 1.5, background: 'rgba(14,46,31,0.03)' }}>
                <Typography sx={{
                    fontFamily: '"EB Garamond", serif',
                    fontSize: '1.05rem',
                    fontWeight: 700,
                    color: 'var(--bark)',
                    lineHeight: 1.2,
                }}>
                    {user?.email?.split('@')[0]}
                </Typography>
                <Typography sx={{
                    fontFamily: 'Jost, sans-serif',
                    fontSize: '0.75rem',
                    color: 'var(--muted)',
                    mt: 0.2,
                }}>
                    {user?.email}
                </Typography>
            </Box>
            <Box sx={{ height: '1px', background: 'linear-gradient(90deg, transparent, rgba(184,134,11,0.3), transparent)' }} />
            <MenuItem
                onClick={() => { setUserMenuAnchor(null); router.push('/profile'); }}
                sx={{ py: 1.2, gap: 1.5, '&:hover': { background: 'rgba(184,134,11,0.06)' } }}
            >
                <AccountCircle sx={{ fontSize: 18, color: 'var(--forest)' }} />
                <Typography sx={{ fontFamily: 'Jost, sans-serif', fontSize: '0.88rem', color: 'var(--bark)' }}>
                    My Profile
                </Typography>
            </MenuItem>
            <Box sx={{ height: '1px', background: 'rgba(44,26,14,0.07)', mx: 2 }} />
            <MenuItem
                onClick={() => { setUserMenuAnchor(null); handleLogout(); }}
                sx={{ py: 1.2, gap: 1.5, '&:hover': { background: 'rgba(192,57,43,0.06)' } }}
            >
                <LogoutSharp sx={{ fontSize: 18, color: '#c0392b' }} />
                <Typography sx={{ fontFamily: 'Jost, sans-serif', fontSize: '0.88rem', color: '#c0392b' }}>
                    Sign Out
                </Typography>
            </MenuItem>
        </Menu>
    );

    // ── Mobile Drawer ──────────────────────────────────────────────────────────
    const renderMobileDrawer = () => (
        <Drawer
            open={drawerOpen}
            onClose={() => setDrawerOpen(false)}
            slotProps={{
                paper: {
                    sx: {
                        width: 280,
                        background: 'var(--cream)',
                        borderRight: '1px solid rgba(184,134,11,0.15)'
                    }
                }
            }}
        >
            {isLoggedIn ? (
                <Box sx={{
                    px: 3, py: 3,
                    display: 'flex', alignItems: 'center', gap: 2,
                    background: 'rgba(14,46,31,0.03)',
                    borderBottom: '1px solid rgba(184,134,11,0.15)',
                }}>
                    <Avatar sx={{
                        width: 44, height: 44,
                        background: 'linear-gradient(135deg, #b8860b, #d4a843)',
                        color: 'var(--forest)',
                        fontFamily: 'Jost, sans-serif',
                        fontWeight: 700,
                        fontSize: '1rem',
                        flexShrink: 0,
                    }}>
                        {userInitial}
                    </Avatar>
                    <Box sx={{ overflow: 'hidden', minWidth: 0 }}>
                        <Typography sx={{
                            fontFamily: '"EB Garamond", serif',
                            fontSize: '1.05rem', fontWeight: 700,
                            color: 'var(--bark)', lineHeight: 1.2,
                            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                        }}>
                            {user?.email?.split('@')[0]}
                        </Typography>
                        <Typography sx={{
                            fontFamily: 'Jost, sans-serif',
                            fontSize: '0.75rem', color: 'var(--muted)',
                            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                        }}>
                            {user?.email}
                        </Typography>
                    </Box>
                </Box>
            ) : (
                <Box sx={{
                    px: 3, py: 3,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 1.5,
                    background: 'rgba(14,46,31,0.03)',
                    borderBottom: '1px solid rgba(184,134,11,0.15)',
                }}>
                    <Button
                        onClick={() => { setAuthDialogOpen(true); setDrawerOpen(false); }}
                        variant="outlined"
                        fullWidth
                        startIcon={<Person sx={{ fontSize: 18 }} />}
                        sx={{
                            borderColor: 'rgba(184,134,11,0.4)',
                            color: 'var(--forest)',
                            fontFamily: 'Jost, sans-serif',
                            fontWeight: 500,
                            fontSize: '0.85rem',
                            textTransform: 'none',
                            borderRadius: '2px',
                            py: 0.8,
                            '&:hover': {
                                borderColor: 'var(--gold-lt)',
                                background: 'rgba(184,134,11,0.06)'
                            }
                        }}
                    >
                        Register / Login
                    </Button>
                </Box>
            )}

            <List disablePadding>
                {MEGA_MENU_ITEMS.map((section) => (
                    <React.Fragment key={section.header}>
                        <ListItem disablePadding>
                            <ListItemButton
                                onClick={() => toggleMobileSection(section.header)}
                                sx={{ py: 1.4, px: 3, '& .MuiListItemIcon-root': { minWidth: 36 } }}
                            >
                                <ListItemIcon sx={{ color: 'var(--forest)' }}>
                                    {section.icon}
                                </ListItemIcon>
                                <ListItemText primary={
                                    <Typography sx={{ fontFamily: 'Jost, sans-serif', fontSize: '0.9rem', fontWeight: 500, color: 'var(--bark)' }}>
                                        {section.header}
                                    </Typography>
                                } />
                                {mobileOpenSections[section.header]
                                    ? <ExpandLess sx={{ color: 'var(--muted)' }} />
                                    : <ExpandMore sx={{ color: 'var(--muted)' }} />
                                }
                            </ListItemButton>
                        </ListItem>
                        <Collapse in={mobileOpenSections[section.header]} timeout="auto" unmountOnExit>
                            <Box sx={{ px: 3, pb: 2 }}>
                                <DropdownContent section={section} isMobile={true} />
                            </Box>
                        </Collapse>
                    </React.Fragment>
                ))}

                <GoldLine />

                <ListItem disablePadding>
                    <ListItemButton className="mobile-list-btn"
                        onClick={() => { router.push('/about'); setDrawerOpen(false); }}
                        sx={{ py: 1.4, px: 3, '& .MuiListItemIcon-root': { minWidth: 36 } }}>
                        <ListItemIcon sx={{ color: 'var(--gold)' }}>
                            <InfoOutlined sx={{ fontSize: 20 }} />
                        </ListItemIcon>
                        <ListItemText primary={
                            <Typography sx={{ fontFamily: 'Jost, sans-serif', fontSize: '0.9rem', fontWeight: 500, color: 'var(--bark)' }}>
                                About
                            </Typography>
                        } />
                    </ListItemButton>
                </ListItem>

                <ListItem disablePadding>
                    <ListItemButton className="mobile-list-btn"
                        onClick={() => { setContactOpen(true); setDrawerOpen(false); }}
                        sx={{ py: 1.4, px: 3, '& .MuiListItemIcon-root': { minWidth: 36 } }}>
                        <ListItemIcon sx={{ color: 'var(--gold)' }}>
                            <EmailSharp sx={{ fontSize: 20 }} />
                        </ListItemIcon>
                        <ListItemText primary={
                            <Typography sx={{ fontFamily: 'Jost, sans-serif', fontSize: '0.9rem', fontWeight: 500, color: 'var(--bark)' }}>
                                Contact
                            </Typography>
                        } />
                    </ListItemButton>
                </ListItem>

                <ListItem disablePadding>
                    <ListItemButton className="mobile-list-btn"
                        onClick={() => { router.push('/faq'); setDrawerOpen(false); }}
                        sx={{ py: 1.4, px: 3, '& .MuiListItemIcon-root': { minWidth: 36 } }}>
                        <ListItemIcon sx={{ color: 'var(--gold)' }}>
                            <HelpSharp sx={{ fontSize: 20 }} />
                        </ListItemIcon>
                        <ListItemText primary={
                            <Typography sx={{ fontFamily: 'Jost, sans-serif', fontSize: '0.9rem', fontWeight: 500, color: 'var(--bark)' }}>
                                FAQ
                            </Typography>
                        } />
                    </ListItemButton>
                </ListItem>

                {isLoggedIn && (
                    <ListItem disablePadding>
                        <ListItemButton className="mobile-list-btn"
                            onClick={() => { handleLogout(); setDrawerOpen(false); }}
                            sx={{ py: 1.4, px: 3, '& .MuiListItemIcon-root': { minWidth: 36 } }}>
                            <ListItemIcon sx={{ color: '#c0392b' }}>
                                <LogoutSharp sx={{ fontSize: 20 }} />
                            </ListItemIcon>
                            <ListItemText primary={
                                <Typography sx={{ fontFamily: 'Jost, sans-serif', fontSize: '0.9rem', fontWeight: 500, color: '#c0392b' }}>
                                    Log Out
                                </Typography>
                            } />
                        </ListItemButton>
                    </ListItem>
                )}
            </List>
        </Drawer>
    );

    const renderContactDialog = () => (
        <Dialog
            open={contactOpen}
            onClose={() => setContactOpen(false)}
            maxWidth="xs"
            fullWidth
            slotProps={{
                paper: {
                    sx: {
                        background: 'linear-gradient(160deg, var(--forest) 0%, #0a1f15 100%)',
                        borderRadius: '4px',
                        border: '1px solid rgba(212,168,67,0.2)',
                        overflow: 'hidden'
                    }
                }
            }}
        >
            <Box sx={{ position: 'relative', pt: 4, pb: 4, px: 3.5 }}>
                <IconButton onClick={() => setContactOpen(false)} size="small"
                    sx={{ position: 'absolute', top: 12, right: 12, color: 'rgba(245,237,224,0.4)', '&:hover': { color: 'var(--gold-lt)' } }}>
                    <Close sx={{ fontSize: 18 }} />
                </IconButton>
                <Box sx={{ mb: 3, textAlign: 'center' }}>
                    <Typography sx={{ fontFamily: '"EB Garamond", serif', fontSize: '2.2rem', fontWeight: 700, color: '#f5ede0', lineHeight: 1.1, mb: 1 }}>
                        Get in Touch
                    </Typography>
                    <Box sx={{ height: '1px', width: 60, background: 'linear-gradient(90deg, transparent, var(--gold-lt), transparent)', mx: 'auto', mb: 1.5 }} />
                    <Typography sx={{ fontFamily: 'Jost, sans-serif', fontSize: '0.83rem', color: 'rgba(245,237,224,0.5)', lineHeight: 1.7 }}>
                        Have questions about learning Arabic? Reach out anytime.
                    </Typography>
                </Box>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                    <Box component="a" href="mailto:hello@arabicwithm.com"
                        sx={{
                            display: 'flex', alignItems: 'center', gap: 2, p: 1.8,
                            border: '1px solid rgba(212,168,67,0.15)', borderRadius: '3px',
                            background: 'rgba(255,255,255,0.03)', textDecoration: 'none', cursor: 'pointer',
                            '&:hover': { background: 'rgba(212,168,67,0.08)', borderColor: 'rgba(212,168,67,0.35)' }
                        }}>
                        <Box sx={{ flexShrink: 0, width: 36, height: 36, borderRadius: '2px', background: 'rgba(212,168,67,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <EmailSharp sx={{ fontSize: 20, color: 'var(--gold-lt)' }} />
                        </Box>
                        <Box>
                            <Typography sx={{ fontFamily: 'Jost, sans-serif', fontSize: '0.88rem', fontWeight: 600, color: '#f5ede0', lineHeight: 1.2 }}>
                                Email Us
                            </Typography>
                            <Typography sx={{ fontFamily: 'Jost, sans-serif', fontSize: '0.76rem', color: 'rgba(245,237,224,0.45)' }}>
                                hello@arabicwithm.com
                            </Typography>
                        </Box>
                    </Box>
                </Box>
            </Box>
        </Dialog>
    );

    return (
        <>
            <style>{NAV_CSS}</style>
            {renderMobileDrawer()}
            {renderContactDialog()}
            {renderUserMenu()}

            <AuthDialog open={authDialogOpen} onClose={() => setAuthDialogOpen(false)} />

            <AppBar id="main-navbar" position="fixed" elevation={0} sx={{
                background: '#ffffff',
                backdropFilter: 'blur(16px)',
                borderBottom: `1px solid rgba(184,134,11,0.15)`,
                boxShadow: '0 4px 24px rgba(44,26,14,0.08)',
                zIndex: 1200
            }}>
                <Container maxWidth="xl">
                    <Toolbar disableGutters sx={{ py: { xs: 0.5, md: 1 }, minHeight: { xs: 56, md: 64 } }}>
                        {isMobile ? (
                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                                <IconButton onClick={() => setDrawerOpen(true)} sx={{ color: 'var(--forest)' }}>
                                    <MenuOutlined />
                                </IconButton>

                                <BrandLogo />

                                {isLoggedIn ? (
                                    <IconButton onClick={e => setUserMenuAnchor(e.currentTarget)} size="small" sx={{ position: 'relative' }}>
                                        <Avatar sx={{
                                            width: 30, height: 30,
                                            background: 'linear-gradient(135deg, #b8860b, #d4a843)',
                                            color: 'var(--forest)',
                                            fontFamily: 'Jost, sans-serif',
                                            fontWeight: 700,
                                            fontSize: '0.85rem',
                                        }}>
                                            {userInitial}
                                        </Avatar>
                                    </IconButton>
                                ) : (
                                    <IconButton onClick={() => setAuthDialogOpen(true)} sx={{ color: 'var(--forest)' }}>
                                        <Person />
                                    </IconButton>
                                )}
                            </Box>
                        ) : (
                            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', width: '100%', alignItems: 'center' }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                    {NAV_ITEMS.map(item => (
                                        <Box key={item} sx={{ position: 'relative' }}>
                                            {item === 'Learn' ? (
                                                <Box
                                                    className="learn-trigger"
                                                    onMouseEnter={() => { cancelClose(); setLearnMenuOpen(true); }}
                                                    onMouseLeave={scheduleClose}
                                                >
                                                    <Typography className="nav-link" sx={{
                                                        fontFamily: 'Jost, sans-serif', fontSize: '0.85rem', fontWeight: 500,
                                                        letterSpacing: '0.06em', color: 'var(--forest)', cursor: 'pointer',
                                                        py: 2, display: 'inline-block'
                                                    }}>
                                                        {item}
                                                    </Typography>
                                                </Box>
                                            ) : (
                                                <Typography className="nav-link"
                                                    onClick={() => item === 'Contact' ? setContactOpen(true) : router.push(NAV_ROUTES[item])}
                                                    sx={{ fontFamily: 'Jost, sans-serif', fontSize: '0.85rem', fontWeight: 500, letterSpacing: '0.06em', color: 'var(--forest)', cursor: 'pointer', py: 2 }}>
                                                    {item}
                                                </Typography>
                                            )}
                                        </Box>
                                    ))}
                                </Box>

                                <BrandLogo />

                                <Box sx={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
                                    {isLoggedIn ? (
                                        <IconButton onClick={e => setUserMenuAnchor(e.currentTarget)} size="small">
                                            <Avatar sx={{
                                                width: 32, height: 32,
                                                background: 'linear-gradient(135deg, #b8860b, #d4a843)',
                                                color: 'var(--forest)',
                                                fontFamily: 'Jost, sans-serif',
                                                fontWeight: 700,
                                                fontSize: '0.85rem',
                                            }}>
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
                                                borderColor: 'rgba(184,134,11,0.4)',
                                                color: 'var(--forest)',
                                                fontFamily: 'Jost, sans-serif',
                                                fontWeight: 500,
                                                fontSize: '0.8rem',
                                                textTransform: 'none',
                                                borderRadius: '2px',
                                                px: 1.8,
                                                '&:hover': { borderColor: 'var(--gold-lt)', background: 'rgba(184,134,11,0.06)' }
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

                {/* Desktop Mega Menu */}
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
                                position: 'absolute', top: '100%', left: 0, right: 0,
                                background: 'rgba(255, 255, 255, 0.98)',
                                backdropFilter: 'blur(20px)',
                                borderBottom: '1px solid rgba(184,134,11,0.15)',
                                boxShadow: '0 20px 40px rgba(44,26,14,0.08)',
                                zIndex: 1199, overflow: 'hidden', transformOrigin: 'top'
                            }}
                        >
                            <Container maxWidth="xl">
                                <MegaMenuGrid />
                            </Container>
                        </motion.div>
                    )}
                </AnimatePresence>

                {isMobile && isLoggedIn && <Box sx={{ height: 2, background: 'rgba(184,134,11,0.15)' }} />}
            </AppBar>
        </>
    );
}