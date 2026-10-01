import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import WordSearchDifficultySelector from './WordSearchDifficultySelector'

let host: HTMLDivElement
let root: Root

beforeEach(() => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    value: vi.fn().mockReturnValue({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() }),
  })
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
})

afterEach(async () => {
  await act(async () => root.unmount())
  host.remove()
})

describe('WordSearchDifficultySelector', () => {
  it('shows all levels, identifies the selected level, and reports changes', async () => {
    const onChange = vi.fn()
    await act(async () => root.render(<WordSearchDifficultySelector value="regular" onChange={onChange} />))

    const easy = host.querySelector<HTMLButtonElement>('[aria-label="Easy difficulty, 10 by 10 grid"]')
    const regular = host.querySelector<HTMLButtonElement>('[aria-label="Regular difficulty, 14 by 14 grid"]')
    const hard = host.querySelector<HTMLButtonElement>('[aria-label="Hard difficulty, 18 by 18 grid"]')
    expect(easy?.getAttribute('aria-pressed')).toBe('false')
    expect(regular?.getAttribute('aria-pressed')).toBe('true')
    expect(hard?.getAttribute('aria-pressed')).toBe('false')

    await act(async () => hard!.click())
    expect(onChange).toHaveBeenCalledWith('hard')
  })
})
