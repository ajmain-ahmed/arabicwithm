/** Extractive summaries and evidence-based topics; no generated plot claims. */
export function metadataFromTranscript(transcript) {
  const value = typeof transcript === 'string' ? (() => { try { return JSON.parse(transcript) } catch { return null } })() : transcript
  const blocks = Array.isArray(value) ? value : value?.scriptBlocks
  if (!Array.isArray(blocks)) return null
  const lines = blocks.map(block => String(block?.translation ?? block?.english ?? '').replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim()).filter(line => /[a-z]{3}/i.test(line))
  if (!lines.length) return null
  const text = lines.join(' ')
  const subjects = [
    ['Family', /\b(mother|father|sister|brother|parents|daughter|son)\b/i],
    ['School', /\b(school|teacher|classroom|homework|university)\b/i],
    ['Friendship', /\b(friend|friends|friendship)\b/i],
    ['Food', /\b(food|cook|cooking|eat|hungry|meal|restaurant)\b/i],
    ['Travel', /\b(journey|travel|airport|train|flight)\b/i],
    ['Faith', /\b(Allah|God|pray|prayer|faith|believe)\b/i],
    ['Work', /\b(work|job|boss|business|office)\b/i],
    ['Sport', /\b(match|football|basketball|coach|goal|tournament)\b/i],
    ['Health', /\b(doctor|hospital|medicine|injury|injured)\b/i],
    ['Conflict', /\b(fight|attack|enemy|battle|war)\b/i],
  ].filter(([, pattern]) => pattern.test(text)).map(([label]) => label)
  const excerpt = lines.slice(0, 3).join(' ').slice(0, 330)
  return { description: `In this scene: “${excerpt}${lines.slice(0, 3).join(' ').length > 330 ? '…' : ''}”`, tags: subjects.slice(0, 5) }
}
export function missingMetadataPatch(episode) {
  if (episode.description?.trim() && episode.tags?.length) return null
  const inferred = metadataFromTranscript(episode.transcript)
  if (!inferred) return null
  const patch = {}
  if (!episode.description?.trim()) patch.description = inferred.description
  if (!episode.tags?.length && inferred.tags.length) patch.tags = inferred.tags
  return Object.keys(patch).length ? patch : null
}
