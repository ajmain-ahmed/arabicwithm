// Read-only aggregate telemetry. Never print credentials, request headers or bodies.
const token=process.env.CLOUDFLARE_API_TOKEN, account=process.env.CLOUDFLARE_ACCOUNT_ID;
if(!token||!account){console.log('Cloudflare telemetry unavailable: missing existing CI credentials.');process.exit(0)}
async function api(path,body){const r=await fetch('https://api.cloudflare.com/client/v4'+path,{method:body?'POST':'GET',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(20000)});const d=await r.json();if(!r.ok||d.success===false||d.errors?.length){console.log(JSON.stringify({available:false,http:r.status,codes:d.errors?.map(e=>e.code)}));return null}return d}
const settings=await api(`/accounts/${account}/workers/scripts/arabicwithm/settings`);
console.log(JSON.stringify({limits:settings?.result?.limits,observability:settings?.result?.observability}));
const start=new Date(Date.now()-3600000).toISOString(),end=new Date().toISOString();
const metrics=await api('/graphql',{query:`query($accountTag:string!,$start:Time!,$end:Time!){viewer{accounts(filter:{accountTag:$accountTag}){workersInvocationsAdaptive(limit:100,filter:{scriptName:"arabicwithm",datetime_geq:$start,datetime_leq:$end}){dimensions{status}quantiles{cpuTimeP50 cpuTimeP99 memoryUsageBytesP50 memoryUsageBytesP99}sum{requests errors subrequests}}}}}`,variables:{accountTag:account,start,end}});
console.log(JSON.stringify({window:{start,end},workerMetrics:metrics?.data?.viewer?.accounts?.[0]?.workersInvocationsAdaptive??null,note:'Worker-wide sampled aggregates, not Learn-only measurements. CPU units are microseconds. No memory metric available from this query.'}));
