'use client'

import {
    Close, EmailSharp, HelpSharp, LogoutSharp,
    ManageSearchSharp, MenuOutlined, Person,
    SettingsApplicationsSharp, VolunteerActivismSharp,
    ExpandMore, ExpandLess, School, Movie, MenuBook, LibraryBooks
} from "@mui/icons-material";
import {
    AppBar, Avatar, Box, Button, Container, Dialog,
    Drawer, IconButton, List, ListItem, ListItemButton,
    ListItemIcon, ListItemText, Toolbar, Typography,
    Collapse, useMediaQuery
} from "@mui/material";
import { useTheme } from '@mui/material/styles';
import React, { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence, Variants } from 'framer-motion';

// ─── constants ────────────────────────────────────────────────────────────────
const NAV_ITEMS = ['Learn', 'About', 'Contact'] as const;
const NAV_ROUTES: Record<string, string> = {
    'Learn': '/learn',
    'About': '/about',
    'Contact': '/contact',
};

const SLUG_MAP: Record<string, string> = {
    'beginner': 'beginner',
    'a1': 'elementary',
    'a2': 'intermediate',
    'b1': 'upper-intermediate',
    'b2': 'upper-intermediate',
    'c1': 'intermediate',
    'c2': 'intermediate',
}

const MOBILE_ITEMS = ['Sign In', 'Learning', 'My Progress', 'Settings'] as const;
const MOBILE_SECONDARY = ['About', 'Contact', 'FAQ'] as const;

const MEGA_MENU_ITEMS = [
    {
        header: 'Flashcards',
        icon: <School sx={{ fontSize: 20, color: 'var(--forest)' }} />,
        items: ['Beginner', 'A1', 'A2', 'B1', 'B2', 'C1', 'C2']
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

// ─── styles ───────────────────────────────────────────────────────────────────
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
`;

export default function Navbar() {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
    const router = useRouter();

    // Track if the logo animation has already played
    const hasAnimatedRef = useRef(false);

    // State
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [contactOpen, setContactOpen] = useState(false);
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [learnMenuOpen, setLearnMenuOpen] = useState(false);
    const [mobileLearnOpen, setMobileLearnOpen] = useState(false);

    // Refs for hover delay logic
    const closeTimerRef = useRef<NodeJS.Timeout | null>(null);
    const menuContainerRef = useRef<HTMLDivElement>(null);

    // Set animation as "complete" after the first mount
    useEffect(() => {
        hasAnimatedRef.current = true;
    }, []);

    // Clean up timer on unmount
    useEffect(() => {
        return () => {
            if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
        };
    }, []);

    // Delayed close handler
    const scheduleClose = useCallback(() => {
        if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
        closeTimerRef.current = setTimeout(() => {
            setLearnMenuOpen(false);
        }, 150); // 150ms delay allows moving mouse from trigger to menu
    }, []);

    const cancelClose = useCallback(() => {
        if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    }, []);

    // ── Components ─────────────────────────────────────────────────────────────

    const BrandLogo = () => {
        const text = "ArabicWithM";
        const letters = text.split("");
        const shouldAnimate = !hasAnimatedRef.current;

        const containerVariants: Variants = {
            hidden: { opacity: 1 },
            visible: {
                opacity: 1,
                transition: {
                    staggerChildren: 0.08,
                    delayChildren: 0.1
                }
            }
        };

        const letterVariants: Variants = {
            hidden: {
                opacity: 0,
                y: 10,
                rotate: -5,
                scale: 0.8
            },
            visible: {
                opacity: 1,
                y: 0,
                rotate: 0,
                scale: 1,
                transition: {
                    type: "spring" as const,
                    damping: 20,
                    stiffness: 300
                }
            }
        };

        return (
            <Box
                onClick={() => {
                    router.push('/');
                    setDrawerOpen(false);
                    setLearnMenuOpen(false);
                }}
                sx={{
                    mr: 0.5,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 0.5,
                    cursor: 'pointer',
                    py: 0.5
                }}
            >
                <Box
                    component="img"
                    src="/arabicwithm-notext.png"
                    alt="Logo"
                    sx={{ height: isMobile ? 28 : 45, width: 'auto', objectFit: 'contain' }}
                />
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
                            <motion.span
                                key={index}
                                variants={letterVariants}
                                style={{ display: 'inline-block' }}
                            >
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

    const MegaMenuContent = ({ isMobile = false }: { isMobile?: boolean }) => (
        <Box sx={{
            display: 'grid',
            gridTemplateColumns: isMobile ? '1fr' : { xs: '1fr 1fr', md: 'repeat(4, 1fr)' },
            gap: isMobile ? 2 : 6,
            py: isMobile ? 2 : 3,
            px: isMobile ? 0 : 2,
        }}>
            {MEGA_MENU_ITEMS.map((section) => (
                <Box key={section.header} sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                    <Box sx={{
                        display: 'flex', alignItems: 'center', gap: 1, mb: 0.5,
                        pb: 1, borderBottom: '1px solid rgba(184,134,11,0.1)'
                    }}>
                        {!isMobile && section.icon}
                        <Typography sx={{
                            fontFamily: '"EB Garamond", serif',
                            fontSize: isMobile ? '1.1rem' : '1.2rem',
                            fontWeight: 700, color: 'var(--bark)', letterSpacing: '0.02em'
                        }}>
                            {section.header}
                        </Typography>
                    </Box>
                    <Box sx={{
                        display: 'flex', flexDirection: 'column',
                        gap: isMobile ? 0.5 : 0.75,
                        pl: isMobile ? 4 : 0
                    }}>
                        {section.items.map((item) => {
                            const key = item.toLowerCase().replace(/\s+/g, '-')
                            const href = section.header === 'Flashcards'
                                ? `/flashcards/${SLUG_MAP[key] ?? key}`
                                : `/learn/${section.header.toLowerCase()}/${key}`
                            return (
                                <Typography
                                    key={item}
                                    className="mega-menu-item"
                                    onClick={() => {
                                        router.push(href)
                                        setLearnMenuOpen(false)
                                        setDrawerOpen(false)
                                    }}
                                    sx={{
                                        fontFamily: 'Jost, sans-serif',
                                        fontSize: '0.9rem', color: 'var(--muted)',
                                        cursor: 'pointer', width: 'fit-content'
                                    }}
                                >
                                    {item}
                                </Typography>
                            )
                        })}
                    </Box>
                </Box>
            ))}
        </Box>
    )

    // ── renders ──────────────────────────────────────────────────────────
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
            <Box sx={{
                px: 3,
                py: 3,
                background: '#ffffff',
                borderBottom: '1px solid rgba(184,134,11,0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'relative'
            }}>
                <BrandLogo />
                <IconButton
                    onClick={() => setDrawerOpen(false)}
                    size="small"
                    sx={{
                        color: 'var(--muted)',
                        position: 'absolute',
                        right: 12
                    }}
                >
                    <Close sx={{ fontSize: 18 }} />
                </IconButton>
            </Box>

            {/* Mobile Learn Accordion */}
            <List disablePadding>
                <ListItem disablePadding>
                    <ListItemButton
                        onClick={() => setMobileLearnOpen(!mobileLearnOpen)}
                        sx={{ py: 1.4, px: 3, '& .MuiListItemIcon-root': { minWidth: 36 } }}
                    >
                        <ListItemIcon sx={{ color: 'var(--forest)' }}>
                            <School sx={{ fontSize: 20 }} />
                        </ListItemIcon>
                        <ListItemText
                            primary={
                                <Typography sx={{ fontFamily: 'Jost, sans-serif', fontSize: '0.9rem', fontWeight: 500, color: 'var(--bark)' }}>
                                    Learn
                                </Typography>
                            }
                        />
                        {mobileLearnOpen ? <ExpandLess sx={{ color: 'var(--muted)' }} /> : <ExpandMore sx={{ color: 'var(--muted)' }} />}
                    </ListItemButton>
                </ListItem>
                <Collapse in={mobileLearnOpen} timeout="auto" unmountOnExit>
                    <Box sx={{ px: 3, pb: 2 }}>
                        <MegaMenuContent isMobile={true} />
                    </Box>
                </Collapse>
            </List>

            <GoldLine />

            <List disablePadding>
                {MOBILE_ITEMS.map((text, i) => {
                    const icons = [<Person key="1" />, <VolunteerActivismSharp key="2" />, <ManageSearchSharp key="3" />, <SettingsApplicationsSharp key="4" />];
                    return (
                        <ListItem key={text} disablePadding>
                            <ListItemButton
                                className="mobile-list-btn"
                                onClick={() => {
                                    if (i === 0) setIsLoggedIn(!isLoggedIn);
                                    if (i === 1) router.push('/learning');
                                    if (i === 2) router.push('/progress');
                                    if (i === 3) router.push('/settings');
                                    setDrawerOpen(false);
                                }}
                                sx={{ py: 1.4, px: 3, '& .MuiListItemIcon-root': { minWidth: 36 } }}
                            >
                                <ListItemIcon sx={{ color: 'var(--forest)' }}>
                                    {React.cloneElement(icons[i], { sx: { fontSize: 20 } })}
                                </ListItemIcon>
                                <ListItemText
                                    primary={
                                        <Typography sx={{ fontFamily: 'Jost, sans-serif', fontSize: '0.9rem', fontWeight: 500, color: 'var(--bark)' }}>
                                            {text}
                                        </Typography>
                                    }
                                />
                            </ListItemButton>
                        </ListItem>
                    );
                })}
            </List>
            <GoldLine />
            <List disablePadding>
                {MOBILE_SECONDARY.map((text, i) => {
                    const icons = [<VolunteerActivismSharp key="1" />, <EmailSharp key="2" />, <HelpSharp key="3" />];
                    return (
                        <ListItem key={text} disablePadding>
                            <ListItemButton
                                className="mobile-list-btn"
                                onClick={() => {
                                    if (text === 'Contact') setContactOpen(true);
                                    else router.push(NAV_ROUTES[text] || '/');
                                    setDrawerOpen(false);
                                }}
                                sx={{ py: 1.4, px: 3, '& .MuiListItemIcon-root': { minWidth: 36 } }}
                            >
                                <ListItemIcon sx={{ color: 'var(--gold)' }}>
                                    {React.cloneElement(icons[i], { sx: { fontSize: 20 } })}
                                </ListItemIcon>
                                <ListItemText
                                    primary={
                                        <Typography sx={{ fontFamily: 'Jost, sans-serif', fontSize: '0.9rem', fontWeight: 500, color: 'var(--bark)' }}>
                                            {text}
                                        </Typography>
                                    }
                                />
                            </ListItemButton>
                        </ListItem>
                    );
                })}
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
                <IconButton
                    onClick={() => setContactOpen(false)}
                    size="small"
                    sx={{
                        position: 'absolute',
                        top: 12,
                        right: 12,
                        color: 'rgba(245,237,224,0.4)',
                        '&:hover': { color: 'var(--gold-lt)' }
                    }}
                >
                    <Close sx={{ fontSize: 18 }} />
                </IconButton>
                <Box sx={{ mb: 3, textAlign: 'center' }}>
                    <Typography sx={{
                        fontFamily: '"EB Garamond", serif',
                        fontSize: '2.2rem',
                        fontWeight: 700,
                        color: '#f5ede0',
                        lineHeight: 1.1,
                        mb: 1
                    }}>
                        Get in Touch
                    </Typography>
                    <Box sx={{
                        height: '1px',
                        width: 60,
                        background: 'linear-gradient(90deg, transparent, var(--gold-lt), transparent)',
                        mx: 'auto',
                        mb: 1.5
                    }} />
                    <Typography sx={{
                        fontFamily: 'Jost, sans-serif',
                        fontSize: '0.83rem',
                        color: 'rgba(245,237,224,0.5)',
                        lineHeight: 1.7
                    }}>
                        Have questions about learning Arabic? Reach out anytime.
                    </Typography>
                </Box>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                    <Box
                        component="a"
                        href="mailto:hello@arabicwithm.com"
                        sx={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 2,
                            p: 1.8,
                            border: '1px solid rgba(212,168,67,0.15)',
                            borderRadius: '3px',
                            background: 'rgba(255,255,255,0.03)',
                            textDecoration: 'none',
                            cursor: 'pointer',
                            '&:hover': {
                                background: 'rgba(212,168,67,0.08)',
                                borderColor: 'rgba(212,168,67,0.35)'
                            }
                        }}
                    >
                        <Box sx={{
                            flexShrink: 0,
                            width: 36,
                            height: 36,
                            borderRadius: '2px',
                            background: 'rgba(212,168,67,0.1)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}>
                            <EmailSharp sx={{ fontSize: 20, color: 'var(--gold-lt)' }} />
                        </Box>
                        <Box>
                            <Typography sx={{
                                fontFamily: 'Jost, sans-serif',
                                fontSize: '0.88rem',
                                fontWeight: 600,
                                color: '#f5ede0',
                                lineHeight: 1.2
                            }}>
                                Email Us
                            </Typography>
                            <Typography sx={{
                                fontFamily: 'Jost, sans-serif',
                                fontSize: '0.76rem',
                                color: 'rgba(245,237,224,0.45)'
                            }}>
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

            <AppBar
                position="fixed"
                elevation={0}
                sx={{
                    background: '#ffffff',
                    backdropFilter: 'blur(16px)',
                    borderBottom: `1px solid rgba(184,134,11,0.15)`,
                    boxShadow: '0 4px 24px rgba(44,26,14,0.08)',
                    zIndex: 1200
                }}
            >
                <Container maxWidth="xl">
                    <Toolbar disableGutters sx={{ py: { xs: 0.5, md: 1 }, minHeight: { xs: 56, md: 64 } }}>
                        {isMobile ? (
                            <Box sx={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                width: '100%'
                            }}>
                                <IconButton
                                    onClick={() => setDrawerOpen(true)}
                                    sx={{ color: 'var(--forest)' }}
                                >
                                    <MenuOutlined />
                                </IconButton>

                                <BrandLogo />

                                {isLoggedIn ? (
                                    <IconButton
                                        onClick={() => router.push('/profile')}
                                        size="small"
                                    >
                                        <Avatar sx={{
                                            width: 32,
                                            height: 32,
                                            background: 'linear-gradient(135deg, #b8860b, #d4a843)',
                                            color: 'var(--forest)',
                                            fontFamily: 'Jost, sans-serif',
                                            fontWeight: 700,
                                            fontSize: '0.85rem'
                                        }}>
                                            M
                                        </Avatar>
                                    </IconButton>
                                ) : (
                                    <IconButton
                                        onClick={() => setIsLoggedIn(true)}
                                        sx={{ color: 'var(--forest)' }}
                                    >
                                        <Person />
                                    </IconButton>
                                )}
                            </Box>
                        ) : (
                            <Box sx={{
                                display: 'grid',
                                gridTemplateColumns: '1fr auto 1fr',
                                width: '100%',
                                alignItems: 'center'
                            }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                    {NAV_ITEMS.map(item => (
                                        <Box
                                            key={item}
                                            sx={{ position: 'relative' }}
                                        >
                                            {item === 'Learn' ? (
                                                // Learn with Mega Menu
                                                <Box
                                                    className="learn-trigger"
                                                    onMouseEnter={() => {
                                                        cancelClose();
                                                        setLearnMenuOpen(true);
                                                    }}
                                                    onMouseLeave={scheduleClose}
                                                >
                                                    <Typography
                                                        className="nav-link"
                                                        sx={{
                                                            fontFamily: 'Jost, sans-serif',
                                                            fontSize: '0.85rem',
                                                            fontWeight: 500,
                                                            letterSpacing: '0.06em',
                                                            color: 'var(--forest)',
                                                            cursor: 'pointer',
                                                            py: 2,
                                                            display: 'inline-block'
                                                        }}
                                                    >
                                                        {item}
                                                    </Typography>
                                                </Box>
                                            ) : (
                                                <Typography
                                                    className="nav-link"
                                                    onClick={() => item === 'Contact' ? setContactOpen(true) : router.push(NAV_ROUTES[item])}
                                                    sx={{
                                                        fontFamily: 'Jost, sans-serif',
                                                        fontSize: '0.85rem',
                                                        fontWeight: 500,
                                                        letterSpacing: '0.06em',
                                                        color: 'var(--forest)',
                                                        cursor: 'pointer',
                                                        py: 2
                                                    }}
                                                >
                                                    {item}
                                                </Typography>
                                            )}
                                        </Box>
                                    ))}
                                </Box>

                                <BrandLogo />

                                <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                                    {isLoggedIn ? (
                                        <IconButton
                                            onClick={() => router.push('/profile')}
                                            size="small"
                                        >
                                            <Avatar sx={{
                                                width: 32,
                                                height: 32,
                                                background: 'linear-gradient(135deg, #b8860b, #d4a843)',
                                                color: 'var(--forest)',
                                                fontFamily: 'Jost, sans-serif',
                                                fontWeight: 700,
                                                fontSize: '0.85rem'
                                            }}>
                                                M
                                            </Avatar>
                                        </IconButton>
                                    ) : (
                                        <Button
                                            onClick={() => setIsLoggedIn(true)}
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
                                                '&:hover': {
                                                    borderColor: 'var(--gold-lt)',
                                                    background: 'rgba(184,134,11,0.06)'
                                                }
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

                {/* Desktop Mega Menu - Slide Transition */}
                <AnimatePresence>
                    {learnMenuOpen && !isMobile && (
                        <motion.div
                            ref={menuContainerRef}
                            initial={{ opacity: 0, y: -20, height: 0 }}
                            animate={{ opacity: 1, y: 0, height: 'auto' }}
                            exit={{ opacity: 0, y: -10, height: 0 }}
                            transition={{
                                duration: 0.3,
                                ease: [0.22, 1, 0.36, 1],
                                opacity: { duration: 0.2 }
                            }}
                            onMouseEnter={cancelClose}
                            onMouseLeave={scheduleClose}
                            style={{
                                position: 'absolute',
                                top: '100%',
                                left: 0,
                                right: 0,
                                background: 'rgba(255, 255, 255, 0.98)',
                                backdropFilter: 'blur(20px)',
                                borderBottom: '1px solid rgba(184,134,11,0.15)',
                                boxShadow: '0 20px 40px rgba(44,26,14,0.08)',
                                zIndex: 1199,
                                overflow: 'hidden',
                                transformOrigin: 'top'
                            }}
                        >
                            <Container maxWidth="xl">
                                <MegaMenuContent />
                            </Container>
                        </motion.div>
                    )}
                </AnimatePresence>
            </AppBar>
        </>
    );
}