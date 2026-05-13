import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // En Next.js 16, turbopack va en la raíz
  turbopack: {},
  images: {
    remotePatterns: [{ protocol: 'https', hostname: '**' }],
  },
};

export default nextConfig;