import { test, expect, type BrowserContext } from '@playwright/test';
import data from './learning-data.json';
import curriculum from '../app/grammar/mobile-curriculum.json';
import { eligible, prepareNahw, validNahw, title } from '../app/grammar/models';
const backend = `https://localhost:${process.env.AWM_TEST_BACKEND_PORT ?? 4310}`;
async function signIn(context: BrowserContext) { const id = '11111111-1111-4111-8111-111111111111', expires = Math.floor(Date.now() / 1000) + 3600, encode = (v: unknown) => Buffer.from(JSON.stringify(v)).toString('base64url'); const access_token = `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode({ sub: id, aud: 'authenticated', exp: expires, role: 'authenticated' })}.fixture-signature`; await context.addCookies([{ name: 'sb-localhost-auth-token', value: `base64-${encode({ access_token, refresh_token: 'fixture-refresh', expires_at: expires, expires_in: 3600, token_type: 'bearer', user: { id, email: 'free@fixture.example', aud: 'authenticated', role: 'authenticated', app_metadata: { provider: 'email' }, user_metadata: {} } })}`, domain: '127.0.0.1', path: '/', sameSite: 'Lax' }]); }
test.beforeEach(async ({ request }) => { await request.post(`${backend}/fixture/reset-overhaul`); });
test('Grammar is available through the Home Learn link with both sections visible',async({page,context})=>{
 await signIn(context);await page.goto('/');await page.getByRole('navigation',{name:'Primary navigation',exact:true}).getByRole('link',{name:'Learn',exact:true}).click();await page.getByRole('link',{name:/Grammar.*Practise/}).click();
 await expect(page.getByRole('heading',{name:'Na\u1e25w',exact:true})).toBeVisible();await expect(page.getByRole('heading',{name:'\u1e62arf',exact:true})).toBeVisible()
});
test('Weak verb identification advances automatically and recall retains self-rating',async({page,context})=>{
 await signIn(context);await page.goto('/grammar');await page.getByRole('button',{name:'Weak Verbs',exact:true}).click();
 await expect(page.getByText('1 /',{exact:false})).toBeVisible();const text=await page.locator('main').innerText();const card=curriculum.weakCards.find(c=>text.includes(c.base)&&text.includes(c.root))!;
 expect(card).toBeDefined();await page.getByRole('button',{name:`${card.typeLabel} \u00b7 ${card.typeArabic}`,exact:true}).click();await expect(page.getByRole('status')).toContainText('Correct');await expect(page.getByText('2 /',{exact:false})).toBeVisible();
 await page.getByRole('combobox').click();await page.getByRole('option',{name:'Conjugation recall',exact:true}).click();await page.getByRole('button',{name:'Reveal answer',exact:true}).click();await expect(page.getByRole('button',{name:'Again',exact:true})).toBeVisible();await expect(page.getByRole('button',{name:'Got it',exact:true})).toBeVisible()
});
test('experimental relationship activities stay out of the simplified landing page',async({page,context})=>{
 await signIn(context);await page.goto('/grammar');await expect(page.getByRole('button',{name:'Word Type',exact:true})).toBeVisible();
 for(const name of ['Governance & I\u02bfr\u0101b','Build the Sentence','Phrase & Clause Roles','Sentence Structure'])await expect(page.getByRole('button',{name,exact:true})).toHaveCount(0)
});
test('Memory opens the existing modal; dismissal protects personal actions and allows reopening', async ({ page }) => { await page.goto('/memory'); await expect(page.getByRole('dialog')).toBeVisible(); await expect(page.getByRole('dialog').getByText('Sign in to practise Memory', { exact: true })).toBeVisible(); await page.keyboard.press('Escape'); await expect(page.getByRole('dialog')).toHaveCount(0); await expect(page.getByRole('button', { name: 'Start', exact: true })).toHaveCount(0); await page.getByRole('main').getByRole('button', { name: 'Sign In', exact: true }).click(); await expect(page.getByRole('dialog')).toBeVisible(); });
test('Memory password sign-in stays on Memory and loads protected state', async ({ page }) => { await page.goto('/memory'); await page.getByLabel('Email address').fill('free@fixture.example'); await page.getByLabel('Password', { exact: true }).fill('fixture-password'); await page.getByRole('dialog').getByRole('button', { name: 'Sign In', exact: true }).last().click(); await expect(page.getByRole('dialog')).toHaveCount(0); await expect(page).toHaveURL(/\/memory$/); await expect(page.getByRole('button', { name: 'Start', exact: true })).toBeVisible(); });
test('Book footer uses balanced simple labels on a small phone and the final chapter has no next action', async ({ page, context }) => { await signIn(context); await page.setViewportSize({ width: 320, height: 812 }); await page.goto('/books/test-book/chapter-1'); const all = page.getByRole('link', { name: 'All Chapters', exact: true }); const next = page.getByRole('link', { name: 'Next Chapter', exact: true }); await all.scrollIntoViewIfNeeded(); await expect(all).toBeVisible(); await expect(next).toBeVisible(); const a = await all.boundingBox(), b = await next.boundingBox(); expect(a!.y).toBe(b!.y); expect(a!.height).toBe(b!.height); await expect(page.getByRole('link', { name: 'Sixth Chapter', exact: true })).toHaveCount(0); await next.click(); await expect(page.getByRole('link', { name: 'All Chapters', exact: true })).toBeVisible(); await expect(page.getByRole('link', { name: 'Next Chapter', exact: true })).toHaveCount(0); });
test('Word Type retains contextual targets and information buttons',async({page,context})=>{
 await signIn(context);await page.goto('/grammar');await page.getByRole('button',{name:'Word Type',exact:true}).click();await expect(page.getByRole('button',{name:'Next Sentence',exact:true})).toBeDisabled();await expect(page.getByRole('button',{name:/Place label on/}).first()).toBeVisible()
});
test('Case Endings validates every placement before automatically moving on',async({page,context})=>{
 await signIn(context);await page.goto('/grammar');await page.getByRole('button',{name:'Case Endings',exact:true}).click();await expect(page.getByRole('button',{name:/Place label on/}).first()).toBeVisible();
 const row=prepareNahw(data.nahw.filter(validNahw).filter(r=>eligible(r,'grammatical_case').length>=2),'grammatical_case')[0];
 for(const target of eligible(row,'grammatical_case')){
  await page.getByRole('button',{name:title(target.grammatical_case!.category),exact:true}).first().click();await page.getByRole('button',{name:`Place label on ${target.arabic}`,exact:true}).click();
 }
 await expect(page.getByRole('status')).toContainText('Correct');await expect(page.getByText('2 /',{exact:false})).toBeVisible()
});
test('Context Sarf and Word Patterns automatically advance reviewed prepared targets',async({page,context})=>{
 await signIn(context);
 for(const activity of ['Context \u1e62arf','Word Patterns']){
  await page.goto('/grammar');await page.getByRole('button',{name:activity,exact:true}).click();
  const target=(activity==='Context \u1e62arf'?data.sarf:data.patterns)[0].payload.targets[0];
  const answer=activity==='Context \u1e62arf'?`Form ${['I','II','III','IV','V','VI','VII','VIII','IX','X'][('verb' in target?target.verb.form!:1)-1]}`:curriculum.patterns['pattern_index' in target?target.pattern_index:0].pattern;
  await page.getByRole('button',{name:answer,exact:true}).click();await expect(page.getByRole('status')).toContainText('Correct');await expect(page.getByRole('status')).not.toContainText('Correct',{timeout:2000})
 }
});
test('Free Memory notice is centred, full width and recap does not start another session', async ({ page, context }) => { await signIn(context); await page.setViewportSize({ width: 320, height: 812 }); await page.goto('/memory'); await page.getByRole('button', { name: 'Start', exact: true }).click(); for (let i = 0; i < 4; i++) {
    await page.getByRole('button', { name: 'Reveal', exact: true }).click();
    await page.getByRole('button', { name: 'Knew it', exact: true }).click();
} await page.reload(); const notice = page.getByRole('status').filter({ hasText: "You've used today's free Memory session." }); await expect(notice).toBeVisible(); expect(await notice.evaluate(el => getComputedStyle(el).textAlign)).toBe('center'); await expect(notice.getByRole('button', { name: 'Upgrade to Arabic with M', exact: true })).toBeVisible(); await page.getByRole('button', { name: /View saved recap/ }).click(); await expect(page.getByText('Deck complete', { exact: true })).toBeVisible(); await page.reload(); await expect(notice).toBeVisible(); });
