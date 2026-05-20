import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "node:path";
import pkg from "./package.json" with { type: "json" };

const configuredAppVersion = process.env.APP_VERSION?.trim() || pkg.version;
const configuredWsUrl = process.env.VITE_WS_URL?.trim();
const defaultBackendPort = process.env.AGENT_PLOT_PORT?.trim() || "8787";
const loopbackHost = "127.0.0.1";
const devWsProxyTarget = configuredWsUrl || `ws://${loopbackHost}:${defaultBackendPort}`;

function resolveHttpProxyTarget(wsUrl: string): string {
  const url = new URL(wsUrl);
  if (url.protocol === "ws:") {
    url.protocol = "http:";
  } else if (url.protocol === "wss:") {
    url.protocol = "https:";
  }
  url.pathname = "";
  url.search = "";
  url.hash = "";
  return url.toString();
}

const devHttpProxyTarget = resolveHttpProxyTarget(devWsProxyTarget);

export default defineConfig({
  plugins: [react(), tailwindcss()],
  define: {
    "import.meta.env.APP_VERSION": JSON.stringify(configuredAppVersion),
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: devHttpProxyTarget,
        changeOrigin: true,
      },
      "/ws": {
        target: devWsProxyTarget,
        ws: true,
        changeOrigin: true,
      },
    },
  },
});
