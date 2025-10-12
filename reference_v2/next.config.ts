import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    optimizePackageImports: ['@supabase/supabase-js', '@tanstack/react-query']
  }
};

export default nextConfig;
