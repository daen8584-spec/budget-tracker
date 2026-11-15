/// <reference types="vitest/config" />
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import react from "@vitejs/plugin-react";
import { defineConfig, type Plugin } from "vite";

/** Files in public/ that the app needs offline; Vite copies them without listing them in the bundle. */
const PUBLIC_FILES = ["icon.svg", "manifest.webmanifest"];

/**
 * Writes sw.js from sw/service-worker.js with the list of files this build produced and
 * a version derived from them, so a new build replaces the previous cache.
 */
function serviceWorker(): Plugin {
  return {
    name: "service-worker",
    apply: "build",
    generateBundle(_, bundle) {
      const template = readFileSync("sw/service-worker.js", "utf8");
      const built = Object.keys(bundle)
        .filter((file) => !file.endsWith(".map") && file !== "index.html")
        .sort();
      const precache = ["./", ...built.map((file) => `./${file}`), ...PUBLIC_FILES.map((file) => `./${file}`)];
      const version = createHash("sha256").update(template).update(built.join("\n")).digest("hex").slice(0, 12);
      this.emitFile({
        type: "asset",
        fileName: "sw.js",
        source: template.replace("__VERSION__", version).replace("__PRECACHE__", JSON.stringify(precache, null, 2)),
      });
    },
  };
}

export default defineConfig({
  // GitHub Pages serves the app from /budget-tracker/; locally it runs from /.
  base: process.env.BASE_PATH ?? "/",
  plugins: [react(), serviceWorker()],
  test: {
    environment: "jsdom",
    setupFiles: ["./src/test-setup.ts"],
    include: ["src/**/*.test.{ts,tsx}"],
  },
});
