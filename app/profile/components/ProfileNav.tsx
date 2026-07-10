'use client'

import { LogoutOutlined } from '@mui/icons-material'
import { Box, Tabs, Tab } from '@mui/material'
import { Section } from '../types'

interface NavItem {
    id: Section
    label: string
    icon: React.ReactNode
}

interface SidebarNavProps {
    activeSection: Section
    onNavClick: (id: Section) => void
    onSignOut: () => void
    items: NavItem[]
}

export function SidebarNav({ activeSection, onNavClick, onSignOut, items }: SidebarNavProps) {
    return (
        <Box sx={{ width: 220, flexShrink: 0, position: 'sticky', top: 96 }}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                {items.map((item) => {
                    const active = activeSection === item.id
                    return (
                        <Box
                            key={item.id}
                            onClick={() => onNavClick(item.id)}
                            sx={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 1.5,
                                px: 2,
                                py: 1.375,
                                borderRadius: 'var(--awm-radius-none)',
                                cursor: 'pointer',
                                whiteSpace: 'nowrap',
                                fontFamily: 'var(--font-sans)',
                                fontSize: '0.88rem',
                                fontWeight: active ? 600 : 500,
                                color: active ? 'var(--awm-forest)' : 'var(--awm-muted)',
                                border: '1px solid',
                                borderColor: active ? 'color-mix(in srgb, var(--awm-gold) 18%, transparent)' : 'transparent',
                                background: active ? 'color-mix(in srgb, var(--awm-gold) 7%, transparent)' : 'transparent',
                                transition: 'background 0.15s, color 0.15s',
                                '&:hover': {
                                    background: 'color-mix(in srgb, var(--awm-gold) 5%, transparent)',
                                    color: 'var(--awm-bark)',
                                },
                            }}
                        >
                            <Box
                                sx={{
                                    color: active ? 'var(--awm-gold)' : 'var(--awm-muted)',
                                    display: 'flex',
                                    transition: 'color 0.15s',
                                }}
                            >
                                {item.icon}
                            </Box>
                            {item.label}
                        </Box>
                    )
                })}
                <Box sx={{ height: '1px', background: 'color-mix(in srgb, var(--awm-gold) 18%, transparent)', my: 1 }} />
                <Box
                    onClick={onSignOut}
                    sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1.5,
                        px: 2,
                        py: 1.375,
                        borderRadius: 'var(--awm-radius-none)',
                        cursor: 'pointer',
                        whiteSpace: 'nowrap',
                        fontFamily: 'var(--font-sans)',
                        fontSize: '0.88rem',
                        fontWeight: 500,
                        color: 'var(--awm-error)',
                        border: '1px solid transparent',
                        background: 'transparent',
                        transition: 'background 0.15s, color 0.15s',
                        '&:hover': {
                            background: 'color-mix(in srgb, var(--awm-gold) 5%, transparent)',
                            color: 'var(--awm-error)',
                        },
                    }}
                >
                    <LogoutOutlined sx={{ fontSize: 18 }} />
                    Sign Out
                </Box>
            </Box>
        </Box>
    )
}

interface MobileTabsProps {
    activeSection: Section
    onNavClick: (id: Section) => void
    onSignOut: () => void
    items: NavItem[]
}

export function MobileTabs({ activeSection, onNavClick, onSignOut, items }: MobileTabsProps) {
    return (
        <Tabs
            value={activeSection}
            onChange={(_, newValue) => {
                if (newValue === 'signout') {
                    onSignOut()
                } else {
                    onNavClick(newValue as Section)
                }
            }}
            variant="scrollable"
            scrollButtons="auto"
            sx={{
                minHeight: 40,
                '& .MuiTabs-flexContainer': { gap: 0.5 },
                '& .MuiTabs-indicator': { background: 'var(--awm-gold)', height: 2 },
                '& .MuiTab-root': {
                    fontFamily: 'var(--font-sans)',
                    fontSize: '0.82rem',
                    fontWeight: 500,
                    textTransform: 'none',
                    color: 'var(--awm-muted)',
                    minHeight: 36,
                    px: 2,
                    borderRadius: 'var(--awm-radius-sm)',
                    '&.Mui-selected': {
                        color: 'var(--awm-gold)',
                        fontWeight: 600,
                        background: 'color-mix(in srgb, var(--awm-gold) 6%, transparent)',
                    },
                },
            }}
        >
            {items.map((item) => (
                <Tab
                    key={item.id}
                    value={item.id}
                    label={item.label}
                    icon={item.icon as React.ReactElement}
                    iconPosition="start"
                />
            ))}
            <Tab
                value="signout"
                label="Sign Out"
                icon={<LogoutOutlined sx={{ fontSize: 18 }} />}
                iconPosition="start"
                sx={{ color: 'var(--awm-error)', '&.Mui-selected': { color: 'var(--awm-error)' } }}
            />
        </Tabs>
    )
}
