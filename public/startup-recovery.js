/* Runs independently of React. No automatic reloads, storage, or offline cache. */
(function () {
  var failedChunk = false
  function show(message) {
    if (!document.body) return
    var notice = document.getElementById('awm-startup-recovery')
    if (!notice) {
      notice = document.createElement('aside')
      notice.id = 'awm-startup-recovery'
      notice.setAttribute('role', 'alert')
      notice.style.cssText = 'position:fixed;z-index:9999;bottom:24px;left:16px;right:16px;padding:16px;background:#0e2e1f;color:#fff;border:1px solid #b8860b;border-radius:10px;font:16px system-ui;'
      var text = document.createElement('span')
      notice.appendChild(text)
      var reload = document.createElement('button')
      reload.textContent = 'Reload'
      reload.style.cssText = 'margin-left:16px;padding:10px 16px;cursor:pointer;'
      reload.onclick = function () { window.location.reload() }
      notice.appendChild(reload)
      document.body.appendChild(notice)
    }
    notice.firstChild.textContent = message
  }
  function offline() { show('You are offline. Reconnect, then reload ArabicWithM.') }
  window.addEventListener('offline', offline)
  window.addEventListener('online', function () {
    var notice = document.getElementById('awm-startup-recovery')
    if (notice) notice.firstChild.textContent = 'You are back online. Reload to reconnect.'
  })
  window.addEventListener('error', function (event) {
    var appScript = false
    if (event.target && event.target.tagName === 'SCRIPT' && event.target.src) {
      var source = new URL(event.target.src, window.location.href)
      appScript = source.origin === window.location.origin && source.pathname.indexOf('/_next/static/') === 0
    }
    if (appScript || /ChunkLoadError|Loading chunk|dynamically imported module|Importing a module script failed/.test(event.message || '')) {
      failedChunk = true
      show('An application update could not load. Reload to get the current version.')
    }
  }, true)
  window.addEventListener('unhandledrejection', function (event) {
    if (/ChunkLoadError|Loading chunk|dynamically imported module|Importing a module script failed/.test(String(event.reason))) {
      failedChunk = true
      show('An application update could not load. Reload to get the current version.')
    }
  })
  window.addEventListener('awm-hydrated', function () {
    if (!failedChunk && navigator.onLine) document.getElementById('awm-startup-recovery')?.remove()
  })
  window.addEventListener('pageshow', function () { if (!navigator.onLine) offline() })
  window.setTimeout(function () {
    if (!document.documentElement.dataset.awmHydrated) show(navigator.onLine ? 'Startup is taking longer than expected. Reload to try again.' : 'You are offline. Reconnect, then reload ArabicWithM.')
  }, 15000)
})()
