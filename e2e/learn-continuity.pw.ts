import {test,expect,type Page} from '@playwright/test'
import {normalizePuzzleArabic} from '../app/lib/transcriptPuzzles'
async function solve(page:Page){
 const panel=page.locator('section[aria-label="Word Search activity"]')
 await panel.getByRole('grid').scrollIntoViewIfNeeded()
 const cells=panel.locator('[data-word-search-cell]')
 const letters=await cells.allTextContents(),size=Math.sqrt(letters.length)
 const words=await panel.locator('[data-word-search-vocabulary] button').allTextContents()
 for(const raw of words){
  const word=[...normalizePuzzleArabic(raw).replace(/\s/g,'')]
  const paths:number[][]=[]
  for(let r=0;r<size;r++)for(let c=0;c<size;c++)for(const dr of [-1,0,1])for(const dc of [-1,0,1]){
   if(!dr&&!dc)continue
   const possible=word.map((_,i)=>[r+dr*i,c+dc*i])
   if(possible.some(([y,x])=>y<0||x<0||y>=size||x>=size))continue
   if(possible.every(([y,x],i)=>letters[y*size+x]===word[i]))paths.push(possible.map(([y,x])=>y*size+x))
  }
  expect(paths.length).toBeGreaterThan(0)
  const clue=panel.locator('[data-word-search-vocabulary] button').filter({hasText:raw}).first()
  for(const path of paths){
   const first=cells.nth(path[0]),last=cells.nth(path.at(-1)!)
   await first.scrollIntoViewIfNeeded()
   const start=(await first.boundingBox())!,end=(await last.boundingBox())!
   await page.mouse.move(start.x+start.width/2,start.y+start.height/2);await page.mouse.down();await page.mouse.move(end.x+end.width/2,end.y+end.height/2,{steps:8});await page.mouse.up()
   if((await clue.getAttribute('class'))?.includes('MuiChip-colorSuccess'))break
  }
  await expect(clue).toHaveClass(/MuiChip-colorSuccess/)

 }
 await expect(page.getByRole('dialog')).toContainText('Word Search Complete!')
}
for(const width of [390,1440])test(`continuous independent Learn at ${width}px`,async({page,context})=>{
 const failures:number[]=[]
 page.on('response',response=>{if((new URL(response.url()).pathname==='/learn'||new URL(response.url()).pathname.startsWith('/api/learn/'))&&response.status()>=500)failures.push(response.status())})
 await page.setViewportSize({width,height:1000});await page.goto('/learn')
 const puzzle=page.getByRole('region',{name:'Word Search activity'}),grammar=page.getByRole('region',{name:'Grammar activity'}),memory=page.getByRole('region',{name:'Memory activity'})
 await expect(puzzle.getByRole('grid')).toBeVisible();await expect(grammar.locator('[data-grammar-question]')).toBeVisible()
 const nav=page.getByRole('navigation',{name:'Learning areas'});for(const name of ['Grammar','Word Search','Memory'])await expect(nav.getByRole('link',{name,exact:true})).toBeVisible()
 if(process.env.AWM_LEARN_BASE_URL){for(let warm=0;warm<2;warm++){await page.reload();await expect(puzzle.getByRole('grid')).toBeVisible();await expect(grammar.locator('[data-grammar-question]')).toBeVisible()}}
 const grid=await puzzle.getByRole('grid').textContent()
 for(let i=0;i<20;i++){
  const current=await grammar.locator('[data-grammar-question]').getAttribute('data-grammar-question')
  const selects=grammar.locator('select')
  if(await grammar.locator('[data-interaction="ordering"]').count())await grammar.getByRole('button',{name:'Check answer',exact:true}).click()
  else if(await selects.count()){for(const select of await selects.all()){const value=await select.locator('option').nth(1).getAttribute('value');await select.selectOption(value!)}await grammar.getByRole('button',{name:'Check Answer',exact:true}).click()}
  else if(await grammar.getByRole('textbox').count()){await grammar.getByRole('textbox').fill('test');await grammar.getByRole('button',{name:'Check Answer',exact:true}).click()}
  else {await grammar.locator('button[aria-label^="Select"], [data-grammar-answers] button').first().click();const check=grammar.getByRole('button',{name:'Check Answer',exact:true});if(await check.count())await check.click()}
  await expect(grammar.locator('[data-grammar-feedback]')).toBeVisible()
  await grammar.getByRole('button',{name:'Next Activity',exact:true}).click()
  await expect(grammar.locator('[data-grammar-question]')).not.toHaveAttribute('data-grammar-question',current!)
  await expect(puzzle.getByRole('grid')).toHaveText(grid!)
 }
 const grammarId=await grammar.locator('[data-grammar-question]').getAttribute('data-grammar-question')
 for(let i=0;i<10;i++){
  await solve(page)
  await page.getByRole('dialog').getByRole('button',{name:'Continue',exact:true}).click()
  await expect(puzzle.getByRole('button',{name:'New game',exact:true})).toBeEnabled()
  await expect(puzzle.locator('[data-selection-state="found"]')).toHaveCount(0)
  await expect(page).toHaveURL(/\/learn$/)
  await expect(grammar.locator('[data-grammar-question]')).toHaveAttribute('data-grammar-question',grammarId!)
 }
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true)
 expect(failures).toEqual([])
 if(!process.env.AWM_LEARN_BASE_URL){
  const id='22222222-2222-4222-8222-222222222222',encode=(v:unknown)=>Buffer.from(JSON.stringify(v)).toString('base64url'),exp=Math.floor(Date.now()/1000)+3600
  const user={id,aud:'authenticated',role:'authenticated',email:'plus@fixture.example',app_metadata:{provider:'email'},user_metadata:{}}
  const token=`${encode({alg:'HS256',typ:'JWT'})}.${encode({sub:id,aud:'authenticated',exp,role:'authenticated'})}.fixture-signature`
  await context.addCookies([{name:'sb-localhost-auth-token',value:`base64-${encode({user,access_token:token,expires_at:exp,expires_in:3600,refresh_token:'fixture-refresh',token_type:'bearer'})}`,domain:'127.0.0.1',path:'/',sameSite:'Lax'}]);await page.reload()
  for(let set=0;set<3;set++){
   for(let card=0;card<20;card++){
    const complete=memory.getByText('Deck complete',{exact:true})
    await expect(complete.or(memory.getByRole('button',{name:'Reveal',exact:true})).first()).toBeVisible()
    if(await complete.isVisible())break
    await memory.getByRole('button',{name:'Reveal',exact:true}).click();await memory.getByRole('button',{name:'Knew it',exact:true}).click()
   }
   await expect(memory.getByText('Deck complete',{exact:true})).toBeVisible()
   await memory.getByRole('button',{name:'Continue',exact:true}).click()
   await expect(memory.getByRole('button',{name:'Reveal',exact:true})).toBeVisible()
   await expect(page).toHaveURL(/\/learn$/)
  }
 }
})
