import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// Use localhost for backend by default
// To use network IP for network access, set environment variable: VITE_BACKEND_URL=192.168.0.103:8000
const baseUrl = process.env.VITE_BACKEND_URL || "localhost:8000";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "0.0.0.0", // Listen on all network interfaces
    port: 8082,
    strictPort: false,
    proxy: {
      // Proxy API requests to Django backend
      "/api": {
        target: `http://${baseUrl}`,
        changeOrigin: true,
        secure: false,
      },
      // Proxy storage/media requests to Django backend
      "/storage": {
        target: `http://${baseUrl}`,
        changeOrigin: true,
        secure: false,
      },
      // Proxy media files to Django backend
      "/media": {
        target: `http://${baseUrl}`,
        changeOrigin: true,
        secure: false,
      },
    },
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(
    Boolean
  ),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  base: "./",
}));
