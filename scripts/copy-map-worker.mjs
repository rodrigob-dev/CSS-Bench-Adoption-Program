// maplibre-gl 6 loads its worker as a module script by URL; Turbopack does not
// serve it, so we copy it (and the shared chunk it imports) into public/ and
// point MapLibre at it with setWorkerUrl() in ParkMap.
import { copyFileSync, mkdirSync } from "node:fs";
mkdirSync("public/vendor", { recursive: true });
for (const f of ["maplibre-gl-worker.mjs", "maplibre-gl-shared.mjs"]) {
  copyFileSync(`node_modules/maplibre-gl/dist/${f}`, `public/vendor/${f}`);
}
console.log("copied maplibre worker + shared chunk to public/vendor/");
