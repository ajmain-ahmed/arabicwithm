'use client'
import {Box,Button} from '@mui/material'
import {ArrowForward,FormatListBulleted} from '@mui/icons-material'
export default function ChapterNavigation({bookSlug,nextChapterSlug}:{bookSlug:string;nextChapterSlug?:string}){return (
        <Box component="nav" aria-label="Chapter navigation" sx={{ display: 'grid', gridTemplateColumns: nextChapterSlug ? 'repeat(2,minmax(0,1fr))' : 'minmax(0,280px)', justifyContent: 'center', alignItems: 'stretch', gap: { xs: 1, sm: 1.5 }, mt: 3, '& .MuiButton-root': { minHeight: 48, px: {xs: 1, sm: 2}, fontSize: {xs: 13, sm: 15} } }}>
          <Button href={`/books/${encodeURIComponent(bookSlug)}`} startIcon={<FormatListBulleted />} variant="outlined" sx={{ color: 'var(--awm-muted)', borderColor: 'rgba(122,110,101,0.3)', textTransform: 'none', fontFamily: 'var(--font-sans), sans-serif' }}>
              All Chapters
          </Button>
          {nextChapterSlug && (
            <Button href={`/books/${encodeURIComponent(bookSlug)}/${encodeURIComponent(nextChapterSlug)}`} endIcon={<ArrowForward />} variant="contained" sx={{ maxWidth: '100%', bgcolor: '#b8860b', color: '#fff', textTransform: 'none', fontFamily: 'var(--font-sans), sans-serif', '&:hover': { bgcolor: '#946c08' } }}>
              Next Chapter
            </Button>
          )}
        </Box>
)}
