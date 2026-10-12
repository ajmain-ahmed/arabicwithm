import { vi } from 'vitest'

// Interaction tests do not need to compile every icon in MUI's barrel. Keep
// their names and rendered SVGs while production builds check real exports.
// Individual tests can still override this mock with their own icon fixtures.
vi.mock('@mui/icons-material', async () => {
  const { createElement } = await import('react')
  const { readFileSync } = await import('node:fs')
  const source = readFileSync('node_modules/@mui/icons-material/index.mjs', 'utf8')
  const Icon = (props: Record<string, unknown>) => createElement('svg', { 'aria-hidden': true, 'data-testid': props['data-testid'] })
  const names = [...source.matchAll(/export\s*\{\s*default\s+as\s+(\w+)\s*\}/g)].map(match => match[1])
  if (!names.length) throw new Error('Unable to read the installed MUI icon exports')
  return Object.fromEntries(names.map(name => [name, Icon]))
})
