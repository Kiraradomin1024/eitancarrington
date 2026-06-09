import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow external images from Supabase storage and image hosts
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**.supabase.co" },
      { protocol: "https", hostname: "**.imgchest.com" },
    ],
  },
};

export default nextConfig;
