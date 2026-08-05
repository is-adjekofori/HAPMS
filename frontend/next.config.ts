import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Produces a minimal, self-contained server bundle (.next/standalone) for
  // the Docker image, instead of requiring the full node_modules tree.
  output: "standalone",
};

export default nextConfig;
