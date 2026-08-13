'use client'

import { BookOutlined, EmailSharp, ExpandLess, ExpandMore, FavoriteBorder, HelpSharp, HomeOutlined, InfoOutlined, LogoutSharp, Person, Translate } from '@mui/icons-material'
import {
    Avatar,
    Box,
    Button,
    Collapse,
    Drawer,
    List,
    ListItem,
    ListItemButton,
    ListItemIcon,
    ListItemText,
    Typography,
} from '@mui/material'
import React, { useState } from 'react'
import { User } from '@supabase/supabase-js'
import DropdownContent from './DropdownContent'
import GoldLine from './GoldLine'
import { MEGA_MENU_ITEMS, NavigateFn } from './constants'

interface MobileDrawerProps {
    open: boolean
    onClose: () => void
    isLoggedIn: boolean
    user: User | null
    onAuthOpen: () => void
    onLogout: () => void
    onContactOpen: () => void
    navigate: NavigateFn
    closeAll: () => void
}

export default function MobileDrawer({
    open,
    onClose,
    isLoggedIn,
    user,
    onAuthOpen,
    onLogout,
    onContactOpen,
    navigate,
    closeAll,
}: MobileDrawerProps) {
    const [openSections, setOpenSections] = useState<Record<string, boolean>>({
        Study: false,
        Cartoons: false,
        Reading: false,
        Stories: false,
    })

    const userInitial = user?.email?.charAt(0)?.toUpperCase() ?? 'M'

    const toggleSection = (section: string) => {
        setOpenSections((prev) => ({ ...prev, [section]: !prev[section] }))
    }

    const pushAndClose = (url: string) => {
        navigate(url)
        onClose()
    }

    return (
        <Drawer
            open={open}
            onClose={onClose}
            slotProps={{
                paper: {
                    sx: {
                        width: 280,
                        background: 'var(--awm-cream-light)',
                        borderRight: '1px solid color-mix(in srgb, var(--awm-gold) 15%, transparent)',
                    },
                },
            }}
        >
            {isLoggedIn ? (
                <Box
                    sx={{
                        px: 3,
                        py: 3,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 2,
                        background: 'color-mix(in srgb, var(--awm-forest) 3%, transparent)',
                        borderBottom: '1px solid color-mix(in srgb, var(--awm-gold) 15%, transparent)',
                    }}
                >
                    <Avatar
                        sx={{
                            width: 44,
                            height: 44,
                            background: 'linear-gradient(135deg, var(--awm-gold), var(--awm-gold-light))',
                            color: 'var(--awm-forest)',
                            fontFamily: 'var(--font-sans)',
                            fontWeight: 700,
                            fontSize: '1rem',
                            flexShrink: 0,
                        }}
                    >
                        {userInitial}
                    </Avatar>
                    <Box sx={{ overflow: 'hidden', minWidth: 0 }}>
                        <Typography
                            variant="body1"
                            sx={{
                                fontWeight: 700,
                                lineHeight: 1.2,
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                            }}
                        >
                            {user?.email?.split('@')[0]}
                        </Typography>
                        <Typography
                            variant="caption"
                            sx={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
                        >
                            {user?.email}
                        </Typography>
                    </Box>
                </Box>
            ) : (
                <Box
                    sx={{
                        px: 3,
                        py: 3,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 1.5,
                        background: 'color-mix(in srgb, var(--awm-forest) 3%, transparent)',
                        borderBottom: '1px solid color-mix(in srgb, var(--awm-gold) 15%, transparent)',
                    }}
                >
                    <Button
                        onClick={() => {
                            onAuthOpen()
                            onClose()
                        }}
                        variant="outlined"
                        fullWidth
                        startIcon={<Person sx={{ fontSize: 18 }} />}
                        sx={{
                            borderColor: 'color-mix(in srgb, var(--awm-gold) 40%, transparent)',
                            color: 'var(--awm-forest)',
                            fontFamily: 'var(--font-sans)',
                            fontWeight: 500,
                            fontSize: '0.85rem',
                            textTransform: 'none',
                            borderRadius: 'var(--awm-radius-none)',
                            py: 0.8,
                            '&:hover': {
                                borderColor: 'var(--awm-gold-light)',
                                background: 'color-mix(in srgb, var(--awm-gold) 6%, transparent)',
                            },
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
                                onClick={() => toggleSection(section.header)}
                                sx={{ py: 1.4, px: 3, '& .MuiListItemIcon-root': { minWidth: 36 } }}
                            >
                                <ListItemIcon sx={{ color: 'var(--awm-forest)' }}>{section.icon}</ListItemIcon>
                                <ListItemText
                                    primary={
                                        <Typography variant="body2" sx={{ fontWeight: 500, color: 'var(--awm-bark)' }}>
                                            {section.header}
                                        </Typography>
                                    }
                                />
                                {openSections[section.header] ? (
                                    <ExpandLess sx={{ color: 'var(--awm-muted)' }} />
                                ) : (
                                    <ExpandMore sx={{ color: 'var(--awm-muted)' }} />
                                )}
                            </ListItemButton>
                        </ListItem>
                        <Collapse in={openSections[section.header]} timeout="auto" unmountOnExit>
                            <Box sx={{ px: 3, pb: 2 }}>
                                <DropdownContent
                                    section={section}
                                    isMobile={true}
                                    navigate={navigate}
                                    closeAll={closeAll}
                                />
                            </Box>
                        </Collapse>
                    </React.Fragment>
                ))}

                <GoldLine />

                {[
                    { label: 'Home', icon: <HomeOutlined sx={{ fontSize: 18 }} />, onClick: () => pushAndClose('/') },
                    { label: 'Books', icon: <BookOutlined sx={{ fontSize: 18 }} />, onClick: () => pushAndClose('/books') },
                    { label: 'Practice', icon: <FavoriteBorder sx={{ fontSize: 18 }} />, onClick: () => pushAndClose('/practice') },
                    { label: 'Vocabulary', icon: <Translate sx={{ fontSize: 18 }} />, onClick: () => pushAndClose('/vocabulary') },
                    { label: 'About', icon: <InfoOutlined sx={{ fontSize: 18 }} />, onClick: () => pushAndClose('/about') },
                    { label: 'Contact', icon: <EmailSharp sx={{ fontSize: 18 }} />, onClick: onContactOpen },
                    { label: 'FAQ', icon: <HelpSharp sx={{ fontSize: 18 }} />, onClick: () => pushAndClose('/faq') },
                ].map((item) => (
                    <ListItem disablePadding key={item.label}>
                        <ListItemButton
                            className="mobile-list-btn"
                            onClick={item.onClick}
                            sx={{ py: 1.4, px: 3, '& .MuiListItemIcon-root': { minWidth: 36 } }}
                        >
                            <ListItemIcon sx={{ color: 'var(--awm-gold)' }}>{item.icon}</ListItemIcon>
                            <ListItemText
                                primary={
                                    <Typography variant="body2" sx={{ fontWeight: 500, color: 'var(--awm-bark)' }}>
                                        {item.label}
                                    </Typography>
                                }
                            />
                        </ListItemButton>
                    </ListItem>
                ))}

                {isLoggedIn && (
                    <ListItem disablePadding>
                        <ListItemButton
                            className="mobile-list-btn"
                            onClick={() => {
                                onLogout()
                                onClose()
                            }}
                            sx={{ py: 1.4, px: 3, '& .MuiListItemIcon-root': { minWidth: 36 } }}
                        >
                            <ListItemIcon sx={{ color: 'var(--awm-error)' }}>
                                <LogoutSharp sx={{ fontSize: 18 }} />
                            </ListItemIcon>
                            <ListItemText
                                primary={
                                    <Typography variant="body2" sx={{ fontWeight: 500, color: 'var(--awm-error)' }}>
                                        Log Out
                                    </Typography>
                                }
                            />
                        </ListItemButton>
                    </ListItem>
                )}
            </List>
        </Drawer>
    )
}
