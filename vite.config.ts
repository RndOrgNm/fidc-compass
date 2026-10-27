import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// Link previews need absolute URLs, and each deploy has its own domain: Vercel builds the
// `main` branch for production and any other branch (staging) for stg.
function siteUrl(): string {
  return process.env.VERCEL_GIT_COMMIT_REF === "main"
    ? "https://emet-compass.com"
    : "https://stg.emet-compass.com";
}

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
    mode === "development" && componentTagger(),
    {
      name: "site-url-in-html",
      transformIndexHtml: (html: string) => html.replaceAll("%SITE_URL%", siteUrl()),
    },
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    environment: "jsdom",
    globals: false,
    setupFiles: ["./src/test/setup.ts"],
  },
}));
