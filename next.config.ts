import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Enable React strict mode for better development experience
  reactStrictMode: true,
  
  // Turbopack configuration for faster dev builds
  turbopack: {
    // Set the root to avoid lockfile warnings
    root: process.cwd(),
  },

  // Enable experimental features for better hot reload
  experimental: {
    // Optimized package imports for faster refresh
    optimizePackageImports: ['lucide-react', 'zustand'],
  },
};

export default nextConfig;
