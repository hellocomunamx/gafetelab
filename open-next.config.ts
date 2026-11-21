import { defineCloudflareConfig } from "@opennextjs/cloudflare";
import staticAssetsIncrementalCache from "@opennextjs/cloudflare/overrides/incremental-cache/static-assets-incremental-cache";

// Todo el sitio público se prerenderiza al compilar y se sirve como estático.
// Cuando haya páginas que se revaliden (ISR), cambiar a la caché en R2:
// https://opennext.js.org/cloudflare/caching
export default defineCloudflareConfig({
  incrementalCache: staticAssetsIncrementalCache,
});
