/** Runs in the first HTML, before module evaluation; also served at the old script URL. */
export const startupRecoveryScript = String.raw`(function () {
  if (window.__awmRecoveryInstalled) return;
  window.__awmRecoveryInstalled = true;
  var failed = false, recovering = false, departing = false, timer, failedAssets = [], firstError = null;
  var marker = '__awm_recovery', key = 'awm-startup-recovery-attempt';
  var startedAt = Date.now(), seen = {};
  var trace = window.__awmStartupTrace = [{stage:'document-start',at:performance.now()},{stage:'inline-recovery-loaded',at:performance.now()}];
  function safePath(value) { try { var url = new URL(value,location.href); if (url.origin !== location.origin) return '[external origin]'; return url.pathname === '/' || url.pathname === '/startup-check' || url.pathname.indexOf('/_next/static/') === 0 ? url.pathname : '[non-startup route]'; } catch (_) { return '[unknown]'; } }
  function persist() { try { if (sessionStorage.getItem('awm-startup-diagnostics') === '1') sessionStorage.setItem('awm-startup-trace',JSON.stringify({version:2,startedAt:startedAt,path:safePath(location.href),trace:trace,firstError:firstError,failedAssets:failedAssets.map(safePath)})); } catch (_) {} }
  function mark(stage, asset) { if (!asset && seen[stage]) return; seen[stage] = true; if (trace.length >= 64) { var remove=2; for(var i=2;i<trace.length;i++)if(trace[i].asset){remove=i;break;} trace.splice(remove,1); } var entry={stage:stage,at:performance.now()}; if(asset)entry.asset=safePath(asset); trace.push(entry); persist(); }
  window.__awmStartupMark = function(stage) { if (/^(?:react-start|hydration-start|hydration-complete|auth-start|auth-complete|auth-error|auth-session-read|auth-client-loaded|auth-lock-requested|auth-lock-acquired|auth-lock-fallback|homepage-ready)$/.test(stage)) mark(stage); };
  function rememberError(kind, source, name) { if (!firstError || firstError.kind === 'font-failure') firstError={kind:kind,name:/^(?:Error|TypeError|ReferenceError|SyntaxError|AbortError|NetworkError)$/.test(name || '')?name:'Error',source:safePath(source || '')}; persist(); }
  persist();
  function show(message) {
    if (!document.body) { document.addEventListener('DOMContentLoaded',function () { show(message); },{once:true}); return; }
    var notice = document.getElementById('awm-startup-recovery');
    if (!notice) {
      notice = document.createElement('section'); notice.id = 'awm-startup-recovery'; notice.setAttribute('role','alert');
      notice.style.cssText = 'position:fixed;z-index:9999;bottom:24px;left:16px;right:16px;max-height:75vh;overflow:auto;padding:20px;background:#0e2e1f;color:#fff;border:1px solid #b8860b;border-radius:10px;font:16px system-ui;';
      var title = document.createElement('h2'); title.textContent = 'This page took a little detour'; title.style.fontSize = '22px'; notice.appendChild(title);
      var text = document.createElement('p'); text.setAttribute('data-recovery-message',''); notice.appendChild(text);
      var reload = document.createElement('button'); reload.textContent = 'Reload'; reload.style.cssText = 'padding:10px 16px;cursor:pointer;';
      reload.onclick = function () { window.location.reload(); }; notice.appendChild(reload);
      var details = document.createElement('details'), summary = document.createElement('summary'), code = document.createElement('pre');
      summary.textContent = 'Startup details'; code.style.cssText = 'white-space:pre-wrap;font-size:12px;';
      details.appendChild(summary); details.appendChild(code); notice.appendChild(details); document.body.appendChild(notice);
    }
    notice.querySelector('[data-recovery-message]').textContent = message;
    notice.querySelector('pre').textContent = JSON.stringify({ready:document.readyState,hydrated:document.documentElement.dataset.awmHydrated === 'true',online:navigator.onLine,trace:trace},null,2);
  }
  function retry() {
    if (recovering || departing || navigator.onLine === false) return;
    var url = new URL(window.location.href), attempted = url.searchParams.has(marker);
    try { attempted = attempted || Date.now() - Number(sessionStorage.getItem(key)) < 600000; } catch (_) {}
    if (attempted) { show('An application update could not load. Reload to try again.'); return; }
    recovering = true;
    try { sessionStorage.setItem(key,String(Date.now())); } catch (_) {}
    // The URL guard survives storage denial and a full process/document restart.
    url.searchParams.set(marker,'1'); mark('fresh-document-retry');
    // A new document resets the module map, but WebKit can retain a negative
    // HTTP-cache entry. Refresh entry assets without clearing cookies/storage.
    var sent = false, deadline;
    function navigate() { if (sent || departing) return; sent = true; window.clearTimeout(deadline); window.location.replace(url.href); }
    var assets = failedAssets.concat(Array.prototype.slice.call(document.querySelectorAll('script[src]')).reverse(),Array.prototype.slice.call(document.querySelectorAll('link[rel="modulepreload"]'))).map(function (asset) { return new URL(typeof asset === 'string' ? asset : asset.src || asset.href,location.href); }).filter(function (asset) { return asset.origin === location.origin && asset.pathname.indexOf('/_next/static/') === 0; }).filter(function (asset,index,all) { return all.slice(0,index).every(function (prior) { return prior.href !== asset.href; }); }).slice(0,24);
    if (!assets.length || !window.fetch) { navigate(); return; }
    deadline = window.setTimeout(navigate,3000);
    Promise.all(assets.map(function (asset) {
      var controller = new AbortController(), limit = window.setTimeout(function () { controller.abort(); },2500);
      return window.fetch(asset.href,{cache:'reload',signal:controller.signal}).then(function (response) { if (response.ok) return response.arrayBuffer(); }).catch(function () {}).finally(function () { window.clearTimeout(limit); });
    })).then(navigate);
  }
  function chunkFailure(message, asset) {
    if (departing) return;
    if (asset && failedAssets.indexOf(asset) < 0) { failedAssets.unshift(asset); failedAssets.length=Math.min(failedAssets.length,24); }
    failed = true; mark('application-chunk-failed',asset);
    show('An application update could not load. Getting the current version.');
    // Leave the original error/rejection visible to diagnostics; never preventDefault.
    if (!asset) { retry(); return; }
    // Resource error events also occur for navigation cancellations. Confirm
    // a missing immutable asset before redirecting an already-rendered page.
    var controller = new AbortController(), limit = window.setTimeout(function () { controller.abort(); },3000);
    window.fetch(asset,{method:'HEAD',cache:'no-store',signal:controller.signal}).then(function (response) {
      if (response.status === 404 || response.status === 410) retry();
    }).catch(function () {}).finally(function () { window.clearTimeout(limit); });
  }
  function chunkMessage(value) { return /ChunkLoadError|Loading chunk|dynamically imported module|Importing a module script failed|Unable to preload CSS/.test(String(value)); }
  window.addEventListener('error',function (event) {
    var target = event.target, source;
    if(event.message)rememberError('early-exception',event.filename,event.error && event.error.name);
    if (target && (target.tagName === 'SCRIPT' || target.tagName === 'LINK')) {
      source = new URL(target.src || target.href || location.href,location.href);
      if (source.origin === location.origin && source.pathname.indexOf('/_next/static/') === 0 && (target.tagName === 'SCRIPT' || target.rel === 'stylesheet')) { rememberError(target.tagName === 'SCRIPT'?'module-error':'stylesheet-error',source.href); mark(target.tagName === 'SCRIPT'?'module-error':'stylesheet-error',source.href); chunkFailure('asset',source.href); }
      else if (/\.(?:woff2?|ttf)(?:\?|$)/.test(source.href)) { rememberError('font-failure',source.href); mark('font-failure',source.href); }
    } else if (chunkMessage(event.message)) chunkFailure(event.message);
    else if (event.message && !document.documentElement.dataset.awmHydrated) { mark('runtime-error'); show('Startup encountered an error. Reload to try again.'); }
  },true);
  window.addEventListener('unhandledrejection',function (event) { rememberError('unhandled-rejection','',event.reason && event.reason.name); mark('unhandled-rejection'); if (chunkMessage(event.reason)) chunkFailure(event.reason); });
  window.addEventListener('vite:preloadError',function (event) { if (chunkMessage(event.payload)) chunkFailure(event.payload); });
  window.addEventListener('offline',function () { mark('offline'); show('You are offline. Reconnect, then reload ArabicWithM.'); });
  window.addEventListener('online',function () { if (failed) retry(); else if (document.getElementById('awm-startup-recovery')) show('You are back online. Reload to reconnect.'); });
  window.addEventListener('awm-hydrated',function () {
    mark('hydration-complete'); window.clearTimeout(timer);
    if (!failed && navigator.onLine !== false) {
      var notice = document.getElementById('awm-startup-recovery'); if (notice) notice.remove();
      // Keep the URL guard when storage is denied. Never clear session/cookies.
      try { if (sessionStorage.getItem(key)) { var url = new URL(location.href); url.searchParams.delete(marker); history.replaceState(history.state,'',url.href); } } catch (_) {}
    }
  });
  document.addEventListener('DOMContentLoaded',function () { mark('html-complete'); });
  function entry(node) { if(node && node.tagName === 'SCRIPT' && node.src && new URL(node.src,location.href).pathname.indexOf('/_next/static/') === 0)mark('entry-module-requested',node.src); }
  Array.prototype.forEach.call(document.querySelectorAll('script[src]'),entry);
  if(window.MutationObserver){var observer=new MutationObserver(function(records){records.forEach(function(record){Array.prototype.forEach.call(record.addedNodes,function(node){entry(node);if(node.querySelectorAll)Array.prototype.forEach.call(node.querySelectorAll('script[src]'),entry);});});});observer.observe(document.documentElement,{childList:true,subtree:true});window.setTimeout(function(){observer.disconnect();},30000);}
  window.addEventListener('load',function(event){var target=event.target;if(target && target.tagName === 'SCRIPT' && target.src && new URL(target.src,location.href).pathname.indexOf('/_next/static/')===0)mark('entry-module-loaded',target.src);},true);
  if(document.fonts && document.fonts.addEventListener)document.fonts.addEventListener('loadingerror',function(){mark('font-failure');});
  window.addEventListener('pagehide',function () { departing = true; });
  window.addEventListener('pageshow',function () { departing = false; mark('pageshow'); if (navigator.onLine === false) show('You are offline. Reconnect, then reload ArabicWithM.'); });
  timer = window.setTimeout(function () {
    if (document.documentElement.dataset.awmHydrated) return;
    mark('hydration-timeout'); show(navigator.onLine === false ? 'You are offline. Reconnect, then reload ArabicWithM.' : 'Startup is taking longer than expected. Reload to try again.');
    // WebKit may omit the entry module's error event. A stalled hydration gets
    // the same single guarded fresh-document attempt, never an infinite retry.
    retry();
  },15000);
})();`
