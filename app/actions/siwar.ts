'use server'

const SIWAR_API_KEY = process.env.SIWAR
const SIWAR_BASE_URL = 'https://siwar.ksaa.gov.sa'

export type SiwarSearchResult = {
  _id: string
  lexiconName: string
  lexicalEntryId: string
  lexiconId: string
  lemma: string
  lemmaType: string
  lemmaAudio: string | null
  root: string | null
  pos: string | null
  pattern: string
  senses: SiwarSense[]
  wordForms: unknown[]
  search: string
  nonDiacriticsLemma: string
}

export type SiwarSense = {
  definition: string
  contexts: string[]
  examples: string[]
  relations: unknown[]
  image: string | null
  translations: { word: string; language: string; languageLabel: string }[]
  domains: string[]
  tags: string[]
}

export type SiwarSenseResult = {
  lemma: string
  lexiconName: string
  senses: string[]
}

export type SiwarExampleResult = {
  lemma: string
  lexiconName: string
  examples: string[]
}

export type SiwarLexicon = {
  id: string
  name: string
  description: string
}

async function siwarFetch<T>(endpoint: string, params?: Record<string, string>): Promise<T> {
  if (!SIWAR_API_KEY) {
    throw new Error('SIWAR API key not configured')
  }

  const url = new URL(`${SIWAR_BASE_URL}${endpoint}`)
  if (params) {
    Object.entries(params).forEach(([k, v]) => {
      if (v) url.searchParams.set(k, v)
    })
  }

  const res = await fetch(url.toString(), {
    headers: {
      apikey: SIWAR_API_KEY,
      Accept: 'application/json',
    },
    next: { revalidate: 86400 },
  })

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`Siwar API ${res.status}: ${text}`)
  }

  return res.json() as Promise<T>
}

export async function siwarSearch(query: string): Promise<SiwarSearchResult[]> {
  if (!query.trim()) return []
  return siwarFetch('/api/v1/external/public/search', { query: query.trim() })
}

export async function siwarSenses(query: string): Promise<SiwarSenseResult[]> {
  if (!query.trim()) return []
  return siwarFetch('/api/v1/external/public/senses', { query: query.trim() })
}

export async function siwarExamples(query: string): Promise<SiwarExampleResult[]> {
  if (!query.trim()) return []
  return siwarFetch('/api/v1/external/public/examples', { query: query.trim() })
}

export async function siwarSynonyms(query: string): Promise<unknown[]> {
  if (!query.trim()) return []
  return siwarFetch('/api/v1/external/public/synonyms', { query: query.trim() })
}

export async function siwarOpposites(query: string): Promise<unknown[]> {
  if (!query.trim()) return []
  return siwarFetch('/api/v1/external/public/opposites', { query: query.trim() })
}

export async function siwarPos(query: string): Promise<unknown[]> {
  if (!query.trim()) return []
  return siwarFetch('/api/v1/external/public/pos', { query: query.trim() })
}

export async function siwarRoot(query: string): Promise<unknown[]> {
  if (!query.trim()) return []
  return siwarFetch('/api/v1/external/public/root', { query: query.trim() })
}

export async function siwarPattern(query: string): Promise<unknown[]> {
  if (!query.trim()) return []
  return siwarFetch('/api/v1/external/public/pattern', { query: query.trim() })
}

export async function siwarConjugations(query: string): Promise<unknown[]> {
  if (!query.trim()) return []
  return siwarFetch('/api/v1/external/public/conjugations', { query: query.trim() })
}

export async function siwarLexicons(): Promise<SiwarLexicon[]> {
  return siwarFetch('/api/v1/external/public/lexicons')
}
