import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

// In development, the browser calls /api/... on the Vite server, which forwards them to the local API.
// The target comes from API_PROXY_TARGET in client/.env (not a VITE_ variable, so it never reaches the browser).
// In production, Vercel does the same forwarding (client/vercel.json), so the app only ever uses relative URLs.
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  return {
    plugins: [react()],
    server: env.API_PROXY_TARGET
      ? { proxy: { "/api": { target: env.API_PROXY_TARGET, changeOrigin: true } } }
      : {},
  };
});
