const reply=(body:unknown,status=200)=>Response.json(body,{status,headers:{'Cache-Control':'no-store'}})
const hash=async(text:string)=>[...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(text)))].map(b=>b.toString(16).padStart(2,'0')).join('')
/** Compatibility endpoint for old deployments. No provider SDK, key or network
 * transport exists here. Paid requests remain impossible even with old secrets. */
export async function handleMetadataTranslation(request:Request,config:{serviceKey?:string}){
 if(request.method!=='POST')return reply({error:'method_not_allowed'},405)
 const bearer=request.headers.get('authorization')?.replace(/^Bearer /,'')??''
 if(!config.serviceKey||!bearer||await hash(bearer)!==await hash(config.serviceKey))return reply({error:'forbidden'},403)
 return reply({ready:false,mode:'bulk-import-export',automaticTranslation:false,paidFallback:false,providerRequests:0,error:'automatic_translation_disabled',message:'Use Admin metadata export/import or manual Arabic editing.'})
}
