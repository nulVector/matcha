import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@matcha/ui", "@matcha/shared", "@matcha/zod"],
  allowedDevOrigins: ["10.86.237.73"],
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
