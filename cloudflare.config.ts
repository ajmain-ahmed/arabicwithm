import { bindings, defineConfig, defineWorker } from "cf/config";

export default defineConfig({
  worker: defineWorker({
    name: "arabicwithm",
    entrypoint: "vinext/server/fetch-handler",
    compatibilityDate: "2026-11-12",
    /* Keep the site off workers.dev: the *.workers.dev hostname is not on our
       zone, so zone-level WAF/bot/rate rules do not apply there — scrapers
       could bypass them entirely. */
    workersDev: false,
    assets: {
      htmlHandling: "none",
      notFoundHandling: "none",
      runWorkerFirst: ["/*", "!/_next/static/*", "!/*/_next/static/*"],
    },
    env: {
      ASSETS: bindings.assets(),
      VINEXT_KV_CACHE: bindings.kv(),
    },
  }),
});
