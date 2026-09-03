import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  serverExternalPackages: ["@supabase/ssr"],
  webpack: (config) => {
    config.cache = false;
    return config;
  },
};

export default nextConfig;
