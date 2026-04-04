import type { NextConfig } from "next";
import fs from "fs";
import path from "path";

const BUILD_TIME = new Date().toISOString();

fs.writeFileSync(
  path.join(process.cwd(), "public", "version.json"),
  JSON.stringify({ version: BUILD_TIME })
);

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
