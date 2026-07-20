import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  compiler: {
    removeConsole: process.env.NODE_ENV === "production" ? { exclude: ["error", "warn"] } : false,
  },
  transpilePackages: ["@matcha/ui", "@matcha/shared", "@matcha/zod"]
};

export default nextConfig;
