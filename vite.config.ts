import { defineConfig } from "vite";
import vinext from "vinext";
import { cloudflare } from "@cloudflare/vite-plugin";
import { createHash } from "node:crypto";
import { patchCssModules } from "vite-css-modules";
import path from "node:path";

export default defineConfig({
  plugins: [
    patchCssModules({ exportMode: "default" }),
    /* No cache adapter: the KV-backed cache kept serving responses across
       deploys (stale HTML/RSC referencing replaced JS chunks), breaking
       hydration and server actions after each release. Revisit once a
       deploy-time invalidation story exists (e.g. version-scoped keys). */
    vinext(),
    cloudflare({
      viteEnvironment: {
        name: "rsc",
        childEnvironments: ["ssr"],
      },
    }),
  ],
  css: {
    modules: {
      generateScopedName(name: string, filename: string) {
        const relativePath = path.relative(import.meta.dirname, filename.replace(/\?.*$/, "")).replaceAll("\\", "/");
        return `_${name}_${createHash("sha256").update(relativePath).digest("hex").slice(0, 7)}`;
      },
    },
  },
});
