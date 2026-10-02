'use client'

import { AdminPanelSettings, BookOutlined, EmailSharp, ExploreOutlined, HomeOutlined, LogoutSharp, Movie, Person, PsychologyOutlined, RateReviewOutlined, VolunteerActivismRounded } from '@mui/icons-material'
import {
    Avatar,
    Box,
    Button,
    Drawer,
    List,
    ListItem,
    ListItemButton,
    ListItemIcon,
    ListItemText,
    Typography,
} from '@mui/material'
import { User } from '@supabase/supabase-js'
import GoldLine from './GoldLine'
import { NavigateFn } from './constants'

interface MobileDrawerProps {
    open: boolean
    onClose: () => void
    isLoggedIn: boolean
    user: User | null
    isAdmin: boolean
    isReviewer: boolean
    onAuthOpen: () => void
    onLogout: () => void
    onContactOpen: () => void
    navigate: NavigateFn
    accessLoading?: boolean
    accessError?: string
    onRetryAccess?: () => void
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
    onContactOpen,
    navigate,
    accessLoading,accessError,onRetryAccess,
}: MobileDrawerProps) {
    const userInitial = user?.email?.charAt(0)?.toUpperCase() ?? 'M'

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
                            color: '#fff',
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
                <GoldLine />
                {isLoggedIn&&accessLoading&&<ListItem><Typography variant="body2" role="status">Checking permissions…</Typography></ListItem>}
                {isLoggedIn&&accessError&&<ListItemButton onClick={onRetryAccess}><ListItemText primary="Unable to verify permissions · Retry"/></ListItemButton>}

                {[
                    ...(isLoggedIn ? [{ label: 'My Profile', icon: <Person sx={{ fontSize: 18 }} />, onClick: () => pushAndClose('/profile') }] : []),
                    ...(isLoggedIn && isAdmin ? [{ label: 'Admin', icon: <AdminPanelSettings sx={{ fontSize: 18 }} />, onClick: () => pushAndClose('/admin/users') }] : []),
                    ...(isLoggedIn && isReviewer ? [{ label: 'Reviewer Workspace', icon: <RateReviewOutlined sx={{ fontSize: 18 }} />, onClick: () => pushAndClose('/reviewer') }] : []),
                    { label: 'Home', icon: <HomeOutlined sx={{ fontSize: 18 }} />, onClick: () => pushAndClose('/') },
                    { label: 'Explore', icon: <ExploreOutlined sx={{ fontSize: 18 }} />, onClick: () => pushAndClose('/explore') },
                    { label: 'Watch', icon: <Movie sx={{ fontSize: 18 }} />, onClick: () => pushAndClose('/cartoons') },
                    { label: 'Read', icon: <BookOutlined sx={{ fontSize: 18 }} />, onClick: () => pushAndClose('/books') },
                    { label: 'Memory', icon: <PsychologyOutlined sx={{ fontSize: 18 }} />, onClick: () => pushAndClose('/memory') },
                    { label: 'Give Feedback', icon: <EmailSharp sx={{ fontSize: 18 }} />, onClick: () => { window.location.href = '/feedback' } },
                    { label: 'Support Us', icon: <VolunteerActivismRounded sx={{ fontSize: 18 }} />, onClick: () => pushAndClose('/support') },
                    { label: 'Contact', icon: <EmailSharp sx={{ fontSize: 18 }} />, onClick: onContactOpen },
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
