'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Box, Container } from '@mui/material'
import { BarChartOutlined, SettingsOutlined, SupportOutlined } from '@mui/icons-material'
import { useAuth } from '@/app/AuthContext'
import { fetchUserProfile, type ProfileData, type LevelStat } from '@/app/actions/profile'
import { supabase } from '@/app/lib/supabase/client'
import { Section } from '../types'
import ProfileHeader, { ProfileHeaderSkeleton } from './ProfileHeader'
import ProfileSkeleton from './ProfileSkeleton'
import SettingsSection from './SettingsSection'
import StatsSection from './StatsSection'
import SupportSection from './SupportSection'
import { MobileTabs, SidebarNav } from './ProfileNav'

const validTabs: Section[] = ['stats', 'settings', 'support']

const NAV_ITEMS = [
    { id: 'stats' as Section, label: 'Stats', icon: <BarChartOutlined sx={{ fontSize: 18 }} /> },
    { id: 'settings' as Section, label: 'Settings', icon: <SettingsOutlined sx={{ fontSize: 18 }} /> },
    { id: 'support' as Section, label: 'Support', icon: <SupportOutlined sx={{ fontSize: 18 }} /> },
]

export default function ProfilePageInner() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const { user, loading: authLoading } = useAuth()

    const [profile, setProfile] = useState<ProfileData | null>(null)
    const [loading, setLoading] = useState(true)
    const [selectedLevelCode, setSelectedLevelCode] = useState<string | null>(null)

    const activeSection = useMemo<Section>(() => {
        const tab = searchParams.get('tab') as Section
        return validTabs.includes(tab) ? tab : 'stats'
    }, [searchParams])

    useEffect(() => {
        if (authLoading) return
        if (!user) {
            router.push('/')
            return
        }
        let cancelled = false
        fetchUserProfile()
            .then((data) => {
                if (!cancelled) setProfile(data)
            })
            .catch((err) => {
                if (!cancelled) console.error(err)
            })
            .finally(() => {
                if (!cancelled) setLoading(false)
            })
        return () => {
            cancelled = true
        }
    }, [user, authLoading, router])

    const globalLevel = useMemo<LevelStat | null>(() => {
        if (!profile) return null
        return {
            code: 'ALL',
            label: 'All Levels',
            slug: '',
            color: 'var(--awm-gold)',
            totalThemes: profile.totalThemes,
            totalWords: profile.totalWords,
            themes: [],
        }
    }, [profile])

    const chartLevel = useMemo(() => {
        if (!profile) return null
        if (!selectedLevelCode) return globalLevel
        const found = profile.levels.find((l) => l.code === selectedLevelCode)
        return found ?? globalLevel
    }, [profile, selectedLevelCode, globalLevel])

    const handleCardClick = (code: string) => {
        setSelectedLevelCode((prev) => (prev === code ? null : code))
    }

    const handleSignOut = async () => {
        await supabase.auth.signOut()
        router.push('/')
    }

    const handleNavClick = (id: Section) => {
        router.push(`/profile?tab=${id}`)
    }

    if (authLoading || loading) {
        return (
            <Box component="main" sx={{ background: 'var(--awm-cream-light)', minHeight: '100vh' }}>
                <ProfileHeaderSkeleton />
                <ProfileSkeleton />
            </Box>
        )
    }

    if (!profile || !chartLevel) return null

    return (
        <Box component="main" sx={{ background: 'var(--awm-cream-light)', minHeight: '100vh' }}>
            <ProfileHeader profile={profile} />

            <Box sx={{ display: { xs: 'none', md: 'block' } }}>
                <Container maxWidth="lg" sx={{ py: 8 }}>
                    <Box sx={{ display: 'flex', gap: 5, alignItems: 'flex-start' }}>
                        <SidebarNav
                            activeSection={activeSection}
                            onNavClick={handleNavClick}
                            onSignOut={handleSignOut}
                            items={NAV_ITEMS}
                        />

                        <Box sx={{ flex: 1, minWidth: 0 }}>
                            {activeSection === 'stats' && (
                                <StatsSection
                                    profile={profile}
                                    chartLevel={chartLevel}
                                    selectedLevelCode={selectedLevelCode}
                                    onCardClick={handleCardClick}
                                />
                            )}
                            {activeSection === 'settings' && <SettingsSection userEmail={profile.email} />}
                            {activeSection === 'support' && <SupportSection />}
                        </Box>
                    </Box>
                </Container>
            </Box>

            <Box sx={{ display: { xs: 'block', md: 'none' } }}>
                <Container maxWidth="lg" sx={{ pt: 3, pb: 1 }}>
                    <MobileTabs
                        activeSection={activeSection}
                        onNavClick={handleNavClick}
                        onSignOut={handleSignOut}
                        items={NAV_ITEMS}
                    />
                </Container>

                <Container maxWidth="lg" sx={{ py: 3 }}>
                    {activeSection === 'stats' && (
                        <StatsSection
                            profile={profile}
                            chartLevel={chartLevel}
                            selectedLevelCode={selectedLevelCode}
                            onCardClick={handleCardClick}
                        />
                    )}
                    {activeSection === 'settings' && <SettingsSection userEmail={profile.email} />}
                    {activeSection === 'support' && <SupportSection />}
                </Container>
            </Box>
        </Box>
    )
}
