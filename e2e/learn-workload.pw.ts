import {test,expect} from '@playwright/test'
import {mkdir,writeFile} from 'node:fs/promises'
test('measure initial Learn activity requests',async({page})=>{
 const calls:string[]=[];page.on('request',r=>{if(r.url().includes('/api/learn/'))calls.push(new URL(r.url()).pathname)})
 await page.goto('/learn')
 if(process.env.AWM_LEARN_BASELINE==='1')await expect(page.getByRole('grid').first()).toBeVisible()
 else {await expect(page.locator('[data-practice-launcher]')).toHaveCount(3);await expect(page.getByRole('grid')).toHaveCount(0)}
 await page.waitForLoadState('networkidle')
 const result={phase:process.env.AWM_LEARN_BASELINE==='1'?'before':'after',activityRequests:calls.length,paths:calls}
 console.log('Initial Learn workload',JSON.stringify(result))
 if(result.phase==='after')expect(calls).toEqual([])
 await mkdir('artifacts/learn-demand',{recursive:true});await writeFile(`artifacts/learn-demand/${result.phase}-workload.json`,JSON.stringify(result,null,2))
})
