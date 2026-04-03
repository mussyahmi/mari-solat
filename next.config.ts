import type { NextConfig } from "next";

const BUILD_TIME = new Date().toISOString();

const nextConfig: NextConfig = {
  images: {
    unoptimized: true,
  },
  env: {
    BUILD_TIME,
    NEXT_PUBLIC_BUILD_TIME: BUILD_TIME,
  },
};

export default nextConfig;
