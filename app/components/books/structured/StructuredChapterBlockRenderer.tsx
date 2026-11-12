import { items, record, text, structuredWarning } from '@/app/lib/structuredChapter'
import { TextPair, Titles, Notice } from './StructuredText'
import { HighlightedSentence, StructuredTable, Example } from './GrammarBlocks'
import StructuredDiagram from './StructuredDiagram'
import styles from './StructuredChapter.module.css'

export default function StructuredChapterBlockRenderer({ value, depth = 0, ancestors = new Set<object>() }: { value: unknown; depth?: number; ancestors?: ReadonlySet<object> }) {
  const block = record(value)
  if (!block || depth >= 20 || ancestors.has(block)) {
    structuredWarning(`Unreadable or excessively nested block at depth ${depth}.`)
    return <Notice>This part of the lesson could not be displayed.</Notice>
  }
  switch (block.type) {
    case 'paragraph': return text(block.text_ar) || text(block.text_en) ? <div><TextPair value={block} /></div> : <Notice>This paragraph is unavailable.</Notice>
    case 'highlighted-sentence': return <HighlightedSentence block={block} />
    case 'table': return <StructuredTable block={block} />
    case 'example': return <Example block={block} />
    case 'diagram': return <StructuredDiagram block={block} />
    case 'collapsible': {
      const nextAncestors = new Set(ancestors); nextAncestors.add(block)
      return <details open={block.default_open === true}>
        <summary>{text(block.title_ar) && <span lang="ar" dir="rtl">{text(block.title_ar)}</span>}{text(block.title_ar) && text(block.title_en) ? ' / ' : ''}{text(block.title_en) || (!text(block.title_ar) ? 'More detail' : '')}</summary>
        <div className={styles.blocks}>{items(block.content).map((nested, index) => <StructuredChapterBlockRenderer key={index} value={nested} depth={depth + 1} ancestors={nextAncestors} />)}</div>
      </details>
    }
    default:
      structuredWarning(`Unsupported block type: ${text(block.type) || '(missing type)'}.`)
      return <div><Titles value={block} /><Notice>This part of the lesson is not supported yet.</Notice></div>
  }
}
