import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  
  // Enable standalone output for Docker
  output: 'standalone',
  
  // Configure base path if needed
  // basePath: '/app',
  
  // Optimize images
  images: {
    unoptimized: process.env.NODE_ENV === 'production',
  },
};

export default nextConfig;
