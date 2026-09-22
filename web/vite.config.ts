import { defineConfig } from "vitest/config"
import react from "@vitejs/plugin-react"
import tailwindcss from "@tailwindcss/vite"
import { VitePWA } from "vite-plugin-pwa"
import path from "path"

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      // Service worker registration is only injected into production builds
      // (devOptions.enabled defaults to false) — dev mode, including
      // `npm run dev:mock`'s MSW worker, is unaffected.
      registerType: "autoUpdate",
      manifest: {
        name: "Docsile HMS",
        short_name: "Docsile",
        description: "Hospital Management System",
        start_url: "/dashboard",
        scope: "/",
        display: "standalone",
        background_color: "#f0f2f5",
        theme_color: "#2563eb",
        orientation: "landscape",
        icons: [
          { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
          { src: "/icon-maskable.svg", sizes: "any", type: "image/svg+xml", purpose: "maskable" },
        ],
      },
      workbox: {
        // Precache only the built app shell (JS/CSS/HTML/icons) so the app
        // installs and reloads instantly offline. Deliberately no
        // `runtimeCaching` entries for API calls — this is a hospital app;
        // serving stale clinical/billing data from a cache while offline
        // would be actively dangerous, not a convenience. Every data
        // request must always hit the network live.
        globPatterns: ["**/*.{js,css,html,svg,ico,woff2}"],
      },
    }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
    passWithNoTests: true,
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
    },
  },
})
