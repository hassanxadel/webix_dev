import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import tsConfigPaths from "vite-tsconfig-paths";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";

export default defineConfig({
  plugins: [
    tsConfigPaths({
      projects: ["./tsconfig.json"],
    }),
    tanstackStart({
      customViteReactPlugin: true,
      target: "node-server",
      server: {
        entry: "src/server.ts",
      },
      // Every page is static, so the build writes plain HTML that any free host can serve.
      // One page at a time: a render blocks Node, so a parallel fetch misses its 250 ms connect window and the build dies (small CI machines).
      prerender: { enabled: true, crawlLinks: true, concurrency: 1, filter: ({ path }) => !path.includes("#") },
    }),
    react(),
    tailwindcss(),
  ],
});
