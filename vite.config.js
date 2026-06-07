import path from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      // jsconfig maps "@/*" -> "./src/*"; mirror that for the bundler.
      "@": path.resolve(import.meta.dirname, "./src"),
    },
  },
});
