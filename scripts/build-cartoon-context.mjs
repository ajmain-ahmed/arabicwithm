import { readFileSync, readdirSync, writeFileSync } from 'fs'
import { join, resolve } from 'path'
import matter from 'gray-matter'

const CONTENT_DIR = resolve(process.cwd(), 'content/cartoons')

function stripDiacritics(str) {
  return str.replace(/[\u064B-\u065F\u0670\u0640]/g, '')
}

function parseTableRow(line) {
  if (!line.startsWith('|')) return []
  return line.split('|').slice(1, -1).map(c => c.trim()).filter((_, i, arr) => !(i === arr.length - 1 && arr[i] === ''))
}

function isTableDivider(line) {
  return /^\|?\s*[-:]+\s*(\|\s*[-:]+\s*)*\|?\s*$/.test(line)
}

function parseMarkdownTable(lines, startIdx) {
  const rows = []
  let i = startIdx
  while (i < lines.length) {
    const line = lines[i].trim()
    if (!line.startsWith('|')) break
    if (isTableDivider(line)) { i++; continue }
    const cols = parseTableRow(line)
    if (cols.length > 0) rows.push(cols)
    i++
  }
  return { rows, nextIdx: i }
}

const map = {}

const shows = readdirSync(CONTENT_DIR, { withFileTypes: true })
  .filter(d => d.isDirectory())
  .map(d => d.name)

for (const showSlug of shows) {
  const showDir = join(CONTENT_DIR, showSlug)
  const metaPath = join(showDir, '_meta.json')
  let showTitle = showSlug
  try {
    const meta = JSON.parse(readFileSync(metaPath, 'utf8'))
    showTitle = meta.title || showSlug
  } catch {}

  const files = readdirSync(showDir).filter(f => f.endsWith('.md') && !f.startsWith('_'))

  for (const file of files) {
    const epSlug = file.replace(/\.md$/, '')
    const raw = readFileSync(join(showDir, file), 'utf8')
    const { content } = matter(raw)
    const lines = content.split('\n')

    let i = 0
    while (i < lines.length) {
      const line = lines[i].trim()

      if (line.startsWith('### ')) {
        const tsMatch = line.match(/^###\s+(?:(\d+):)?(\d{1,2}):(\d{2})/)
        const timestamp = tsMatch
          ? parseInt(tsMatch[1] || '0', 10) * 3600 + parseInt(tsMatch[2], 10) * 60 + parseInt(tsMatch[3], 10)
          : null

        let english = ''
        i++

        while (i < lines.length) {
          const l = lines[i].trim()
          if (l.startsWith('## ') || l.startsWith('### ')) break
          if (l === '---') { i++; continue }
          if (l.startsWith('**English:**')) {
            english = l.replace(/^\*\*English:\*\*\s*/, '').trim()
          }
          if (l.startsWith('|')) {
            if (isTableDivider(l)) { i++; continue }
            const headerCols = parseTableRow(l)
            const isWordTable = headerCols.some(c => c.toLowerCase().includes('arabic')) &&
              headerCols.some(c => c.toLowerCase().includes('cefr'))

            if (isWordTable && headerCols.length >= 4) {
              i++
              const { rows, nextIdx } = parseMarkdownTable(lines, i)
              i = nextIdx
              for (const cols of rows) {
                if (cols.length >= 4) {
                  const arabic = cols[0]
                  const plain = stripDiacritics(arabic)
                  if (!map[plain]) map[plain] = []
                  // Avoid duplicates for same episode
                  const existing = map[plain].find(ctx => ctx.show === showTitle && ctx.episode === epSlug)
                  if (!existing) {
                    map[plain].push({ show: showTitle, episode: epSlug, timestamp, arabic, english })
                  }
                }
              }
              continue
            }
            i++
            continue
          }
          i++
        }
        continue
      }
      i++
    }
  }
}

writeFileSync(resolve(process.cwd(), 'public/cartoon-word-context.json'), JSON.stringify(map))
console.log(`Built cartoon context map: ${Object.keys(map).length} words`)
