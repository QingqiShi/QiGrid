import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  root: "harness",
  server: {
    port: 5299,
    strictPort: true,
  },
});
