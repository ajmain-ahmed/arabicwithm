import type {Instrumentation} from 'next'

export const onRequestError:Instrumentation.onRequestError=(error,request,context)=>{
 if(request.path.split('?')[0]!=='/explore')return
 const digest=error&&typeof error==='object'&&'digest' in error&&typeof error.digest==='string'?error.digest:undefined
 // No cookies, headers, user IDs, transcript bodies, exception text or stack.
 console.error('[for-you-request-error]',{route:'/explore',digest,exception:error instanceof Error?error.name:'Unknown',category:context.routeType,source:context.renderSource})
}
