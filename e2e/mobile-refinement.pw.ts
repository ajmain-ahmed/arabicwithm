import {test,expect} from '@playwright/test'
import {installYouTubeFixture} from './helpers/youtube'
const backend=`https://localhost:${process.env.AWM_TEST_BACKEND_PORT??4310}`
for(const width of [320,390,844,1440])test(`refined mobile controls and filters at ${width}`,async({page,request})=>{
 await request.post(`${backend}/fixture/for-you-playback`);await installYouTubeFixture(page)
 await page.setViewportSize({width,height:width===844?390:844});await page.goto('/explore')
 if(width<900){const tabs=page.getByRole('group',{name:'Explore views'});expect((await tabs.boundingBox())!.x).toBeLessThan(20)}
 await page.getByRole('button',{name:'For You feed',exact:true}).click()
 await expect(page.locator('[data-for-you-source] iframe')).toBeVisible()
 if(width>=900){await expect(page.getByRole('button',{name:'Next clip',exact:true})).toBeVisible();await expect(page.getByRole('button',{name:'Filter content'})).toHaveCount(0);return}
 const tools=page.locator('[data-mobile-for-you-toolbar]')
 await expect(tools.getByRole('group',{name:'Explore views'})).toBeVisible()
 await expect(page.getByRole('slider',{name:'Clip playback position'})).toHaveCount(0)
 await expect(page.getByText(/Scroll down for the next clip/)).toHaveCount(0)
 await expect(tools.getByRole('button',{name:'Mute clip',exact:true})).toBeVisible()
 await tools.getByRole('button',{name:'Mute clip',exact:true}).click()
 await expect(tools.getByRole('button',{name:'Unmute clip',exact:true})).toBeVisible()
 await tools.getByRole('button',{name:'Unmute clip',exact:true}).click()
 const tokens=page.locator('[data-mobile-clip-transcript] [data-token-glosses]').first()
 await expect(tokens).toHaveCSS('direction','rtl');await expect(tokens).toHaveCSS('justify-content','flex-start')
 await tools.getByRole('button',{name:'Filter content',exact:true}).click()
 await expect(page.getByRole('checkbox',{name:'Fixture A',exact:true})).toBeVisible()
 await page.getByRole('checkbox',{name:'Fixture A',exact:true}).uncheck()
 await page.getByRole('button',{name:'Apply',exact:true}).click()
 await expect(page.locator('[data-for-you-source]')).toHaveAttribute('data-for-you-source','abcdefghij1')
 await expect(page.locator('[data-for-you-source] iframe')).toBeVisible()
 await expect(tools.getByRole('button',{name:'Mute clip',exact:true})).toBeVisible()
 await page.screenshot({path:`test-results/refined-${width}.png`})
})
