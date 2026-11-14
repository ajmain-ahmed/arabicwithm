import { items, record, text, structuredWarning, type StructuredRecord } from '@/app/lib/structuredChapter'
import { Label, Notice, TextPair } from './StructuredText'
import styles from './StructuredChapter.module.css'
import { Fragment } from 'react'

/** Bounded topological layers; cycles and dangling edges cannot trap rendering. */
export default function StructuredDiagram({ block }: { block: StructuredRecord }) {
  const nodes = items(block.nodes).flatMap((value, index) => {
    const node = record(value)
    return node ? [{ ...node, id: text(node.id) || `node-${index}` }] : []
  })
  const byId = new Map(nodes.map(node => [node.id, node]))
  const edges = items(block.edges).flatMap(value => {
    const edge = record(value)
    if (!edge) return []
    const source = text(edge.source ?? edge.from ?? edge.source_id), target = text(edge.target ?? edge.to ?? edge.target_id)
    if (!byId.has(source) || !byId.has(target)) { structuredWarning('Diagram edge has an unknown node.'); return [] }
    return [{ ...edge, source, target }]
  })
  if (!nodes.length) return <Notice>This lesson diagram is unavailable.</Notice>
  const remaining = new Map(byId), levels: typeof nodes[] = []
  const degree = new Map(nodes.map(node => [node.id, 0]))
  const children = new Map<string, string[]>()
  for (const edge of edges) {
    degree.set(edge.target, (degree.get(edge.target) ?? 0) + 1)
    children.set(edge.source, [...children.get(edge.source) ?? [], edge.target])
  }
  let layer = nodes.filter(node => degree.get(node.id) === 0)
  while (layer.length) {
    levels.push(layer)
    const next: typeof nodes = []
    for (const node of layer) {
      remaining.delete(node.id)
      for (const child of children.get(node.id) ?? []) {
        degree.set(child, degree.get(child)! - 1)
        if (degree.get(child) === 0) next.push(byId.get(child)!)
      }
    }
    layer = next
  }
  if (remaining.size) { structuredWarning('Diagram has a cycle; displaying its remaining nodes together.'); levels.push([...remaining.values()]) }
  const sequence=levels.flat()
  const linear=edges.length===nodes.length-1&&sequence.slice(1).every((node,index)=>edges.some(edge=>edge.source===sequence[index].id&&edge.target===node.id))
  if (block.layout === 'morphology' && block.direction !== 'top-down' && linear) return <figure className={styles.diagram} style={{margin:0}} aria-label={text(block.caption_en) || 'Morphology transformation'}>
    <div className={styles.flow} role="region" aria-label="Morphology transformation steps" dir={block.direction === 'rtl' ? 'rtl' : 'ltr'} tabIndex={0}>{sequence.map((node,index) => <Fragment key={node.id}>{index>0&&<div className={styles.flowArrow}><span aria-label="leads to">{block.direction === 'rtl' ? '←' : '→'}</span><div className={styles.edgeLabel}><Label value={edges.find(edge=>edge.source===sequence[index-1].id&&edge.target===node.id)} /></div></div>}<div className={styles.node} data-node-id={node.id}><Label value={node} /></div></Fragment>)}</div>
    <figcaption className={styles.caption}><TextPair value={block} arabic="caption_ar" english="caption_en" /></figcaption>
  </figure>
  return <figure className={styles.diagram} style={{ margin: 0 }} aria-label={text(block.caption_en) || 'Lesson relationship diagram'}>
    <div className={styles.levels}>{levels.map((level, index) => <div key={index}>
      {index > 0 && <div aria-hidden="true" style={{ textAlign: 'center', color: 'var(--awm-gold)', fontSize: '1.5em' }}>↓</div>}
      <div className={styles.level}>{level.map(node => <div className={styles.node} key={node.id}><Label value={node} /></div>)}</div>
    </div>)}</div>
    {!!edges.length && <ul className={styles.relationships} aria-label="Directional relationships">{edges.map((edge, index) => <li key={index}>
      <div className={styles.relationship} dir="ltr"><div><Label value={byId.get(edge.source)} /></div><span aria-label="leads to">→</span><div><Label value={byId.get(edge.target)} /></div></div>
      <div className={styles.edgeLabel}><Label value={edge} /></div>
    </li>)}</ul>}
    {(text(block.caption_ar) || text(block.caption_en)) && <figcaption className={styles.caption}><TextPair value={block} arabic="caption_ar" english="caption_en" /></figcaption>}
  </figure>
}
