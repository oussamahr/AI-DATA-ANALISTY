import path from "path";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // Landing page dependencies
          "landing-vendor": ["framer-motion", "lucide-react"],
          // Charting library (heavy, only used in analytics)
          "charts": ["recharts"],
          // React Query for data fetching
          "query": ["@tanstack/react-query"],
          // Form handling
          "forms": ["react-hook-form", "@hookform/resolvers", "zod"],
          // UI components
          "ui": [
            "@radix-ui/react-avatar",
            "@radix-ui/react-dialog",
            "@radix-ui/react-dropdown-menu",
            "@radix-ui/react-label",
            "@radix-ui/react-select",
            "@radix-ui/react-separator",
            "@radix-ui/react-slot",
            "@radix-ui/react-tabs",
            "@radix-ui/react-tooltip",
          ],
          // State management
          "state": ["zustand"],
          // HTTP client
          "http": ["axios"],
          // Utilities
          "utils": ["clsx", "tailwind-merge", "dompurify"],
        },
      },
    },
  },
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: "http://127.0.0.1:8000",
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/api/, "/api/v1"),
      },
    },
  },
});
