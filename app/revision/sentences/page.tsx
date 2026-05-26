'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { useAuth } from '@/app/AuthContext'
import AuthDialog from '@/app/components/AuthDialog'
import SentencesWelcomeScreen from './components/SentencesWelcomeScreen'
import SentenceSessionLayout from './components/SentenceSessionLayout'
import SentenceFlashcard from './components/SentenceFlashcard'
import SentenceResults from './components/SentenceResults'
import SentencePointsPanel from './components/SentencePointsPanel'
import LoadingSkeleton from '../components/LoadingSkeleton'
import InfoDialog from '../components/InfoDialog'
import SettingsDialog from '../components/SettingsDialog'
import LeaveSessionDialog from '../components/LeaveSessionDialog'
import { useSentenceSession } from './hooks/useSentenceSession'

export default function SentencesPage() {
    const router = useRouter()
    const { loading: authLoading } = useAuth()
    const [infoOpen, setInfoOpen] = useState(false)
    const [settingsOpen, setSettingsOpen] = useState(false)
    const [authDialogOpen, setAuthDialogOpen] = useState(false)
    const [mobilePointsOpen, setMobilePointsOpen] = useState(false)
    const [textScale, setTextScale] = useState(1)
    const [showDiacritics, setShowDiacritics] = useState(false)
    const [leaveDialogOpen, setLeaveDialogOpen] = useState(false)

    const {
        mode,
        isLoading,
        deck,
        currentCard,
        isComplete,
        answeredDots,
        dotOrder,
        points,
        currentMultipliers,
        sessionLog,
        showResultOverlay,
        lastPoints,
        pointsAnimKey,
        loadDaily,
        handleAnswer,
        setShowResultOverlay,
    } = useSentenceSession()

    if (isLoading || authLoading) {
        return <LoadingSkeleton />
    }

    if (mode === 'idle') {
        return (
            <>
                <SentencesWelcomeScreen onStartDaily={loadDaily} />
                <AuthDialog open={authDialogOpen} onClose={() => setAuthDialogOpen(false)} />
            </>
        )
    }

    if (isComplete) {
        return (
            <>
                {showResultOverlay && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.5 }}
                    >
                        <SentenceResults
                            logs={sessionLog}
                            priorCompleted={[]} // TODO: track prior completed
                            onRestart={() => {
                                setShowResultOverlay(false)
                                loadDaily()
                            }}
                            isLoading={isLoading}
                            sessionMode={mode}
                        />
                    </motion.div>
                )}
            </>
        )
    }

    // Compute counts for bucket chips from remaining deck
    const counts = {
        new: deck.filter(c => c.queue === 'new').length,
        learning: deck.filter(c => c.queue === 'learning').length,
        review: deck.filter(c => c.queue === 'review').length,
    }

    // Estimate unique counts from dotOrder
    const uniqueTotal = dotOrder.length
    const uniqueDoneCount = Object.keys(answeredDots).length

    return (
        <>
            <SentenceSessionLayout
                textScale={textScale}
                onTextScaleChange={setTextScale}
                showDiacritics={showDiacritics}
                onDiacriticsToggle={() => setShowDiacritics(p => !p)}
                displayPoints={points}
                onInfoClick={() => setInfoOpen(true)}
                onSettingsClick={() => setSettingsOpen(true)}
                mobilePointsOpen={mobilePointsOpen}
                setMobilePointsOpen={setMobilePointsOpen}
                sidePanel={
                    <SentencePointsPanel
                        displayPoints={points}
                        multipliers={currentMultipliers}
                        lastPoints={lastPoints}
                        pointsAnimKey={pointsAnimKey}
                    />
                }
            >
                {currentCard && (
                    <SentenceFlashcard
                        key={currentCard.data.id}
                        sessionCard={currentCard}
                        counts={counts}
                        showDiacritics={showDiacritics}
                        onAnswer={handleAnswer}
                        textScale={textScale}
                        dotOrder={dotOrder}
                        answeredDots={answeredDots}
                        uniqueDoneCount={uniqueDoneCount}
                        uniqueTotal={uniqueTotal}
                    />
                )}
            </SentenceSessionLayout>

            <InfoDialog open={infoOpen} onClose={() => setInfoOpen(false)} />
            <SettingsDialog
                open={settingsOpen}
                onClose={() => setSettingsOpen(false)}
                textScale={textScale}
                onTextScaleChange={setTextScale}
                showDiacritics={showDiacritics}
                onDiacriticsToggle={() => setShowDiacritics(p => !p)}
            />
            <LeaveSessionDialog
                open={leaveDialogOpen}
                onStay={() => setLeaveDialogOpen(false)}
                onLeave={() => {
                    setLeaveDialogOpen(false)
                    router.push('/revision')
                }}
            />
            <AuthDialog open={authDialogOpen} onClose={() => setAuthDialogOpen(false)} />
        </>
    )
}
