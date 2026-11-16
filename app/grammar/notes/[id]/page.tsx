import { notFound } from 'next/navigation'
import { Container } from '@mui/material'
import Button from '@/app/components/RouteButton'
import { z } from 'zod'
import { fetchCanonicalGrammarNote } from '@/app/actions/canonicalGrammar'
import GrammarNoteRenderer from '@/app/components/grammar/GrammarNoteRenderer'
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  if (!z.string().uuid().safeParse(id).success) notFound()
  const note = await fetchCanonicalGrammarNote(id)
  if (!note) notFound()
  const parent = ['A1','A2','B1','B2','C1','C2'].includes(note.rule_cefr) ? `/grammar/context/${note.rule_cefr}` : '/grammar/context'
  return <Container maxWidth="md" sx={{ py: 4 }}><Button href={parent} sx={{ mb: 3 }}>Back to Grammar Notes</Button><GrammarNoteRenderer note={note} /></Container>
}
