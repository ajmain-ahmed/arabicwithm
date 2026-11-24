// Read-only aggregate telemetry. Never print credentials, request headers or bodies.
const token=process.env.CLOUDFLARE_API_TOKEN, account=process.env.CLOUDFLARE_ACCOUNT_ID;
if(!token||!account){console.log('Cloudflare telemetry unavailable: missing existing CI credentials.');process.exit(0)}
async function api(path,body){const r=await fetch('https://api.cloudflare.com/client/v4'+path,{method:body?'POST':'GET',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(20000)});const d=await r.json();if(!r.ok||d.success===false||d.errors?.length){console.log(JSON.stringify({available:false,http:r.status,codes:d.errors?.map(e=>e.code)}));return null}return d}
const settings=await api(`/accounts/${account}/workers/scripts/arabicwithm/settings`);
console.log(JSON.stringify({limits:settings?.result?.limits,observability:settings?.result?.observability}));
const deploymentResult=await api(`/accounts/${account}/workers/scripts/arabicwithm/deployments`);
const deploymentRows=deploymentResult?.result?.deployments??[];
const deployedAt=deploymentRows.map(d=>Date.parse(d.created_on)).filter(Number.isFinite).sort((a,b)=>b-a)[0];
const start=process.env.LEARN_METRICS_START ?? new Date(Math.max(Date.now()-3600000,deployedAt??0)).toISOString(),end=new Date().toISOString();
const metrics=await api('/graphql',{query:`query($accountTag:string!,$start:Time!,$end:Time!){viewer{accounts(filter:{accountTag:$accountTag}){workersInvocationsAdaptive(limit:100,filter:{scriptName:"arabicwithm",datetime_geq:$start,datetime_leq:$end}){dimensions{status}quantiles{cpuTimeP50 cpuTimeP99 memoryUsageBytesP50 memoryUsageBytesP99}sum{requests errors subrequests}}}}}`,variables:{accountTag:account,start,end}});
console.log(JSON.stringify({window:{start,end},workerMetrics:metrics?.data?.viewer?.accounts?.[0]?.workersInvocationsAdaptive??null,note:'Worker-wide sampled aggregates, not Learn-only measurements. CPU units are microseconds. Memory quantiles describe shared isolate usage in bytes.'}));

const telemetry=await api(`/accounts/${account}/workers/observability/telemetry/query`,{queryId:'awm-learn-read-only',dry:true,view:'calculations',timeframe:{from:Date.parse(start),to:Date.parse(end)},ignoreSeries:true,parameters:{filterCombination:'and',filters:[{key:'$workers.scriptName',operation:'eq',type:'string',value:'arabicwithm'},{key:'$metadata.trigger',operation:'includes',type:'string',value:'/learn'}],calculations:[{operator:'count',alias:'invocations'},{key:'$workers.cpuTimeMs',keyType:'number',operator:'p99',alias:'cpuP99Ms'}],groupBys:[{type:'string',value:'$workers.outcome'}],limit:20}});
console.log(JSON.stringify({learnCalculations:telemetry?.result?.calculations?.map(({alias,aggregates})=>({alias,aggregates}))??null,statistics:telemetry?.result?.statistics??null}));
