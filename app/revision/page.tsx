'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { useAuth } from '@/app/AuthContext'
import AuthDialog from '@/app/components/AuthDialog'
import WelcomeScreen from './WelcomeScreen'
import LoadingSkeleton from './components/LoadingSkeleton'
import RevisionSessionLayout from './components/RevisionSessionLayout'
import RevisionFlashcard from './components/RevisionFlashcard'
import SessionResults from './components/SessionResults'
import PointsPanel from './components/PointsPanel'
import InfoDialog from './components/InfoDialog'
import SettingsDialog from './components/SettingsDialog'
import LeaveSessionDialog from './components/LeaveSessionDialog'
import useRevisionSession from './hooks/useRevisionSession'

export default function RevisionPage() {
    const router = useRouter()
    const { loading: authLoading } = useAuth()
    const [infoOpen, setInfoOpen] = useState(false)
    const [settingsOpen, setSettingsOpen] = useState(false)
    const [authDialogOpen, setAuthDialogOpen] = useState(false)
    const [mobilePointsOpen, setMobilePointsOpen] = useState(false)

    const {
        currentCard, counts, isComplete, dotOrder, answeredDots, againPendingIds,
        uniqueDoneCount, uniqueTotal, handleAnswer, restartSession, startDaily, startCustom,
        sessionStarted, sessionMode, sessionLogs, totalPoints, displayPoints,
        lastPoints, pointsAnimKey, lastMultipliers, streakCount, showResults,
        loading, dueCards, completedCards, targetPoints, modeConfig,
        leaveDialogOpen, setLeaveDialogOpen, leaveTargetUrlRef,
        showDiacritics, setShowDiacritics, textScale, setTextScale,
    } = useRevisionSession()

    if (loading || authLoading) {
        return <LoadingSkeleton />
    }

    if (!sessionStarted) {
        return (
            <>
                <WelcomeScreen
                    onStartDaily={startDaily}
                    onStartCustom={(cards, modeConfig) => startCustom(cards, modeConfig)}
                />
                <AuthDialog open={authDialogOpen} onClose={() => setAuthDialogOpen(false)} />
            </>
        )
    }

    if (isComplete || (sessionStarted && dueCards.length === 0 && completedCards.length === 0)) {
        return (
            <>
                {showResults && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.5 }}
                    >
                        <SessionResults
                            logs={sessionLogs}
                            priorCompleted={completedCards}
                            onRestart={restartSession}
                            isLoading={loading}
                            sessionMode={sessionMode ?? undefined}
                        />
                    </motion.div>
                )}
            </>
        )
    }

    const dialogsOpen = infoOpen || settingsOpen || leaveDialogOpen || authDialogOpen || mobilePointsOpen

    return (
        <>
            <RevisionSessionLayout
                displayPoints={displayPoints}
                onInfoClick={() => setInfoOpen(true)}
                onSettingsClick={() => setSettingsOpen(true)}
                mobilePointsOpen={mobilePointsOpen}
                setMobilePointsOpen={setMobilePointsOpen}
                sidePanel={
                    <PointsPanel
                        displayPoints={displayPoints}
                        multipliers={lastMultipliers}
                        targetPoints={targetPoints}
                        lastPoints={lastPoints}
                        pointsAnimKey={pointsAnimKey}
                    />
                }
            >
                {currentCard && (
                    <RevisionFlashcard
                        sessionCard={currentCard}
                        counts={counts}
                        showDiacritics={showDiacritics}
                        onAnswer={handleAnswer}
                        textScale={textScale}
                        dotOrder={dotOrder}
                        answeredDots={answeredDots}
                        againPendingIds={againPendingIds}
                        totalEver={dotOrder.length}
                        doneCount={answeredDots.size}
                        uniqueDoneCount={uniqueDoneCount}
                        uniqueTotal={uniqueTotal}
                        dialogsOpen={dialogsOpen}
                        modeConfig={modeConfig}
                        sessionMode={sessionMode ?? undefined}
                    />
                )}
            </RevisionSessionLayout>

            <InfoDialog open={infoOpen} onClose={() => setInfoOpen(false)} />
            <SettingsDialog
                open={settingsOpen}
                onClose={() => setSettingsOpen(false)}
                textScale={textScale}
                onTextScaleChange={setTextScale}
                showDiacritics={showDiacritics}
                onDiacriticsToggle={() => setShowDiacritics((p: boolean) => !p)}
            />
            <LeaveSessionDialog
                open={leaveDialogOpen}
                onStay={() => {
                    setLeaveDialogOpen(false)
                    leaveTargetUrlRef.current = null
                }}
                onLeave={() => {
                    setLeaveDialogOpen(false)
                    const url = leaveTargetUrlRef.current
                    leaveTargetUrlRef.current = null
                    if (url) {
                        router.push(url)
                    }
                }}
            />
            <AuthDialog open={authDialogOpen} onClose={() => setAuthDialogOpen(false)} />
        </>
    )
}