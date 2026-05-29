'use client'

import React, { useState, useEffect } from 'react'
import {
    Dialog, DialogTitle, DialogContent, DialogActions,
    TextField, Button, IconButton, Box, Typography, CircularProgress,
} from '@mui/material'
import { Edit, Delete, Save, Close } from '@mui/icons-material'
import { updateVocabWord, deleteVocabWord } from '@/app/actions/vocab'

/* ─────────────────────────────────────────────
   AdminEditDialog
───────────────────────────────────────────── */
function AdminEditDialog({
    open, onClose, wordId, onSaved, onDeleted,
}: {
    open: boolean
    onClose: () => void
    wordId: number
    onSaved?: () => void
    onDeleted?: () => void
}) {
    const [loading, setLoading] = useState(false)
    const [saving, setSaving] = useState(false)
    const [deleting, setDeleting] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [wordAr, setWordAr] = useState('')
    const [wordDi, setWordDi] = useState('')
    const [wordTr, setWordTr] = useState('')
    const [root, setRoot] = useState('')
    const [level, setLevel] = useState('')
    const [theme, setTheme] = useState('')
    const [formsJson, setFormsJson] = useState('[]')
    const [defsJson, setDefsJson] = useState('[]')
    const [examplesJson, setExamplesJson] = useState('[]')

    useEffect(() => {
        if (!open || !wordId) return
        setLoading(true)
        setError(null)
        import('@/app/actions/vocab').then(async (mod) => {
            try {
                const raw = await mod.fetchRawVocabWord(wordId)
                if (!raw) {
                    setError('Word not found')
                    return
                }
                setWordAr(raw.word_ar)
                setWordDi(raw.word_di)
                setWordTr(raw.word_tr)
                setRoot(raw.root ?? '')
                setLevel(raw.level)
                setTheme(raw.theme)
                setFormsJson(JSON.stringify(raw.forms ?? [], null, 2))
                setDefsJson(JSON.stringify(raw.definitions ?? [], null, 2))
                setExamplesJson(JSON.stringify(raw.examples ?? [], null, 2))
            } catch (e: any) {
                setError(e?.message ?? 'Failed to load word')
            } finally {
                setLoading(false)
            }
        })
    }, [open, wordId])

    const handleSave = async () => {
        setSaving(true)
        setError(null)
        try {
            let forms: unknown = undefined
            let definitions: unknown = undefined
            let examples: unknown = undefined
            try { forms = JSON.parse(formsJson) } catch { throw new Error('Forms JSON is invalid') }
            try { definitions = JSON.parse(defsJson) } catch { throw new Error('Definitions JSON is invalid') }
            try { examples = JSON.parse(examplesJson) } catch { throw new Error('Examples JSON is invalid') }

            await updateVocabWord(wordId, {
                word_ar: wordAr,
                word_di: wordDi,
                word_tr: wordTr,
                root: root || null,
                level,
                theme,
                forms,
                definitions,
                examples,
            })
            onSaved?.()
            onClose()
        } catch (e: any) {
            setError(e?.message ?? 'Save failed')
        } finally {
            setSaving(false)
        }
    }

    const handleDelete = async () => {
        if (!confirm('Are you sure you want to delete this word? This cannot be undone.')) return
        setDeleting(true)
        setError(null)
        try {
            await deleteVocabWord(wordId)
            onDeleted?.()
            onClose()
        } catch (e: any) {
            setError(e?.message ?? 'Delete failed')
        } finally {
            setDeleting(false)
        }
    }

    const fieldSx = {
        '& .MuiInputBase-root': { fontFamily: 'Jost, sans-serif', fontSize: '0.9rem', borderRadius: '8px' },
        '& .MuiInputLabel-root': { fontFamily: 'Jost, sans-serif', fontSize: '0.85rem' },
    }

    return (
        <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth
            slotProps={{ paper: { sx: { borderRadius: '16px', overflow: 'hidden', boxShadow: '0 24px 64px rgba(44,26,14,0.2)' } } }}>
            <DialogTitle sx={{
                fontFamily: "'EB Garamond', serif", fontSize: '1.5rem', fontWeight: 700, color: '#2c1a0e',
                pb: 2, pt: 2.5, px: 2.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
                Edit Word
                <IconButton onClick={onClose} size="small" aria-label="Close dialog" sx={{ color: '#7a6e65', mr: -0.5 }}><Close sx={{ fontSize: '1.2rem' }} /></IconButton>
            </DialogTitle>
            <DialogContent sx={{ px: 2.5, pt: 1, pb: 2 }}>
                {loading ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress size={32} sx={{ color: '#b8860b' }} /></Box>
                ) : (
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        {error && (
                            <Typography sx={{ fontFamily: 'Jost, sans-serif', fontSize: '0.85rem', color: '#c0392b', background: 'rgba(192,57,43,0.06)', border: '1px solid rgba(192,57,43,0.2)', borderRadius: '8px', px: 1.5, py: 1 }}>
                                {error}
                            </Typography>
                        )}
                        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
                            <Box>
                                <Typography sx={{ fontFamily: 'Jost, sans-serif', fontSize: '0.75rem', fontWeight: 600, color: '#9e8a7a', mb: 0.5, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Word ID</Typography>
                                <Typography sx={{ fontFamily: 'Jost, sans-serif', fontSize: '0.95rem', color: '#2c1a0e' }}>{wordId}</Typography>
                            </Box>
                        </Box>
                        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
                            <TextField label="Arabic (plain)" value={wordAr} onChange={e => setWordAr(e.target.value)} fullWidth size="small" sx={fieldSx} />
                            <TextField label="Arabic (diacritic)" value={wordDi} onChange={e => setWordDi(e.target.value)} fullWidth size="small" sx={fieldSx} />
                        </Box>
                        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
                            <TextField label="Transliteration" value={wordTr} onChange={e => setWordTr(e.target.value)} fullWidth size="small" sx={fieldSx} />
                            <TextField label="Root" value={root} onChange={e => setRoot(e.target.value)} fullWidth size="small" sx={fieldSx} />
                        </Box>
                        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
                            <TextField label="Level" value={level} onChange={e => setLevel(e.target.value)} fullWidth size="small" sx={fieldSx} />
                            <TextField label="Theme" value={theme} onChange={e => setTheme(e.target.value)} fullWidth size="small" sx={fieldSx} />
                        </Box>
                        <TextField label="Forms (JSON)" value={formsJson} onChange={e => setFormsJson(e.target.value)} fullWidth multiline rows={4} size="small" sx={fieldSx} />
                        <TextField label="Definitions (JSON)" value={defsJson} onChange={e => setDefsJson(e.target.value)} fullWidth multiline rows={4} size="small" sx={fieldSx} />
                        <TextField label="Examples (JSON)" value={examplesJson} onChange={e => setExamplesJson(e.target.value)} fullWidth multiline rows={4} size="small" sx={fieldSx} />
                    </Box>
                )}
            </DialogContent>
            <DialogActions sx={{ px: 2.5, pb: 2.5, pt: 0.5, flexDirection: { xs: 'column', sm: 'row' }, gap: 1 }}>
                <Button variant="outlined" color="error" onClick={handleDelete} disabled={deleting || saving || loading} startIcon={<Delete sx={{ fontSize: '1rem' }} />}
                    sx={{ fontFamily: 'Jost, sans-serif', fontWeight: 600, fontSize: '0.9rem', textTransform: 'none', borderRadius: '10px', order: { xs: 2, sm: 0 }, width: { xs: '100%', sm: 'auto' } }}>
                    {deleting ? 'Deleting…' : 'Delete'}
                </Button>
                <Box sx={{ flex: 1 }} />
                <Button variant="outlined" onClick={onClose} disabled={saving || deleting}
                    sx={{ fontFamily: 'Jost, sans-serif', fontWeight: 600, fontSize: '0.9rem', textTransform: 'none', borderRadius: '10px', borderColor: 'rgba(122,110,101,0.3)', color: '#7a6e65', width: { xs: '100%', sm: 'auto' } }}>
                    Cancel
                </Button>
                <Button variant="contained" onClick={handleSave} disabled={saving || deleting || loading} startIcon={<Save sx={{ fontSize: '1rem' }} />}
                    sx={{ background: '#2c1a0e', color: '#f5ede0', fontFamily: 'Jost, sans-serif', fontWeight: 600, fontSize: '0.9rem', textTransform: 'none', borderRadius: '10px', width: { xs: '100%', sm: 'auto' }, '&:hover': { background: '#1a0f08' } }}>
                    {saving ? 'Saving…' : 'Save'}
                </Button>
            </DialogActions>
        </Dialog>
    )
}

export default AdminEditDialog
