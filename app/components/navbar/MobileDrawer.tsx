'use client'

import { AccountTreeOutlined, AdminPanelSettings, BookOutlined, EmailSharp, ExploreOutlined, GridOnRounded, HomeOutlined, LogoutSharp, Movie, Person, PsychologyOutlined, RateReviewOutlined, SchoolOutlined, SettingsOutlined, VolunteerActivismRounded } from '@mui/icons-material'
import {
    Box,
    Button,
    Drawer,
    Divider,
    List,
    ListItem,
    ListItemButton,
    ListItemIcon,
    ListItemText,
    Typography,
} from '@mui/material'
import { Fragment } from 'react'
import { User } from '@supabase/supabase-js'
import GoldLine from './GoldLine'
import MemberActions from './MemberActions'
import { LEARN_ITEMS, NAV_ROUTES, profileRoute, type NavigateFn } from './constants'

const primaryIcons = { Home: HomeOutlined, Explore: ExploreOutlined, Watch: Movie, Read: BookOutlined, Learn: SchoolOutlined }
const learningIcons = { Memory: PsychologyOutlined, Grammar: AccountTreeOutlined, 'Word Search': GridOnRounded }

interface MobileDrawerProps {
    open: boolean
    onClose: () => void
    isLoggedIn: boolean
    user: User | null
    isAdmin: boolean
    isReviewer: boolean
    onAuthOpen: () => void
    onLogout: () => void
    navigate: NavigateFn
}

export default function MobileDrawer({
    open,
    onClose,
    isLoggedIn,
    user,
    isAdmin,
    isReviewer,
    onAuthOpen,
    onLogout,
    navigate,
}: MobileDrawerProps) {

    const pushAndClose = (url: string) => {
        navigate(url)
        onClose()
    }

    // Keep the existing capability checks and destinations together. The
    // learning shortcuts are also currently shown only to these accounts.
    const managementItems = [
        ...(isLoggedIn && isAdmin ? [{ label: 'Admin', icon: <AdminPanelSettings sx={{ fontSize: 18 }} />, onClick: () => pushAndClose('/admin/users') }] : []),
        ...(isLoggedIn && isReviewer ? [{ label: 'Reviewer', icon: <RateReviewOutlined sx={{ fontSize: 18 }} />, onClick: () => pushAndClose('/reviewer') }] : []),
        ...(isAdmin || isReviewer ? LEARN_ITEMS.map(({ label, route }) => {
            const Icon = learningIcons[label]
            return { label, icon: <Icon sx={{ fontSize: 18 }} />, onClick: () => pushAndClose(route) }
        }) : []),
    ]
    const managementEnd = managementItems.at(-1)?.label

    return (
        <Drawer
            open={open}
            onClose={onClose}
            slotProps={{
                paper: {
                    'aria-label': 'Site navigation',
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
                        flexDirection: 'column',
                        gap: 1.5,
                        background: 'color-mix(in srgb, var(--awm-forest) 3%, transparent)',
                        borderBottom: '1px solid color-mix(in srgb, var(--awm-gold) 15%, transparent)',
                    }}
                >
                    {/* Streak + AWM+ live here on mobile (the navbar is reserved
                        for navigation); the pair sizes itself to the drawer. */}
                    <Box sx={{ display: 'flex', justifyContent: 'center', alignSelf: 'center', width: '100%' }}>
                        <MemberActions onProfileNavigate={onClose} />
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
                <GoldLine />

                {[
                    ...(isLoggedIn && user ? [{ label: 'My Profile', icon: <Person sx={{ fontSize: 18 }} />, onClick: () => pushAndClose(profileRoute(user!.id)) }] : []),
                    ...(['Home', 'Explore', 'Watch', 'Read', 'Learn'] as const).map(label => {
                        const Icon = primaryIcons[label]
                        return { label, icon: <Icon sx={{ fontSize: 18 }} />, onClick: () => pushAndClose(NAV_ROUTES[label]) }
                    }),
                    ...managementItems,
                    { label: 'Give Feedback', icon: <EmailSharp sx={{ fontSize: 18 }} />, onClick: () => pushAndClose('/feedback') },
                    { label: 'Support Us', icon: <VolunteerActivismRounded sx={{ fontSize: 18 }} />, onClick: () => pushAndClose('/support') },
                ].map((item) => (
                    <Fragment key={item.label}>
                    <ListItem disablePadding>
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
                    {isLoggedIn && (item.label === 'My Profile' || item.label === 'Learn' || item.label === managementEnd) && <Divider component="li" role="separator" data-nav-divider={item.label} sx={{ mx: 3, my: 1, borderColor: 'color-mix(in srgb, var(--awm-gold) 30%, transparent)' }} />}
                    </Fragment>
                ))}
                {isLoggedIn && user && (
                    <Fragment>
                        <Divider component="li" role="separator" data-nav-divider="Support Us" sx={{ mx: 3, my: 1, borderColor: 'color-mix(in srgb, var(--awm-gold) 30%, transparent)' }} />
                        <ListItem disablePadding>
                            <ListItemButton
                                className="mobile-list-btn"
                                onClick={() => pushAndClose(`${profileRoute(user.id)}?tab=settings`)}
                                sx={{ py: 1.4, px: 3, '& .MuiListItemIcon-root': { minWidth: 36 } }}
                            >
                                <ListItemIcon sx={{ color: 'var(--awm-gold)' }}><SettingsOutlined sx={{ fontSize: 18 }} /></ListItemIcon>
                                <ListItemText primary={<Typography variant="body2" sx={{ fontWeight: 500, color: 'var(--awm-bark)' }}>Settings</Typography>} />
                            </ListItemButton>
                        </ListItem>
                        <ListItem disablePadding>
                            <ListItemButton
                                className="mobile-list-btn"
                                onClick={() => { onClose(); onLogout() }}
                                sx={{ py: 1.4, px: 3, '& .MuiListItemIcon-root': { minWidth: 36 } }}
                            >
                                <ListItemIcon sx={{ color: 'var(--awm-error)' }}><LogoutSharp sx={{ fontSize: 18 }} /></ListItemIcon>
                                <ListItemText primary={<Typography variant="body2" sx={{ fontWeight: 500, color: 'var(--awm-error)' }}>Sign Out</Typography>} />
                            </ListItemButton>
                        </ListItem>
                    </Fragment>
                )}


            </List>
        </Drawer>
    )
}
