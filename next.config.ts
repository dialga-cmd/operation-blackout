import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@supabase/ssr"],
  webpack: (config) => {
    config.cache = false;
    return config;
  },
};

export default nextConfig;
