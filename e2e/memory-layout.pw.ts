import {test,expect} from '@playwright/test'
for(const width of [320,390,1440])test(`Memory practice layout at ${width}`,async({page,context})=>{
 const id='22222222-2222-4222-8222-222222222222',expires=Math.floor(Date.now()/1000)+3600,encode=(v:unknown)=>Buffer.from(JSON.stringify(v)).toString('base64url')
 const user={id,aud:'authenticated',role:'authenticated',email:'premium@fixture.example',created_at:'2026-01-01',app_metadata:{provider:'email'},user_metadata:{full_name:'Premium learner'}}
 const access_token=`${encode({alg:'HS256',typ:'JWT'})}.${encode({sub:id,aud:'authenticated',exp:expires,role:'authenticated'})}.fixture-signature`
 await context.addCookies([{name:'sb-localhost-auth-token',value:`base64-${encode({access_token,refresh_token:'fixture-refresh',expires_at:expires,expires_in:3600,token_type:'bearer',user})}`,domain:'127.0.0.1',path:'/',sameSite:'Lax'}])

 await page.setViewportSize({width,height:1000});await page.goto('/memory')
 await page.getByRole('button',{name:'Start',exact:true}).click()
 const actions=page.locator('[data-memory-actions]')
 await expect(actions).toBeVisible()
 await expect(page.getByText('Unlimited daily Memory practice',{exact:true})).toHaveCount(0)
 await expect(actions.getByRole('button')).toHaveText(['Skip','New','Save and Exit'])
 const boxes=await actions.getByRole('button').evaluateAll(nodes=>nodes.map(node=>node.getBoundingClientRect().y))
 expect(Math.max(...boxes)-Math.min(...boxes)).toBeLessThan(2)
 const [a,p,reveal]=await Promise.all([actions.boundingBox(),page.locator('[data-memory-progress]').boundingBox(),page.getByRole('button',{name:'Reveal',exact:true}).boundingBox()])
 expect(a!.y).toBeGreaterThan(reveal!.y+reveal!.height)
 expect(p!.y).toBeGreaterThan(a!.y+a!.height)
 await actions.getByRole('button',{name:'Skip',exact:true}).click()
 await expect(page.locator('[data-memory-progress]')).toContainText('Card 2')
 await page.screenshot({path:`test-results/memory-actions-${width}.png`,fullPage:true})
})
