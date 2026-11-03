import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { expect, it } from 'vitest'
import UserAvatar from './UserAvatar'
it('updates the navbar image from changed canonical metadata and keeps a safe initials fallback', async () => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })
  const host = document.createElement('div'); document.body.append(host); const root = createRoot(host)
  try {
    await act(async () => root.render(<UserAvatar name="Reader" metadata={{ avatar_url: '/api/profile-presets/profile-pictures/fox.png' }} />))
    expect(host.querySelector('img')?.getAttribute('src')).toBe('/api/profile-presets/profile-pictures/fox.png')
    await act(async () => root.render(<UserAvatar name="Reader" metadata={{ avatar_url: '/api/profile-presets/profile-pictures/owl.png' }} />))
    expect(host.querySelector('img')?.getAttribute('src')).toBe('/api/profile-presets/profile-pictures/owl.png')
    await act(async () => root.render(<UserAvatar name="Reader" metadata={{ avatar_url: 'javascript:bad' }} />))
    expect(host.querySelector('img')).toBeNull(); expect(host.textContent).toBe('R')
  } finally { await act(async () => root.unmount()); host.remove() }
})
