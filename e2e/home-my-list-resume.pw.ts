import {test,expect,type BrowserContext} from '@playwright/test'
const backend=`https://localhost:${process.env.AWM_TEST_BACKEND_PORT??4310}`
async function signIn(context:BrowserContext){
 const id='22222222-2222-4222-8222-222222222222',expires=Math.floor(Date.now()/1000)+3600,encode=(v:unknown)=>Buffer.from(JSON.stringify(v)).toString('base64url')
 const user={id,aud:'authenticated',role:'authenticated',email:'premium@fixture.example',app_metadata:{provider:'email'},user_metadata:{}}
 const access_token=`${encode({alg:'HS256',typ:'JWT'})}.${encode({sub:id,aud:'authenticated',exp:expires,role:'authenticated'})}.fixture-signature`
 await context.addCookies([{name:'sb-localhost-auth-token',value:`base64-${encode({access_token,refresh_token:'fixture-refresh',expires_at:expires,expires_in:3600,token_type:'bearer',user})}`,domain:'127.0.0.1',path:'/',sameSite:'Lax'}])
 return access_token
}

test('reader saves to canonical My List; desktop resumes while mobile keeps Continue Reading',async({page,context,request})=>{
 await request.post(`${backend}/fixture/reader-pagination`,{data:{blocks:120}})
 const token=await signIn(context),headers={Authorization:`Bearer ${token}`}
 await request.put(`${backend}/auth/v1/user`,{headers,data:{data:{my_list_books:['layout-book-1'],book_progress:{}}}})
 await page.setViewportSize({width:1440,height:1000});await page.goto('/books/test-book')
 const account=async()=>await(await request.get(`${backend}/auth/v1/user`,{headers})).json()
 expect((await account()).user_metadata.my_list_books).toEqual(['layout-book-1'])
 await page.getByRole('link',{name:'English',exact:true}).filter({visible:true}).click()
 await expect(page.locator('#reader-content:visible')).toBeVisible()
 await expect.poll(async()=>(await account()).user_metadata.my_list_books).toEqual(['layout-book-1','test-book'])
 await page.getByRole('button',{name:'Next Page',exact:true}).click()
 await page.getByRole('button',{name:'Next Page',exact:true}).click()
 // The canonical tracker writes on its existing twenty-second account-sync interval.
 await expect.poll(async()=>(await account()).user_metadata.book_progress?.['test-book'],{timeout:30000}).toMatchObject({page:3,blockIndex:28,language:'en'})
 await page.goto('/')
 const list=page.getByRole('region',{name:'My List',exact:true})
 const started=list.getByRole('link',{name:'Test Book',exact:true})
 await expect(started).toHaveAttribute('href','/books/test-book/chapter-1?lang=en&page=3&block=28')
 await expect(list.getByRole('link',{name:'Book 2',exact:true})).toHaveAttribute('href','/books/layout-book-1')
 await expect(page.getByRole('heading',{name:'Continue Reading',exact:true})).toBeHidden()
 await started.click();await expect(page.locator('#reader-content:visible [data-reader-block]').first()).toHaveAttribute('data-reader-block','28')
 await page.goto('/books/test-book');const toggle=page.getByRole('button',{name:'My List',exact:true})
 await expect(toggle).toHaveAttribute('aria-pressed','true');await toggle.click();await expect(toggle).toHaveAttribute('aria-pressed','false')
 await page.goto('/');await expect(list.getByRole('link',{name:'Test Book',exact:true})).toHaveCount(0)
 expect((await account()).user_metadata.my_list_books).toEqual(['layout-book-1'])
 await page.setViewportSize({width:390,height:900})
 await expect(page.getByRole('heading',{name:'Continue Reading',exact:true})).toBeVisible()
})
