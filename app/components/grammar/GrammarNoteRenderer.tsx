import { Box, Typography } from '@mui/material'
import { grammarTerminology } from '@/app/lib/grammarTerminology'

export interface RenderableGrammarNote {
  id: string
  title_en: string
  title_ar: string
  rule_cefr: string
  status: string
  explanation: string
  detail: string
  mechanics?: string
  recognition_tip?: string
  transformations?: string[]
  related_ids?: string[]
  examples?: {
    id: string
    arabic: string
    english: string
    highlight: string
    explanation: string
    source_title: string
    parent_title?: string | null
    source_timestamp?: string | null
    source_order?: number
    example_cefr?: string | null
  }[]
}

export default function GrammarNoteRenderer({
  note,
  preview = false,
}: {
  note: RenderableGrammarNote
  preview?: boolean
}) {
  if (!preview && note.status !== 'approved') return null
  const sections = [
    ['The idea', note.explanation],
    ['What is happening?', note.mechanics],
    ['How to spot it', note.recognition_tip],
  ]
  return (
    <Box
      component="article"
      aria-label={grammarTerminology(note.title_en)}
      sx={{ overflowWrap: 'anywhere' }}
    >
      <Typography component="h2" variant="h5">
        {grammarTerminology(note.title_en)}
      </Typography>
      <Typography
        lang="ar"
        dir="rtl"
        sx={{ fontFamily: 'var(--font-book-naskh)', fontSize: 26, lineHeight: 2 }}
      >
        {note.title_ar}
      </Typography>
      <Typography variant="caption">Rule {note.rule_cefr}</Typography>
      {sections.map(([heading, text]) =>
        text ? (
          <Box key={heading} sx={{ mt: 2 }}>
            <Typography component="h3" variant="h6">
              {heading}
            </Typography>
            <Typography sx={{ whiteSpace: 'pre-wrap' }}>{grammarTerminology(text)}</Typography>
          </Box>
        ) : null,
      )}
      {!!note.transformations?.length && (
        <Box sx={{ my: 2 }}>
          <Typography component="h3" variant="h6">
            Transformations
          </Typography>
          {note.transformations.map((value, index) => (
            <Typography key={index} dir="auto" sx={{ whiteSpace: 'pre-wrap' }}>
              {grammarTerminology(value)}
            </Typography>
          ))}
        </Box>
      )}
      {!!note.examples?.length && (
        <Typography component="h3" variant="h6" sx={{ mt: 2 }}>
          Real examples
        </Typography>
      )}
      {note.examples?.map((example) => {
        const index = example.arabic.indexOf(example.highlight)
        return (
          <Box key={example.id} sx={{ mt: 2 }}>
            <Typography
              lang="ar"
              dir="rtl"
              sx={{ fontFamily: 'var(--font-book-naskh)', fontSize: 25, lineHeight: 2 }}
            >
              {index < 0 || !example.highlight ? (
                example.arabic
              ) : (
                <>
                  {example.arabic.slice(0, index)}
                  <mark
                    style={{
                      background: 'color-mix(in srgb,var(--awm-gold) 30%,transparent)',
                      color: 'inherit',
                    }}
                  >
                    {example.highlight}
                  </mark>
                  {example.arabic.slice(index + example.highlight.length)}
                </>
              )}
            </Typography>
            <Typography>{example.english}</Typography>
            {example.explanation && (
              <Typography>{grammarTerminology(example.explanation)}</Typography>
            )}
            <Typography variant="caption">
              {example.parent_title ? `${example.parent_title} → ` : ''}
              {example.source_title}
              {example.source_timestamp ? ` · ${example.source_timestamp}` : ''}
              {example.example_cefr ? ` · Example ${example.example_cefr}` : ''}
            </Typography>
          </Box>
        )
      })}
      {note.detail && (
        <Box sx={{ mt: 2 }}>
          <Typography component="h3" variant="h6">
            Advanced note
          </Typography>
          <Typography sx={{ whiteSpace: 'pre-wrap' }}>{grammarTerminology(note.detail)}</Typography>
        </Box>
      )}
    </Box>
  )
}
