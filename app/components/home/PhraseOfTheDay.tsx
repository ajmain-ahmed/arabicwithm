import { Box, Paper, Typography } from '@mui/material'
import type { DailyPhrase } from '@/app/lib/dailyPhrase'

export default function PhraseOfTheDay({ phrase }: { phrase: DailyPhrase | null }) {
  if (!phrase) return null
  return (
    <Paper
      component="section"
      aria-labelledby="daily-phrase-title"
      elevation={0}
      sx={{
        p: 2.5,
        mt: 2.5,
        borderRadius: '10px',
        bgcolor: 'var(--awm-white)',
        color: 'var(--awm-bark)',
        border: '1px solid color-mix(in srgb, var(--awm-gold) 25%, transparent)',
        overflowWrap: 'anywhere',
      }}
    >
      <Typography
        id="daily-phrase-title"
        component="h2"
        sx={{ fontFamily: 'var(--font-heading)', fontSize: 20, fontWeight: 600 }}
      >
        Phrase of the Day
      </Typography>
      <Typography
        lang="ar"
        dir="rtl"
        sx={{ fontFamily: 'var(--font-book-naskh)', fontSize: 30, lineHeight: 2, mt: 1.5 }}
      >
        {phrase.arabic}
      </Typography>
      {phrase.words.length > 0 && (
        <Box
          dir="rtl"
          sx={{
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'flex-start',
            gap: '12px 18px',
            mt: 1,
          }}
        >
          {phrase.words.map((word, index) => (
            <Box
              key={index}
              sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                maxWidth: '100%',
                minWidth: 0,
              }}
            >
              <Typography
                lang="ar"
                sx={{ fontFamily: 'var(--font-book-naskh)', fontSize: 24, lineHeight: 2 }}
              >
                {word.arabic}
              </Typography>
              <Typography
                dir="ltr"
                sx={{
                  fontFamily: 'var(--font-sans)',
                  fontSize: 13,
                  textAlign: 'center',
                  maxWidth: 120,
                  color: 'var(--awm-muted)',
                }}
              >
                {word.english}
              </Typography>
            </Box>
          ))}
        </Box>
      )}
      <Typography
        dir="ltr"
        sx={{ fontFamily: 'var(--font-sans)', fontSize: 16, fontWeight: 500, mt: 2 }}
      >
        {phrase.english}
      </Typography>
    </Paper>
  )
}
