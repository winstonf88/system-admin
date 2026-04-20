import path from "node:path";
import { fileURLToPath } from "node:url";

import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

const rootDir = path.dirname(fileURLToPath(import.meta.url));

/** Treat `.svg` imports like Next+SVGR: default export is a React component. */
function stubSvgPlugin() {
  return {
    name: "stub-svg",
    enforce: "pre" as const,
    load(id: string) {
      if (!id.includes(".svg")) return null;
      const base = id.split("?")[0];
      if (!base.endsWith(".svg")) return null;
      return `
import * as React from "react";
export default function SvgStub(props) {
  return React.createElement("span", { "data-svg-stub": "true", ...props });
}
`;
    },
  };
}

export default defineConfig({
  plugins: [react(), stubSvgPlugin()],
  test: {
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
    exclude: ["node_modules", ".next"],
  },
  resolve: {
    alias: {
      "@": path.resolve(rootDir, "./src"),
    },
  },
});
