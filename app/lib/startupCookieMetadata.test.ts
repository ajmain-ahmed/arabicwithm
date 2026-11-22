// @vitest-environment node
import {expect,it} from 'vitest'
import {startupCookieMetadata} from './startupCookieMetadata'
it('reports chunk parsing and expiry without retaining session contents or other cookie names',()=>{
 const secret={access_token:'private-token',refresh_token:'private-refresh',user:{id:'private-user',email:'private@example.test'},expires_at:10}
 const encoded='base64-'+Buffer.from(JSON.stringify(secret)).toString('base64url'),half=Math.floor(encoded.length/2)
 const result=startupCookieMetadata(`sb-project-auth-token.1=${encoded.slice(half)}; sb-project-auth-token.0=${encoded.slice(0,half)}; private-user-cookie=private-value`,20000)
 expect(result.authCookies[0]).toMatchObject({parseSuccess:true,expired:true,count:2})
 const report=JSON.stringify(result)
 for(const value of ['private-token','private-refresh','private-user','private@example.test','private-value'])expect(report).not.toContain(value)
})
it('identifies duplicate/stale cookie variants and bounds malformed or oversized headers',()=>{
 expect(startupCookieMetadata('sb-project-auth-token=bad; sb-project-auth-token=bad; sb-project-auth-token.0=bad')).toMatchObject({duplicateAuthNames:1,authCookies:[{fullAndChunked:true,parseSuccess:false}]})
 expect(startupCookieMetadata('sb-project-auth-token='+ 'x'.repeat(40000))).toMatchObject({headerTooLarge:true,authCookies:[{parseSuccess:false}]})
 expect(startupCookieMetadata(null)).toMatchObject({cookieCount:0,authCookieCount:0})
})
