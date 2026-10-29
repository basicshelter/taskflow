import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const projectRoot = fileURLToPath(new URL("../../..", import.meta.url));

export default defineConfig({
  root: fileURLToPath(new URL(".", import.meta.url)),
  plugins: [react()],
  resolve: {
    alias: [
      {
        find: "next/navigation",
        replacement: fileURLToPath(
          new URL("./next-navigation.ts", import.meta.url),
        ),
      },
      {
        find: "next/link",
        replacement: fileURLToPath(new URL("./next-link.tsx", import.meta.url)),
      },
      { find: "@", replacement: projectRoot },
    ],
  },
  server: {
    fs: { allow: [projectRoot] },
    port: 4173,
    strictPort: true,
  },
});
