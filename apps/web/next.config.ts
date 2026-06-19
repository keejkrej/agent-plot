import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  env: {
    APP_VERSION: process.env.APP_VERSION ?? process.env.npm_package_version ?? "0.1.0",
  },
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals.push("better-sqlite3", "bindings", "@cursor/sdk");
    }
    config.resolve.extensionAlias = {
      ...config.resolve.extensionAlias,
      ".js": [".ts", ".tsx", ".js"],
    };
    return config;
  },
  async rewrites() {
    const httpUrl = process.env.NEXT_PUBLIC_HTTP_URL?.trim();
    const backendPort = process.env.AGENT_PLOT_PORT?.trim() ?? "8787";
    const loopbackHost = "127.0.0.1";

    const httpTarget = httpUrl ?? `http://${loopbackHost}:${backendPort}`;

    const target = httpTarget.replace(/\/$/, "");
    return [
      {
        source: "/ws",
        destination: `${target}/ws`,
      },
    ];
  },
};

export default nextConfig;
