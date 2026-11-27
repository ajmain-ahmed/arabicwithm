import {test,expect} from '@playwright/test'
import {mkdir,writeFile} from 'node:fs/promises'
for(const width of [390,1440])test(`authenticated reviewed matching stays inside its Learn panel ${width}`,async({page,context},info)=>{
 test.skip(Boolean(process.env.AWM_LEARN_BASE_URL),'Authenticated fixture only; never create a synthetic production login.')
 const id='22222222-2222-4222-8222-222222222222',encode=(v:unknown)=>Buffer.from(JSON.stringify(v)).toString('base64url'),exp=Math.floor(Date.now()/1000)+3600
 const user={id,aud:'authenticated',role:'authenticated',email:'plus@fixture.example',app_metadata:{provider:'email'},user_metadata:{}}
 const token=`${encode({alg:'HS256',typ:'JWT'})}.${encode({sub:id,aud:'authenticated',exp,role:'authenticated'})}.fixture-signature`
 await context.addCookies([{name:'sb-localhost-auth-token',value:`base64-${encode({user,access_token:token,expires_at:exp,expires_in:3600,refresh_token:'fixture-refresh',token_type:'bearer'})}`,domain:'127.0.0.1',path:'/',sameSite:'Lax'}])
 await page.setViewportSize({width,height:1000});await page.goto('/learn');for(const id of ['puzzle','grammar','memory'])await page.locator(`[data-practice-launcher=${id}]`).getByRole('button',{name:'Start',exact:true}).click()
 const grammar=page.getByRole('region',{name:'Grammar activity'}),puzzle=page.getByRole('region',{name:'Word Search activity'})
 await expect(puzzle.getByRole('grid')).toBeVisible()
 await expect(page.getByRole('region',{name:'Memory activity'}).getByRole('button',{name:'Reveal',exact:true})).toBeVisible()
 const grid=await puzzle.getByRole('grid').textContent()
 const selects=grammar.locator('select')
 if(await selects.count()){for(const select of await selects.all())await select.selectOption((await select.locator('option').nth(1).getAttribute('value'))!);await grammar.getByRole('button',{name:'Check Answer',exact:true}).click()}
 else if(await grammar.getByRole('textbox').count()){await grammar.getByRole('textbox').fill('test');await grammar.getByRole('button',{name:'Check Answer',exact:true}).click()}
 else{await grammar.locator('button[aria-label^="Select"], [data-grammar-answers] button').first().click();const check=grammar.getByRole('button',{name:'Check Answer',exact:true});if(await check.count())await check.click()}
 await page.evaluate(()=>{Math.random=()=>0.1})
 await grammar.getByRole('button',{name:'Next Activity',exact:true}).click()
 const matching=grammar.locator('[data-learn-nahw]')
 await expect(matching).toBeVisible()
 const targets=matching.locator('button[aria-label^="Place label on "]')
 await page.evaluate(()=>document.fonts.ready)
 const directory=`artifacts/presentation/${info.project.name}/${width}`;await mkdir(directory,{recursive:true})
 const metrics=await matching.evaluate(el=>{const targets=el.querySelector('[data-grammar-targets]')!,target=el.querySelector('[data-grammar-target]')!,label=el.querySelector('[data-grammar-label]')!;return {sentenceSize:getComputedStyle(el).getPropertyValue('--grammar-arabic-size').trim(),targetSize:getComputedStyle(target).fontSize,labelSize:getComputedStyle(label).fontSize,targetAlignment:getComputedStyle(targets).justifyContent,direction:getComputedStyle(targets).direction}})
 expect(metrics.targetSize).toBe(width<900?'23px':'28px');expect(metrics.labelSize).toBe(width<900?'22px':'26px');expect(metrics.targetAlignment).toBe('center');expect(metrics.direction).toBe('rtl')
 await matching.screenshot({path:`${directory}/grammar-centred.png`});await writeFile(`${directory}/grammar.json`,JSON.stringify(metrics,null,2))
 if(width<900){await page.locator('[data-mobile-menu-trigger]').click();const controls=page.locator('[data-mobile-menu-controls]');await expect(controls.getByRole('button',{name:'AWM Plus'})).toBeVisible();await expect(controls.locator('[data-language-indicator]')).toBeVisible();const members=await controls.getByRole('button').all();const rectangles=await Promise.all(members.map(button=>button.boundingBox()));expect(Math.abs(rectangles[0]!.y-rectangles[1]!.y)).toBeLessThan(1);await controls.screenshot({path:`${directory}/member-language-controls.png`});await page.screenshot({path:`${directory}/member-menu.png`});await page.keyboard.press('Escape')}

 for(let targetIndex=0;targetIndex<await targets.count();targetIndex++){
  const target=targets.nth(targetIndex),label=(await target.getAttribute('aria-label'))!.replace('Place label on ','')
  const explain=matching.getByRole('button',{name:`Explain ${label}`,exact:true})
  const labels=matching.locator('button[draggable="true"]'),count=await labels.count()
  for(let labelIndex=0;labelIndex<count;labelIndex++){
   if(targetIndex===0){const data=await page.evaluateHandle(()=>new DataTransfer());await labels.nth(labelIndex).dispatchEvent('dragstart',{dataTransfer:data});await target.dispatchEvent('drop',{dataTransfer:data});await data.dispose()}else{await labels.nth(labelIndex).click();await target.click()}
   if(await explain.count())break
  }
  await expect(explain).toBeVisible()
 }
 await expect(matching.getByRole('button',{name:'Next Activity',exact:true})).toBeEnabled()
 await expect(puzzle.getByRole('grid')).toHaveText(grid!)
 await matching.getByRole('button',{name:/Explain /}).first().click()
 await expect(page.getByRole('dialog')).toBeVisible();await page.getByRole('button',{name:'Close explanation',exact:true}).click()
 await page.evaluate(()=>{Math.random=()=>0.9})
 await matching.getByRole('button',{name:'Next Activity',exact:true}).click()
 await expect(grammar.locator('[data-grammar-question]')).toBeVisible()
 await expect(puzzle.getByRole('grid')).toHaveText(grid!);await expect(page).toHaveURL(/\/learn$/)
})
