// Read-only incident inspection. CI keeps existing credentials secret; logs contain
// only aggregates. Never output API bodies, request headers, IPs or query strings.
const token = process.env.CLOUDFLARE_API_TOKEN;
const account = process.env.CLOUDFLARE_ACCOUNT_ID;
if (!token || !account) { console.log('Cloudflare inspection unavailable: existing CI credentials missing.'); process.exit(0); }
const base = 'https://api.cloudflare.com/client/v4';
async function api(label, path, body) {
  try {
    const response = await fetch(base + path, {
      method: body ? 'POST' : 'GET',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(10000),
    });
    const data = await response.json();
    console.log(JSON.stringify({ check: label, http: response.status, success: data.success ?? !data.errors?.length,
      errorCodes: (data.errors ?? []).map(e => e.code).filter(c => typeof c === 'number') }));
    return response.ok && data.success !== false && !data.errors?.length ? data : null;
  } catch { console.log(JSON.stringify({ check: label, unavailable: true })); return null; }
}
const settings = await api('Worker observability settings', `/accounts/${account}/workers/scripts/arabicwithm/settings`);
if (settings) {
  const o = settings.result?.observability;
  console.log(JSON.stringify({ observability: { configured: Boolean(o), enabled: o?.enabled ?? null,
    logsEnabled: o?.logs?.enabled ?? null, invocationLogs: o?.logs?.invocation_logs ?? null,
    sampling: o?.head_sampling_rate ?? null } }));
}
const zones = await api('Existing production zone lookup', '/zones?name=arabicwithm.com&per_page=1');
const zone = zones?.result?.find(z => z.name === 'arabicwithm.com')?.id;
if (zone) {
  const end = new Date(), start = new Date(end.getTime() - 3600000);
  const result = await api('Startup firewall events (last hour, bounded sample)', '/graphql', {
    query: `query StartupFirewall($zoneTag: string, $filter: FirewallEventsAdaptiveFilter_InputObject) {
      viewer { zones(filter: {zoneTag: $zoneTag}) { firewallEventsAdaptive(filter: $filter, limit: 1000, orderBy: [datetime_DESC]) {
        action clientRequestPath source userAgent
      } } }
    }`,
    variables: { zoneTag: zone, filter: { datetime_geq: start.toISOString(), datetime_leq: end.toISOString() } },
  });
  if (result) {
    const rows = result.data?.viewer?.zones?.[0]?.firewallEventsAdaptive ?? [];
    const startup = rows.filter(r => ['/', '/startup-check', '/startup-recovery.js'].includes(r.clientRequestPath));
    const actions = new Set(['allow','block','challenge','jschallenge','managed_challenge','skip','log','bypass']);
    const counts = {};
    for (const row of startup) {
      const action = actions.has(row.action) ? row.action : 'other';
      const device = /iPhone/.test(row.userAgent ?? '') ? 'iphone' : 'other';
      const key = `${device}:${action}`; counts[key] = (counts[key] ?? 0) + 1;
    }
    console.log(JSON.stringify({ firewall: { sampledEvents: rows.length, truncated: rows.length === 1000,
      startupEvents: startup.length, deviceActionCounts: counts, identifiesAffectedDevice: false } }));
  }
  for (const name of ['security_level', 'browser_check', 'challenge_ttl', 'http3', 'ipv6']) {
    const result = await api(`Zone setting ${name}`, `/zones/${zone}/settings/${name}`);
    if (result && ['on','off','essentially_off','low','medium','high','under_attack'].includes(result.result?.value)) {
      console.log(JSON.stringify({ setting: name, value: result.result.value }));
    }
  }
}
console.log('Read-only inspection finished. No configuration, rules, logging, cache, database or content changes. An empty/denied query is not proof of successful device requests.');
