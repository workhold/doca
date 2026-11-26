import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  base: "./",
  resolve: {
    alias: {
      "@doca/i18n/desktop": fileURLToPath(
        new URL("../../packages/i18n/src/desktop.ts", import.meta.url),
      ),
    },
  },
  build: { outDir: "dist" },
  server: { host: "127.0.0.1", port: 1420, strictPort: true, watch: { ignored: ["**/src-tauri/target/**"] } },
});
