import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      // Sans ce drapeau, le service worker n'existe qu'après un build : rien
      // n'est installable ni vérifiable depuis `npm run dev`.
      devOptions: { enabled: true },
      includeAssets: ["favicon.ico", "favicon.png", "apple-touch-icon.png"],
      manifest: {
        id: "/",
        lang: "fr",
        name: "HistoCar",
        short_name: "HistoCar",
        description: "Historique d'entretien de mes véhicules",
        theme_color: "#18181b",
        background_color: "#fafafa",
        display: "standalone",
        start_url: "/",
        scope: "/",
        icons: [
          { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
          {
            src: "/icon-512-maskable.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
      workbox: {
        // woff2 absent du motif par défaut : sans lui la police auto-hébergée
        // n'est pas précachée et l'application perd sa typographie hors ligne.
        globPatterns: ["**/*.{js,css,html,ico,png,svg,webmanifest,woff2}"],
        navigateFallbackDenylist: [/^\/api/],
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.pathname.startsWith("/api"),
            handler: "NetworkOnly",
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  server: {
    port: 5173,
  },
});
