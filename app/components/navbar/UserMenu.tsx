'use client'

import { AdminPanelSettings, LogoutSharp, AccountCircleOutlined, RateReviewOutlined } from '@mui/icons-material'
import { Box, Menu, MenuItem, Typography } from '@mui/material'
import { User } from '@supabase/supabase-js'
import Link from 'next/link'

interface UserMenuProps {
    anchorEl: HTMLElement | null
    onClose: () => void
    user: User | null
    isAdmin: boolean
    isReviewer: boolean
    onLogout: () => void
    accessLoading?: boolean
    accessError?: string
    onRetryAccess?: () => void
}

export default function UserMenu({ anchorEl, onClose, user, onLogout, isAdmin, isReviewer,accessLoading,accessError,onRetryAccess }: UserMenuProps) {
    const navigationItemSx = { py: 1.2, gap: 1.5, color: 'var(--awm-bark)', '&:hover': { background: 'color-mix(in srgb, var(--awm-gold) 8%, transparent)' } }
    const navigationTextSx = { fontWeight: 600, color: 'var(--awm-bark)' }

    return (
        <Menu
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={onClose}
            transformOrigin={{ horizontal: 'right', vertical: 'top' }}
            anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
            slotProps={{
                paper: {
                    sx: {
                        mt: 1,
                        borderRadius: 'var(--awm-radius-none)',
                        border: '1px solid color-mix(in srgb, var(--awm-gold) 15%, transparent)',
                        boxShadow: '0 12px 40px color-mix(in srgb, var(--awm-bark) 12%, transparent)',
                        minWidth: 200,
                        overflow: 'hidden',
                    },
                },
            }}
        >
            <Box sx={{ px: 2, py: 1.5, background: 'color-mix(in srgb, var(--awm-forest) 3%, transparent)' }}>
                <Typography variant="body1" sx={{ fontWeight: 700, lineHeight: 1.2 }}>
                    {user?.email?.split('@')[0]}
                </Typography>
                <Typography variant="caption" sx={{ mt: 0.2 }}>
                    {user?.email}
                </Typography>
            </Box>
            <Box
                sx={{
                    height: '1px',
                    background:
                        'linear-gradient(90deg, transparent, color-mix(in srgb, var(--awm-gold) 30%, transparent), transparent)',
                }}
            />
            {user && <MenuItem component={Link} href="/profile" onClick={onClose} sx={navigationItemSx}><AccountCircleOutlined sx={{ fontSize: 18, color: 'var(--awm-gold)' }} /><Typography variant="body2" sx={navigationTextSx}>My Profile</Typography></MenuItem>}
            {user && accessLoading && <MenuItem disabled><Typography variant="body2" role="status">Checking permissions…</Typography></MenuItem>}
            {user && accessError && <MenuItem onClick={onRetryAccess}><Typography variant="body2">Unable to verify permissions · Retry</Typography></MenuItem>}
            {user && isReviewer && <MenuItem component={Link} href="/reviewer" onClick={onClose} sx={navigationItemSx}><RateReviewOutlined sx={{fontSize:18,color:'var(--awm-gold)'}} aria-hidden="true" /><Typography variant="body2" sx={navigationTextSx}>Reviewer Workspace</Typography></MenuItem>}
            {user && isAdmin && (
                <MenuItem
                    component={Link}
                    href="/admin/users"
                    onClick={onClose}
                    sx={navigationItemSx}
                >
                    <AdminPanelSettings sx={{ fontSize: 18, color: 'var(--awm-gold)' }} />
                    <Typography variant="body2" sx={navigationTextSx}>
                        Admin
                    </Typography>
                </MenuItem>
            )}
            <MenuItem
                onClick={onLogout}
                sx={{
                    py: 1.2,
                    gap: 1.5,
                    '&:hover': { background: 'color-mix(in srgb, var(--awm-error) 6%, transparent)' },
                }}
            >
                <LogoutSharp sx={{ fontSize: 18, color: 'var(--awm-error)' }} />
                <Typography variant="body2" sx={{ color: 'var(--awm-error)' }}>
                    Sign Out
                </Typography>
            </MenuItem>
        </Menu>
    )
}
