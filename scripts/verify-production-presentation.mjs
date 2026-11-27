// Public deployment readback: honour challenges; never send credentials or bypass them.
import {createHash} from 'node:crypto'
const origin='https://www.arabicwithm.com'
const response=await fetch(origin,{signal:AbortSignal.timeout(20000)})
console.log(JSON.stringify({check:'production-html',status:response.status,challenge:response.headers.get('cf-mitigated'),cacheControl:response.headers.get('cache-control'),cacheStatus:response.headers.get('cf-cache-status'),age:response.headers.get('age')}))
if(!response.ok){console.log('Production asset readback blocked; deployed CSS version cannot be confirmed from this runner.');process.exit(0)}
const deployedOrigin=new URL(response.url).origin
const html=await response.text(),paths=[...html.matchAll(/(?:href|src)=["']([^"']+\.css(?:\?[^"']*)?)["']/g)].map(match=>match[1])
let verified=false
for(const path of [...new Set(paths)]){
 const url=new URL(path,deployedOrigin);if(url.origin!==deployedOrigin)continue
 const asset=await fetch(url,{signal:AbortSignal.timeout(20000)});if(!asset.ok){console.log(JSON.stringify({check:'production-css',path:url.pathname,status:asset.status}));continue}
 const css=await asset.text(),version=/--awm-phone-layout-version:\s*v20261127-2/.test(css)
 console.log(JSON.stringify({check:'production-css',path:url.pathname,status:asset.status,sha256:createHash('sha256').update(css).digest('hex'),phoneLayoutVersion:version?'v20261127-2':null,cacheControl:asset.headers.get('cache-control'),cacheStatus:asset.headers.get('cf-cache-status'),age:asset.headers.get('age')}))
 if(version&&!/--awm-phone-featured:\s*clamp\(318px,\s*41\.4dvh,\s*414px\)/.test(css))throw new Error('Phone CSS version marker and Featured dimensions disagree.')
 verified ||=version
}
if(!verified)throw new Error('Production HTML loaded, but the expected phone layout CSS version was not found. Check asset/deployment mismatch.')
