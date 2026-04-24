import { defineConfig } from "vite";

export default defineConfig({
  base: "/Veilbreach/",
  server: {
    port: 5173,
    open: false,
  },
  build: {
    target: "es2020",
    outDir: "dist",
    sourcemap: true,
  },
  test: {
    environment: "node",
    include: ["src/**/__tests__/**/*.test.ts"],
  },
});
