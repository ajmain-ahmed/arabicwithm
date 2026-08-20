'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Box,
  Button,
  CircularProgress,
  IconButton,
  Paper,
  TextField,
  Typography,
} from '@mui/material'
import { Add, Delete, Save } from '@mui/icons-material'
import { updateChapterContent } from '@/app/actions/admin'
import type { PublicBookBlock, PublicBookToken } from '@/app/actions/books'
import { groupChapterBlocks } from '@/app/lib/bookParagraphs'
import { errorMessage } from '@/app/lib/errors'

type EditableToken = {
  arabic: string
  prefix: string
  suffix: string
  headword: string
  english: string
  transliteration: string
  pos: string
  cefr: string
  entryType: 'word' | 'phrase'
}

type EditableBlock = {
  tokens: EditableToken[]
  translation: string
  punctuation: string
  paragraph: number
}

const EMPTY_TOKEN: EditableToken = {
  arabic: '',
  prefix: '',
  suffix: '',
  headword: '',
  english: '',
  transliteration: '',
  pos: '',
  cefr: '',
  entryType: 'word',
}

function toEditableBlocks(chapterSlug: string, content: PublicBookBlock[]): EditableBlock[] {
  const paragraphByBlock = new Map<PublicBookBlock, number>()
  groupChapterBlocks(chapterSlug, content).forEach((paragraph, paragraphIndex) => {
    paragraph.forEach((block) => paragraphByBlock.set(block, paragraphIndex + 1))
  })

  return content.map((block) => ({
    paragraph: block.paragraph ?? paragraphByBlock.get(block) ?? 1,
    translation: block.translation,
    punctuation: block.punctuation ?? '',
    tokens: block.tokens.map((token) => ({
      arabic: token.arabic,
      prefix: token.prefix ?? '',
      suffix: token.suffix ?? '',
      headword: token.headword ?? '',
      english: token.english ?? '',
      transliteration: token.transliteration ?? '',
      pos: token.pos ?? '',
      cefr: token.cefr ?? '',
      entryType: token.entryType ?? 'word',
    })),
  }))
}

function cleanOptional(value: string): string | undefined {
  const cleaned = value.trim()
  return cleaned || undefined
}

function toPublicContent(blocks: EditableBlock[]): PublicBookBlock[] {
  return blocks.flatMap((block) => {
    const tokens: PublicBookToken[] = block.tokens.flatMap((token) => {
      const arabic = token.arabic.trim()
      if (!arabic) return []
      return [{
        arabic,
        prefix: cleanOptional(token.prefix),
        suffix: cleanOptional(token.suffix),
        headword: cleanOptional(token.headword),
        english: cleanOptional(token.english),
        transliteration: cleanOptional(token.transliteration),
        pos: cleanOptional(token.pos),
        cefr: cleanOptional(token.cefr),
        entryType: token.entryType,
      }]
    })

    const translation = block.translation.trim()
    if (tokens.length === 0 && !translation) return []
    return [{
      tokens,
      translation,
      punctuation: cleanOptional(block.punctuation),
      paragraph: Math.max(1, Math.trunc(block.paragraph) || 1),
    }]
  })
}

function toStoredContent(content: PublicBookBlock[]) {
  return content.map((block) => ({
    tokens: block.tokens.map((token) => ({
      arabic: token.arabic,
      ...(token.prefix ? { prefix: token.prefix } : {}),
      ...(token.suffix ? { suffix: token.suffix } : {}),
      ...(token.headword ? { headword: token.headword } : {}),
      ...(token.english ? { english: token.english } : {}),
      ...(token.transliteration ? { transliteration: token.transliteration } : {}),
      ...(token.pos ? { pos: token.pos } : {}),
      ...(token.cefr ? { cefr: token.cefr } : {}),
      entry_type: token.entryType ?? 'word',
    })),
    translation: block.translation,
    ...(block.punctuation ? { punctuation: block.punctuation } : {}),
    paragraph: block.paragraph ?? 1,
  }))
}

export default function InlineChapterAdminEditor({
  chapterId,
  chapterSlug,
  content,
  onClose,
  onSaved,
}: {
  chapterId: string
  chapterSlug: string
  content: PublicBookBlock[]
  onClose: () => void
  onSaved: (content: PublicBookBlock[]) => void
}) {
  const router = useRouter()
  const [blocks, setBlocks] = useState<EditableBlock[]>(() => toEditableBlocks(chapterSlug, content))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setBlocks(toEditableBlocks(chapterSlug, content))
  }, [chapterSlug, content])

  const updateBlock = (blockIndex: number, patch: Partial<EditableBlock>) => {
    setBlocks((current) => current.map((block, index) => index === blockIndex ? { ...block, ...patch } : block))
  }

  const updateToken = (blockIndex: number, tokenIndex: number, field: keyof EditableToken, value: string) => {
    setBlocks((current) => current.map((block, index) => index !== blockIndex ? block : {
      ...block,
      tokens: block.tokens.map((token, currentTokenIndex) => currentTokenIndex === tokenIndex ? { ...token, [field]: value } : token),
    }))
  }

  const addToken = (blockIndex: number) => {
    setBlocks((current) => current.map((block, index) => index === blockIndex
      ? { ...block, tokens: [...block.tokens, { ...EMPTY_TOKEN }] }
      : block))
  }

  const deleteToken = (blockIndex: number, tokenIndex: number) => {
    setBlocks((current) => current.map((block, index) => index === blockIndex
      ? { ...block, tokens: block.tokens.filter((_, currentTokenIndex) => currentTokenIndex !== tokenIndex) }
      : block))
  }

  const addBlock = (newParagraph: boolean) => {
    setBlocks((current) => {
      const lastParagraph = current.at(-1)?.paragraph ?? 1
      return [...current, {
        tokens: [{ ...EMPTY_TOKEN }],
        translation: '',
        punctuation: '',
        paragraph: newParagraph ? lastParagraph + 1 : lastParagraph,
      }]
    })
  }

  const deleteBlock = (blockIndex: number) => {
    if (!window.confirm('Delete this sentence from the chapter draft?')) return
    setBlocks((current) => current.filter((_, index) => index !== blockIndex))
  }

  const save = async () => {
    setSaving(true)
    setError(null)
    try {
      const nextContent = toPublicContent(blocks)
      await updateChapterContent(chapterId, toStoredContent(nextContent))
      onSaved(nextContent)
      onClose()
      router.refresh()
    } catch (caught) {
      setError(errorMessage(caught) ?? 'Unable to save the chapter')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Box sx={{ px: { xs: 1.5, md: 3 }, py: { xs: 2, md: 3 }, bgcolor: 'var(--awm-cream-light)' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2, mb: 2, flexWrap: 'wrap' }}>
        <Box>
          <Typography sx={{ fontFamily: 'var(--font-heading)', fontSize: 25, fontWeight: 600, color: 'var(--awm-bark)' }}>Edit chapter text</Typography>
          <Typography sx={{ fontFamily: 'Jost, sans-serif', fontSize: 12.5, color: 'var(--awm-muted)' }}>Sentences with the same paragraph number are displayed together.</Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button onClick={onClose} disabled={saving} sx={{ color: 'var(--awm-muted)', textTransform: 'none' }}>Cancel</Button>
          <Button onClick={save} disabled={saving} variant="contained" startIcon={saving ? <CircularProgress size={15} color="inherit" /> : <Save />} sx={{ bgcolor: '#b8860b', color: '#fff', textTransform: 'none', '&:hover': { bgcolor: '#946c08' } }}>
            {saving ? 'Saving…' : 'Save chapter'}
          </Button>
        </Box>
      </Box>

      {error && <Typography role="alert" sx={{ mb: 2, p: 1.25, color: '#b42318', bgcolor: 'rgba(180,35,24,0.08)', borderRadius: '8px', fontFamily: 'Jost, sans-serif' }}>{error}</Typography>}

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {blocks.map((block, blockIndex) => (
          <Paper key={blockIndex} elevation={0} sx={{ p: { xs: 1.5, md: 2 }, border: '1px solid rgba(44,26,14,0.12)', borderRadius: '12px', bgcolor: 'var(--awm-white)' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
              <Typography sx={{ flex: 1, fontFamily: 'Jost, sans-serif', fontWeight: 700, color: 'var(--awm-bark)' }}>Sentence {blockIndex + 1}</Typography>
              <TextField
                label="Paragraph"
                type="number"
                size="small"
                value={block.paragraph}
                onChange={(event) => updateBlock(blockIndex, { paragraph: Math.max(1, Number(event.target.value) || 1) })}
                slotProps={{ htmlInput: { min: 1, step: 1 } }}
                sx={{ width: 112 }}
              />
              <IconButton onClick={() => deleteBlock(blockIndex)} aria-label={`Delete sentence ${blockIndex + 1}`} sx={{ color: '#b42318' }}><Delete /></IconButton>
            </Box>

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.25 }}>
              {block.tokens.map((token, tokenIndex) => (
                <Box key={tokenIndex} sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr auto', md: 'repeat(4, minmax(0, 1fr)) auto' }, gap: 1, p: 1.25, borderRadius: '9px', bgcolor: 'rgba(44,26,14,0.025)' }}>
                  <TextField label="Arabic word" value={token.arabic} onChange={(event) => updateToken(blockIndex, tokenIndex, 'arabic', event.target.value)} size="small" sx={{ '& input': { direction: 'rtl', fontFamily: 'var(--font-book-naskh)', fontSize: 19 } }} />
                  <TextField label="English meaning" value={token.english} onChange={(event) => updateToken(blockIndex, tokenIndex, 'english', event.target.value)} size="small" />
                  <TextField label="Headword" value={token.headword} onChange={(event) => updateToken(blockIndex, tokenIndex, 'headword', event.target.value)} size="small" sx={{ '& input': { direction: 'rtl' } }} />
                  <TextField label="Transliteration" value={token.transliteration} onChange={(event) => updateToken(blockIndex, tokenIndex, 'transliteration', event.target.value)} size="small" />
                  <TextField label="Prefix" value={token.prefix} onChange={(event) => updateToken(blockIndex, tokenIndex, 'prefix', event.target.value)} size="small" sx={{ '& input': { direction: 'rtl' } }} />
                  <TextField label="Suffix" value={token.suffix} onChange={(event) => updateToken(blockIndex, tokenIndex, 'suffix', event.target.value)} size="small" sx={{ '& input': { direction: 'rtl' } }} />
                  <TextField label="Part of speech" value={token.pos} onChange={(event) => updateToken(blockIndex, tokenIndex, 'pos', event.target.value)} size="small" />
                  <TextField label="CEFR" value={token.cefr} onChange={(event) => updateToken(blockIndex, tokenIndex, 'cefr', event.target.value)} size="small" />
                  <IconButton onClick={() => deleteToken(blockIndex, tokenIndex)} aria-label={`Delete word ${tokenIndex + 1} from sentence ${blockIndex + 1}`} sx={{ color: '#b42318', alignSelf: 'center' }}><Delete /></IconButton>
                </Box>
              ))}
            </Box>

            <Button onClick={() => addToken(blockIndex)} size="small" startIcon={<Add />} sx={{ mt: 1.25, color: '#0e2e1f', textTransform: 'none' }}>Add word</Button>
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 140px' }, gap: 1.25, mt: 1.5 }}>
              <TextField label="Sentence translation" value={block.translation} onChange={(event) => updateBlock(blockIndex, { translation: event.target.value })} fullWidth multiline minRows={2} />
              <TextField label="Punctuation" value={block.punctuation} onChange={(event) => updateBlock(blockIndex, { punctuation: event.target.value })} />
            </Box>
          </Paper>
        ))}
      </Box>

      <Box sx={{ display: 'flex', gap: 1, mt: 2, flexWrap: 'wrap' }}>
        <Button onClick={() => addBlock(false)} startIcon={<Add />} variant="outlined" sx={{ color: '#0e2e1f', borderColor: 'rgba(14,46,31,0.35)', textTransform: 'none' }}>Add sentence</Button>
        <Button onClick={() => addBlock(true)} startIcon={<Add />} variant="outlined" sx={{ color: '#b8860b', borderColor: 'rgba(184,134,11,0.4)', textTransform: 'none' }}>Add paragraph</Button>
      </Box>
    </Box>
  )
}
