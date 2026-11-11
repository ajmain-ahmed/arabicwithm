import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { beforeEach, afterEach, expect, it, vi } from 'vitest'
import type { PublicProfile } from '@/app/actions/profiles'
const mocks = vi.hoisted(() => ({ update: vi.fn(), getUser: vi.fn(), saveProfile:vi.fn(),listPresets:vi.fn(),status:vi.fn(),renew:vi.fn(), metadata: { book_progress: { story: { chapterSlug: 'one', updatedAt: '2026-10-01' }, other: { chapterSlug: 'two' } }, book_sentence_bookmark: { bookSlug: 'story' } } }))
vi.mock('@/app/actions/appLaunch',()=>({appLaunchPreference:vi.fn(async()=>false),setAppLaunchPreference:vi.fn(async()=>({ok:true,message:'Saved'}))}))
vi.mock('@/app/actions/profilePresets',()=>({listProfilePresets:mocks.listPresets}))
vi.mock('@/app/actions/profiles', () => ({ updateProfile:mocks.saveProfile, checkUsernameAvailability: vi.fn() }))
vi.mock('@/app/actions/premium', () => ({ fetchPremiumStatus: mocks.status, managePremium: vi.fn(), startPremiumCheckout: vi.fn(), setPremiumRenewal: mocks.renew }))
vi.mock('@/app/actions/feedback', () => ({ submitFeedback: vi.fn() }))
vi.mock('@/app/actions/support', () => ({ startSupportCheckout: vi.fn() }))
vi.mock('@/app/components/PremiumPrompt', () => ({ PremiumSection: () => null, default: ({open}:{open:boolean}) => open ? <div data-upgrade-popup>AWM+ information</div> : null }))
vi.mock('@/app/AuthContext', () => ({ useAuth: () => ({ loading: false, user: { id: 'user', user_metadata: mocks.metadata } }) }))
vi.mock('@/app/lib/supabase/client', () => ({ supabase: { auth: { updateUser: mocks.update, getUser: mocks.getUser } } }))
import ProfileView from './ProfileView'
import HomeQuickActions from '@/app/components/home/HomeQuickActions'
let host: HTMLDivElement, root: Root
function profile(premium = false): PublicProfile {
  return { id: 'user', own: true, displayName: 'Learner', username: null, isPublic: false, shareReading: false, joined: '2026-10-01', avatar: null, banner:null, avatarCrop: { x: 50, y: 50, zoom: 1 }, premium, summary: { streak: 0 }, shelf: [] }
}
beforeEach(() => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })
  host = document.createElement('div'); document.body.appendChild(host); root = createRoot(host)
  mocks.saveProfile.mockResolvedValue(undefined);mocks.listPresets.mockImplementation(async(bucket:string)=>[{ref:`${bucket}/fox.avif`,url:`/api/profile-presets/${bucket}/fox.avif`,label:'fox'}]);
  mocks.update.mockResolvedValue({ error: null }); mocks.getUser.mockResolvedValue({ data: { user: { id: 'user', user_metadata: mocks.metadata } }, error: null })
  mocks.status.mockResolvedValue({ premium: false, signedIn: true, manageable: false, admin: false, cancelAtPeriodEnd: false, periodEnd: null, paymentIssue: false, startedAt: null })
})
afterEach(async () => { await act(async () => root.unmount()); host.remove(); vi.clearAllMocks() })
it('renders genuine new-account empty states and only shows AWM Plus for eligible users', async () => {
  await act(async () => root.render(<ProfileView profile={profile()} />))
  expect(host.querySelector('[aria-label="AWM Plus"]')).toBeNull()
  expect(host.textContent).toContain('0 day streak')
  expect(host.querySelector('button[aria-label="Change profile photo"]')).toBeNull();expect(host.querySelector('input[type=file]')).toBeNull()
  await act(async () => root.render(<ProfileView profile={profile(true)} />))
  expect(host.querySelector('[aria-label="AWM Plus"]')).not.toBeNull()
})
it('shows the current streak from the profile summary', async () => {
  const value = profile()
  value.avatar = 'https://example.com/avatar.webp'
  value.summary = { streak: 3 }
  await act(async () => root.render(<ProfileView profile={value} />))
  expect(host.querySelector('img[alt="Learner"]')?.getAttribute('src')).toBe(value.avatar)
  expect(host.textContent).toContain('3 day streak')
  expect(host.textContent).not.toContain('Learning progress')
  expect(host.textContent).not.toContain('Your learning rhythm')
})
it('keeps learning shortcuts free of the separate Quick Actions Admin entry', async () => {
  await act(async () => root.render(<HomeQuickActions bookmarkHref="/books/story/one#sentence-4" bookmarkLabel="Story · One" />))
  const links = [...host.querySelectorAll('a')]
  expect(links.map(a => a.getAttribute('href'))).toEqual(['/books/story/one#sentence-4','/profile'])
  expect(links).toHaveLength(2);expect(host.querySelector('nav')?.getAttribute('aria-label')).toBe('Learning shortcuts')
  await act(async () => root.render(<HomeQuickActions bookmarkHref="/books" bookmarkLabel="Books" />))
  expect(host.querySelector('a[href="/admin/users"]')).toBeNull()
  expect(host.textContent).not.toContain('Reviewer')
})
it('never shows an upgrade button on the profile page', async () => {
  await act(async () => root.render(<ProfileView profile={profile(false)} />))
  expect([...host.querySelectorAll('button')].some(b => b.textContent === 'Upgrade to AWM+')).toBe(false)
  await act(async () => root.render(<ProfileView profile={profile(true)} />))
  expect([...host.querySelectorAll('button')].some(b => b.textContent === 'Upgrade to AWM+')).toBe(false)
  await act(async () => root.render(<ProfileView profile={{ ...profile(false), own: false }} />))
  expect([...host.querySelectorAll('button')].some(b => b.textContent === 'Upgrade to AWM+')).toBe(false)
})

async function clickText(text:string){await act(async()=>{[...(document.querySelector('[role=dialog]')??host).querySelectorAll('button')].find(b=>b.textContent===text)!.click()})}
async function clickLabel(label:string){await act(async()=>document.querySelector<HTMLButtonElement>(`button[aria-label="${label}"]`)!.click())}
it('previews both presets, rolls back chooser Cancel and discards all unsaved images on editor Cancel',async()=>{
 const value={...profile(),avatar:'https://example.com/legacy.webp',banner:'https://example.com/legacy-banner.webp'}
 await act(async()=>root.render(<ProfileView profile={value}/>));await clickText('Edit')
 await clickLabel('Choose Profile Picture');await clickLabel('Select fox')
 expect(host.querySelector('[data-profile-avatar] img')?.getAttribute('src')).toContain('/profile-pictures/fox.avif')
 expect(document.querySelector('[aria-label="Select fox"]')?.getAttribute('aria-pressed')).toBe('true')
 await clickText('Cancel')
 expect(host.querySelector('[data-profile-avatar] img')?.getAttribute('src')).toBe(value.avatar)
 await clickLabel('Choose Profile Picture');await clickLabel('Select fox');await clickText('Done')
 await clickLabel('Choose Profile Banner');await clickLabel('Select fox');await clickText('Done')
 expect(host.querySelector('[alt="Profile banner"]')?.getAttribute('src')).toContain('/profile-banners/fox.avif')
 expect(mocks.saveProfile).not.toHaveBeenCalled();await clickText('Cancel')
 expect(host.querySelector('[data-profile-avatar] img')?.getAttribute('src')).toBe(value.avatar)
 expect(host.querySelector('[alt="Profile banner"]')?.getAttribute('src')).toBe(value.banner)
 expect(host.querySelector('[aria-label="Choose Profile Picture"]')).toBeNull()
})
it('persists selected canonical references through the existing Save flow only',async()=>{
 await act(async()=>root.render(<ProfileView profile={profile()}/>));await clickText('Edit')
 await clickLabel('Choose Profile Picture');await clickLabel('Select fox');await clickText('Done')
 await clickLabel('Choose Profile Banner');await clickLabel('Select fox');await clickText('Done')
 expect(mocks.saveProfile).not.toHaveBeenCalled();await clickText('Save Changes')
 expect(mocks.saveProfile).toHaveBeenCalledWith({displayName:'Learner',isPublic:false,shareReading:false,avatarPreset:'profile-pictures/fox.avif',bannerPreset:'profile-banners/fox.avif'})
 expect(host.textContent).toContain('Profile saved.')
})
it('shows a safe picker failure and supports retry without exposing backend errors',async()=>{
 mocks.listPresets.mockRejectedValueOnce(new Error('private Storage detail'))
 await act(async()=>root.render(<ProfileView profile={profile()}/>));await clickText('Edit');await clickLabel('Choose Profile Picture')
 expect(document.querySelector('[role=dialog]')?.textContent).toContain('Profile pictures could not be loaded')
 expect(document.body.textContent).not.toContain('private Storage detail');await clickText('Try again')
 expect(document.querySelector('[aria-label="Select fox"]')).not.toBeNull()
})

it('shows the app reminder only on the signed-in viewer own profile',async()=>{
 await act(async()=>root.render(<ProfileView profile={profile()}/>))
 expect(host.querySelector('#download-app')?.textContent).toContain('ArabicwithM on the go!')
 expect(host.querySelector('[data-awm-plus-placement]')).toBeNull()
 await act(async()=>root.render(<ProfileView profile={{...profile(),own:false}}/>))
 expect(host.querySelector('#download-app')).toBeNull()
 await act(async()=>root.render(<ProfileView profile={{...profile(),id:'another-user'}}/>))
 expect(host.querySelector('#download-app')).toBeNull()
})

it('shows a spinner while renewing and immediately renders the confirmed renewal state', async () => {
  const cancelled = { premium: true, signedIn: true, manageable: true, admin: false, cancelAtPeriodEnd: true, periodEnd: '2999-01-01T00:00:00.000Z', paymentIssue: false, startedAt: '2026-01-01T00:00:00.000Z' }
  mocks.status.mockResolvedValue(cancelled)
  let resolve!: (value: typeof cancelled) => void
  mocks.renew.mockImplementation(() => new Promise<typeof cancelled>(done => { resolve = done }))
  await act(async () => root.render(<ProfileView profile={profile(true)} />))
  await clickText('AWM+')
  expect(host.textContent).toContain('Turn auto-renew back on')
  await clickText('Turn auto-renew back on')
  expect(host.textContent).toContain('Updating…')
  expect(host.querySelector('button .MuiCircularProgress-root')).not.toBeNull()
  await act(async () => resolve({ ...cancelled, cancelAtPeriodEnd: false }))
  expect(host.textContent).toContain('Renews on')
  expect(host.textContent).not.toContain('Cancellation scheduled')
  expect(host.textContent).not.toContain('Turn auto-renew back on')
})

it('withholds all membership states until the initial server status is confirmed', async () => {
  let resolve!: (value: { premium: boolean; signedIn: boolean; manageable: boolean; admin: boolean; cancelAtPeriodEnd: boolean; periodEnd: string; paymentIssue: boolean; startedAt: string }) => void
  mocks.status.mockImplementation(() => new Promise(done => { resolve = done }))
  await act(async () => root.render(<ProfileView profile={profile(true)} />))
  await clickText('AWM+')
  expect(host.textContent).toContain('Confirming your AWM+ status')
  expect(host.querySelector('.MuiCircularProgress-root')).not.toBeNull()
  expect(host.textContent).not.toContain('Manage AWM+')
  expect(host.textContent).not.toContain('Cancellation scheduled')
  expect(host.textContent).not.toContain('Subscribe —')
  await act(async () => resolve({ premium: true, signedIn: true, manageable: true, admin: false, cancelAtPeriodEnd: true, periodEnd: '2999-01-01T00:00:00.000Z', paymentIssue: false, startedAt: '2026-01-01T00:00:00.000Z' }))
  expect(host.textContent).toContain('Cancellation scheduled')
  expect(host.textContent).not.toContain('Confirming your AWM+ status')
})
