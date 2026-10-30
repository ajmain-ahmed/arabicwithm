import {test,expect,type BrowserContext} from '@playwright/test'
const ids={user:'11111111-1111-4111-8111-111111111111',premium:'22222222-2222-4222-8222-222222222222',editor:'33333333-3333-4333-8333-333333333333',admin:'44444444-4444-4444-8444-444444444444'}
async function signIn(context:BrowserContext,role:keyof typeof ids){
 const id=ids[role],expires=Math.floor(Date.now()/1000)+3600,encode=(value:unknown)=>Buffer.from(JSON.stringify(value)).toString('base64url')
 const user={id,aud:'authenticated',role:'authenticated',email:`${role}@fixture.example`,app_metadata:{provider:'email'},user_metadata:{}}
 const access_token=`${encode({alg:'HS256',typ:'JWT'})}.${encode({sub:id,aud:'authenticated',exp:expires,role:'authenticated'})}.fixture-signature`
 await context.addCookies([{name:'sb-localhost-auth-token',value:`base64-${encode({access_token,refresh_token:'fixture-refresh',expires_at:expires,expires_in:3600,token_type:'bearer',user})}`,domain:'127.0.0.1',path:'/',sameSite:'Lax'}])
}
for(const width of [320,390,1440])test(`matching book actions, blurb and existing flows at ${width}`,async({page,context})=>{
 await signIn(context,'premium');await page.setViewportSize({width,height:1000});await page.goto('/books/test-book')
 const actions=page.getByRole('group',{name:'Book actions',exact:true}),buttons=actions.locator('.book-detail-action')
 await expect(buttons).toHaveText(['My List','PDF','Review'])
 const styles=await buttons.evaluateAll(nodes=>nodes.map(el=>{const b=el.getBoundingClientRect(),s=getComputedStyle(el);return {x:b.x,y:b.y,width:b.width,height:b.height,radius:s.borderRadius,font:s.fontFamily,size:s.fontSize,padding:s.padding,border:s.border,background:s.backgroundColor,color:s.color,overflow:el.scrollWidth>el.clientWidth}}))
 for(const style of styles){expect(style.y).toBe(styles[0].y);expect(Math.abs(style.width-styles[0].width)).toBeLessThan(1);expect({...style,x:0,width:0}).toEqual({...styles[0],x:0,width:0});expect(style.overflow).toBe(false)}
 const blurb=page.getByText('A clear book description.',{exact:true})
 await expect(blurb).toHaveCSS('font-weight','400');expect(await blurb.evaluate(el=>getComputedStyle(el).fontFamily)).toMatch(/Jost/i)
 const list=actions.getByRole('button',{name:'My List',exact:true})
 if(await list.getAttribute('aria-pressed')==='true')await list.click()
 await expect(list).toHaveAttribute('aria-pressed','false');await list.click();await expect(list).toHaveAttribute('aria-pressed','true')
 await page.reload();await expect(list).toHaveAttribute('aria-pressed','true');await list.click();await expect(list).toHaveAttribute('aria-pressed','false')
 await actions.getByRole('button',{name:'PDF',exact:true}).click()
 const pdf=page.getByRole('dialog',{name:'Download PDF',exact:true});await expect(pdf).toBeVisible()
 const downloaded=page.waitForEvent('download');await pdf.getByRole('button',{name:'English PDF',exact:true}).click()
 expect((await downloaded).suggestedFilename()).toMatch(/complete-book-en\.pdf$/)
 await pdf.getByRole('button',{name:'Close',exact:true}).click()
 await actions.getByRole('button',{name:'Review',exact:true}).click()
 const editor=page.getByRole('region',{name:'Your book review',exact:true});await expect(editor).toBeVisible()
 expect((await editor.boundingBox())!.width).toBeGreaterThan((await buttons.first().boundingBox())!.width*2)
 await editor.getByRole('textbox',{name:'Your review',exact:true}).fill('Useful reading.')
 await editor.getByRole('button',{name:'Save review',exact:true}).click();await expect(editor).toContainText('Review saved.')
 await editor.getByRole('button',{name:'Close',exact:true}).click();await actions.getByRole('button',{name:'Review',exact:true}).click();await expect(editor.getByRole('textbox',{name:'Your review',exact:true})).toHaveValue('Useful reading.')
 await editor.getByRole('button',{name:'Delete your review',exact:true}).click();await expect(editor).toContainText('Review deleted.')
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true)
})
