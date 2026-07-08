import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  compiler: {
    removeConsole: process.env.NODE_ENV === "production" ? { exclude: ["error", "warn"] } : false,
  },
  transpilePackages: ["@matcha/ui", "@matcha/shared", "@matcha/zod"],
  async rewrites() {
    return [
      {
        source: "/api/ws",
        destination: process.env.NEXT_PUBLIC_WS_URL || "http://127.0.0.1:8080",
      },
    ];
  },
};

export default nextConfig;
